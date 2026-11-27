//! Code Mode JavaScript sandbox: spawns `aiyu-server codemode-sandbox` in a restricted child
//! process (`env_clear`, `RLIMIT_AS`, `RLIMIT_CORE = 0`, wall-clock timeout, concurrency cap)
//! running `boa_engine` with `IdleModuleLoader` and JSON-line IPC over stdin/stdout.

use std::{
    cell::RefCell,
    future::Future,
    io::{self, BufRead, Write},
    path::PathBuf,
    process::Stdio,
    rc::Rc,
    sync::Arc,
    time::Duration,
};

use boa_engine::{
    Context, JsArgs, JsError, JsNativeError, JsResult, JsValue, NativeFunction, Source,
    builtins::promise::PromiseState,
    js_string,
    module::IdleModuleLoader,
    object::{ObjectInitializer, builtins::JsPromise},
    property::Attribute,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tokio::{
    io::{AsyncBufReadExt, AsyncReadExt, AsyncWriteExt, BufReader},
    process::Command,
    sync::Semaphore,
};

pub const MAX_SCRIPT_BYTES: usize = 64 * 1024;
pub const DEFAULT_TIMEOUT: Duration = Duration::from_secs(30);
pub const DEFAULT_MEMORY_LIMIT_BYTES: u64 = 128 * 1024 * 1024;
pub const MAX_REQUESTS_PER_RUN: usize = 50;
pub const MAX_REPLY_BYTES: usize = 2 * 1024 * 1024;
pub const MAX_CONCURRENT_RUNS: usize = 2;
pub const MAX_OUTPUT_CHARS: usize = 24_000;
pub const TRUNCATION_MARKER: &str = "\n--- TRUNCATED ---";

const MAX_LOG_ENTRIES: usize = 200;
const MAX_LOG_ENTRY_CHARS: usize = 4_000;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SandboxMode {
    Search,
    Execute,
}

#[derive(Debug, Clone)]
pub struct SandboxConfig {
    pub binary: PathBuf,
    pub timeout: Duration,
    pub memory_limit_bytes: u64,
    pub max_script_bytes: usize,
    pub max_requests: usize,
    pub max_reply_bytes: usize,
    pub max_concurrent: usize,
    pub max_output_chars: usize,
}

impl Default for SandboxConfig {
    fn default() -> Self {
        let binary = std::env::var_os("AIYU_CODEMODE_BIN")
            .filter(|v| !v.is_empty())
            .map(PathBuf::from)
            .or_else(|| std::env::current_exe().ok())
            .unwrap_or_else(|| PathBuf::from("aiyu-server"));
        Self {
            binary,
            timeout: DEFAULT_TIMEOUT,
            memory_limit_bytes: DEFAULT_MEMORY_LIMIT_BYTES,
            max_script_bytes: MAX_SCRIPT_BYTES,
            max_requests: MAX_REQUESTS_PER_RUN,
            max_reply_bytes: MAX_REPLY_BYTES,
            max_concurrent: MAX_CONCURRENT_RUNS,
            max_output_chars: MAX_OUTPUT_CHARS,
        }
    }
}

#[derive(Clone)]
pub struct SandboxPool {
    pub config: SandboxConfig,
    semaphore: Arc<Semaphore>,
}

impl Default for SandboxPool {
    fn default() -> Self {
        Self::new(SandboxConfig::default())
    }
}

impl SandboxPool {
    pub fn new(config: SandboxConfig) -> Self {
        let permits = config.max_concurrent.max(1);
        Self {
            config,
            semaphore: Arc::new(Semaphore::new(permits)),
        }
    }

    pub async fn run<F, Fut>(
        &self,
        mode: SandboxMode,
        code: &str,
        spec: Value,
        on_request: F,
    ) -> Result<SandboxResponse, SandboxError>
    where
        F: FnMut(Value) -> Fut,
        Fut: Future<Output = Result<Value, String>>,
    {
        self.run_with_upload(mode, code, spec, on_request, |_| async {
            Err("codemode.upload is not available".into())
        })
        .await
    }

    pub async fn run_with_upload<F, Fut, U, UFut>(
        &self,
        mode: SandboxMode,
        code: &str,
        spec: Value,
        mut on_request: F,
        mut on_upload: U,
    ) -> Result<SandboxResponse, SandboxError>
    where
        F: FnMut(Value) -> Fut,
        Fut: Future<Output = Result<Value, String>>,
        U: FnMut(Value) -> UFut,
        UFut: Future<Output = Result<Value, String>>,
    {
        if code.len() > self.config.max_script_bytes {
            return Err(SandboxError::ScriptTooLarge {
                size: code.len(),
                limit: self.config.max_script_bytes,
            });
        }

        let _permit = self
            .semaphore
            .clone()
            .try_acquire_owned()
            .map_err(|_| SandboxError::TooManyConcurrent)?;

        let mut cmd = Command::new(&self.config.binary);
        cmd.arg("codemode-sandbox")
            .env_clear()
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .kill_on_drop(true);

        #[cfg(unix)]
        {
            let mem_limit = self.config.memory_limit_bytes;
            // SAFETY: pre_exec only invokes async-signal-safe `setrlimit`.
            unsafe {
                cmd.pre_exec(move || {
                    if mem_limit > 0 {
                        let rlim = libc::rlimit {
                            rlim_cur: mem_limit as libc::rlim_t,
                            rlim_max: mem_limit as libc::rlim_t,
                        };
                        if libc::setrlimit(libc::RLIMIT_AS, &rlim) != 0 {
                            return Err(io::Error::last_os_error());
                        }
                    }
                    let zero = libc::rlimit {
                        rlim_cur: 0,
                        rlim_max: 0,
                    };
                    let _ = libc::setrlimit(libc::RLIMIT_CORE, &zero);
                    Ok(())
                });
            }
        }

        let mut child = match cmd.spawn() {
            Ok(c) => c,
            Err(err) => {
                return Ok(SandboxResponse::err(format!("failed to start sandbox: {err}"), vec![]));
            }
        };

        let mut child_stdin = child.stdin.take().expect("piped stdin");
        let child_stdout = child.stdout.take().expect("piped stdout");
        let mut reader = BufReader::new(child_stdout);

        let init = ChildInit {
            mode,
            code: code.to_string(),
            spec,
        };
        let init_line = match serde_json::to_string(&init) {
            Ok(s) => s,
            Err(err) => {
                let _ = child.kill().await;
                let _ = child.wait().await;
                return Ok(SandboxResponse::err(format!("failed to encode sandbox input: {err}"), vec![]));
            }
        };

        let max_requests = self.config.max_requests;
        let max_reply_bytes = self.config.max_reply_bytes;
        let max_output_chars = self.config.max_output_chars;

        let exchange = async {
            child_stdin
                .write_all(init_line.as_bytes())
                .await
                .and_then(|_| Ok(()))
                .map_err(|e| format!("write sandbox input: {e}"))?;
            child_stdin
                .write_all(b"\n")
                .await
                .map_err(|e| format!("write sandbox newline: {e}"))?;
            child_stdin
                .flush()
                .await
                .map_err(|e| format!("flush sandbox input: {e}"))?;

            let mut request_count: usize = 0;
            let mut line = String::new();
            loop {
                line.clear();
                let n = reader
                    .read_line(&mut line)
                    .await
                    .map_err(|e| format!("read sandbox output: {e}"))?;
                if n == 0 {
                    return Err("sandbox process terminated unexpectedly (possible out-of-memory)".to_string());
                }
                let msg: ChildToParent = serde_json::from_str(line.trim())
                    .map_err(|e| format!("invalid sandbox message: {e}"))?;
                let is_upload = matches!(&msg, ChildToParent::Upload { .. });
                match msg {
                    ChildToParent::Request { payload } | ChildToParent::Upload { payload } => {
                        let reply = if mode != SandboxMode::Execute {
                            ParentToChild::err(if is_upload {
                                "codemode.upload is not available in search mode"
                            } else {
                                "codemode.request is not available in search mode"
                            })
                        } else {
                            request_count += 1;
                            if request_count > max_requests {
                                ParentToChild::err(format!(
                                    "maximum codemode.request limit ({max_requests}) exceeded"
                                ))
                            } else {
                                let res = if is_upload {
                                    on_upload(payload).await
                                } else {
                                    on_request(payload).await
                                };
                                match res {
                                    Ok(val) => match serde_json::to_string(&val) {
                                        Ok(s) if s.len() > max_reply_bytes => ParentToChild::err(format!(
                                            "reply exceeded {} MB limit; use a narrower query",
                                            max_reply_bytes / (1024 * 1024)
                                        )),
                                        Ok(_) => ParentToChild::ok(val),
                                        Err(err) => ParentToChild::err(format!("encode reply: {err}")),
                                    },
                                    Err(err) => ParentToChild::err(err),
                                }
                            }
                        };
                        let encoded = serde_json::to_string(&reply)
                            .map_err(|e| format!("serialize reply: {e}"))?;
                        child_stdin
                            .write_all(encoded.as_bytes())
                            .await
                            .map_err(|e| format!("write reply: {e}"))?;
                        child_stdin
                            .write_all(b"\n")
                            .await
                            .map_err(|e| format!("write reply newline: {e}"))?;
                        child_stdin
                            .flush()
                            .await
                            .map_err(|e| format!("flush reply: {e}"))?;
                    }
                    ChildToParent::Result {
                        success,
                        result,
                        error,
                        logs,
                    } => {
                        if success {
                            let (val, truncated) =
                                truncate_output(result.unwrap_or(Value::Null), max_output_chars);
                            return Ok(SandboxResponse {
                                success: true,
                                result: Some(val),
                                error: None,
                                logs,
                                truncated: Some(truncated),
                            });
                        } else {
                            return Ok(SandboxResponse::err(
                                error.unwrap_or_else(|| "script execution failed".into()),
                                logs,
                            ));
                        }
                    }
                }
            }
        };

        match tokio::time::timeout(self.config.timeout, exchange).await {
            Ok(Ok(resp)) => {
                let _ = child.wait().await;
                Ok(resp)
            }
            Ok(Err(err_msg)) => {
                let _ = child.kill().await;
                let _ = child.wait().await;
                let mut stderr_buf = Vec::new();
                if let Some(se) = child.stderr.take() {
                    let _ = se.take(1024).read_to_end(&mut stderr_buf).await;
                }
                let stderr_text = String::from_utf8_lossy(&stderr_buf);
                let msg = if stderr_text.contains("memory allocation") {
                    "script exceeded memory limit".to_string()
                } else {
                    err_msg
                };
                Ok(SandboxResponse::err(msg, vec![]))
            }
            Err(_) => {
                let _ = child.kill().await;
                let _ = child.wait().await;
                Ok(SandboxResponse::err(
                    format!("script execution timed out after {}s", self.config.timeout.as_secs().max(1)),
                    vec![],
                ))
            }
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SandboxResponse {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    pub logs: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub truncated: Option<bool>,
}

impl SandboxResponse {
    pub fn err(error: impl Into<String>, logs: Vec<String>) -> Self {
        Self {
            success: false,
            result: None,
            error: Some(error.into()),
            logs,
            truncated: None,
        }
    }
}

#[derive(Debug)]
pub enum SandboxError {
    TooManyConcurrent,
    ScriptTooLarge { size: usize, limit: usize },
}

/// Truncates a JSON result when its string representation exceeds `max_chars`.
pub fn truncate_output(value: Value, max_chars: usize) -> (Value, bool) {
    if let Value::String(ref s) = value {
        if s.chars().count() <= max_chars {
            return (value, false);
        }
        let mut out: String = s.chars().take(max_chars).collect();
        out.push_str(TRUNCATION_MARKER);
        return (Value::String(out), true);
    }
    let serialized = serde_json::to_string(&value).unwrap_or_default();
    if serialized.chars().count() <= max_chars {
        return (value, false);
    }
    let mut out: String = serialized.chars().take(max_chars).collect();
    out.push_str(TRUNCATION_MARKER);
    (Value::String(out), true)
}

#[derive(Debug, Serialize, Deserialize)]
struct ChildInit {
    mode: SandboxMode,
    code: String,
    spec: Value,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum ChildToParent {
    Request { payload: Value },
    Upload { payload: Value },
    Result {
        success: bool,
        result: Option<Value>,
        error: Option<String>,
        logs: Vec<String>,
    },
}

#[derive(Debug, Serialize, Deserialize)]
struct ParentToChild {
    ok: bool,
    data: Option<Value>,
    error: Option<String>,
}

impl ParentToChild {
    fn ok(data: Value) -> Self {
        Self {
            ok: true,
            data: Some(data),
            error: None,
        }
    }

    fn err(msg: impl Into<String>) -> Self {
        Self {
            ok: false,
            data: None,
            error: Some(msg.into()),
        }
    }
}

/// Entry point for the hidden `aiyu-server codemode-sandbox` child subcommand.
/// MUST be invoked synchronously before Tokio runtime startup so worker thread stacks
/// do not consume virtual address space under `RLIMIT_AS`.
pub fn run_child() {
    let mut line = String::new();
    {
        let stdin = io::stdin();
        let mut lock = stdin.lock();
        if let Err(err) = lock.read_line(&mut line) {
            emit_result(false, None, Some(format!("read stdin failed: {err}")), vec![]);
            return;
        }
    }

    let init: ChildInit = match serde_json::from_str(line.trim()) {
        Ok(v) => v,
        Err(err) => {
            emit_result(false, None, Some(format!("invalid sandbox input: {err}")), vec![]);
            return;
        }
    };

    let logs: Rc<RefCell<Vec<String>>> = Rc::new(RefCell::new(Vec::new()));
    let mut context = match Context::builder()
        .module_loader(Rc::new(IdleModuleLoader))
        .build()
    {
        Ok(ctx) => ctx,
        Err(err) => {
            emit_result(false, None, Some(format!("engine init failed: {err}")), vec![]);
            return;
        }
    };

    if let Err(err) = register_console(&mut context, &logs) {
        emit_result(false, None, Some(format!("console setup failed: {err}")), logs.borrow().clone());
        return;
    }

    if let Err(err) = register_codemode(&mut context, init.mode, Rc::new(init.spec)) {
        emit_result(false, None, Some(format!("codemode setup failed: {err}")), logs.borrow().clone());
        return;
    }

    let wrapped = format!("(\n{}\n)()", init.code);
    let eval_res = context.eval(Source::from_bytes(wrapped.as_bytes()));

    let final_val = match eval_res {
        Err(err) => {
            emit_result(false, None, Some(format!("{err}")), logs.borrow().clone());
            return;
        }
        Ok(val) => {
            if let Err(err) = context.run_jobs() {
                emit_result(false, None, Some(format!("{err}")), logs.borrow().clone());
                return;
            }
            if let Some(obj) = val.as_object() {
                if let Ok(promise) = JsPromise::from_object(obj.clone()) {
                    match promise.state() {
                        PromiseState::Fulfilled(v) => v,
                        PromiseState::Rejected(err) => {
                            let msg = err
                                .to_string(&mut context)
                                .map(|s| s.to_std_string_escaped())
                                .unwrap_or_else(|_| format!("{err:?}"));
                            emit_result(false, None, Some(msg), logs.borrow().clone());
                            return;
                        }
                        PromiseState::Pending => {
                            emit_result(
                                false,
                                None,
                                Some("async function promise did not settle".into()),
                                logs.borrow().clone(),
                            );
                            return;
                        }
                    }
                } else {
                    val
                }
            } else {
                val
            }
        }
    };

    match final_val.to_json(&mut context) {
        Ok(json_val) => emit_result(
            true,
            Some(json_val.unwrap_or(Value::Null)),
            None,
            logs.borrow().clone(),
        ),
        Err(err) => emit_result(
            false,
            None,
            Some(format!("result is not JSON-serializable: {err}")),
            logs.borrow().clone(),
        ),
    }
}

fn register_console(context: &mut Context, logs: &Rc<RefCell<Vec<String>>>) -> JsResult<()> {
    let make_logger = |level: &'static str, logs: Rc<RefCell<Vec<String>>>| {
        // SAFETY: `logs` holds only `String`s, never Boa GC-managed values.
        unsafe {
            NativeFunction::from_closure(move |_this, args, ctx| {
                let mut entries = logs.borrow_mut();
                if entries.len() >= MAX_LOG_ENTRIES {
                    return Ok(JsValue::undefined());
                }
                let mut parts = Vec::with_capacity(args.len());
                for arg in args {
                    let s = if arg.is_object() {
                        match arg.to_json(ctx) {
                            Ok(Some(v)) => v.to_string(),
                            _ => arg.to_string(ctx)?.to_std_string_escaped(),
                        }
                    } else {
                        arg.to_string(ctx)?.to_std_string_escaped()
                    };
                    parts.push(s);
                }
                let mut msg = if level == "log" {
                    parts.join(" ")
                } else {
                    format!("[{level}] {}", parts.join(" "))
                };
                if msg.chars().count() > MAX_LOG_ENTRY_CHARS {
                    msg = msg.chars().take(MAX_LOG_ENTRY_CHARS).collect();
                }
                entries.push(msg);
                Ok(JsValue::undefined())
            })
        }
    };

    let console_obj = ObjectInitializer::new(context)
        .function(make_logger("log", Rc::clone(logs)), js_string!("log"), 0)
        .function(make_logger("warn", Rc::clone(logs)), js_string!("warn"), 0)
        .function(make_logger("error", Rc::clone(logs)), js_string!("error"), 0)
        .build();

    context.register_global_property(js_string!("console"), console_obj, Attribute::all())?;
    Ok(())
}

fn register_codemode(context: &mut Context, mode: SandboxMode, spec: Rc<Value>) -> JsResult<()> {
    // SAFETY: `spec` is `Rc<serde_json::Value>`, containing no Boa GC-managed values.
    let spec_fn = unsafe {
        NativeFunction::from_closure(move |_this, _args, ctx| JsValue::from_json(&spec, ctx))
    };

    let mut init = ObjectInitializer::new(context);
    init.function(spec_fn, js_string!("spec"), 0);

    if mode == SandboxMode::Execute {
        fn ipc_roundtrip(msg: ChildToParent, ctx: &mut Context) -> JsResult<JsValue> {
            let encoded = serde_json::to_string(&msg).map_err(|e| {
                JsError::from_native(JsNativeError::error().with_message(format!("serialize request: {e}")))
            })?;

            {
                let mut out = io::stdout().lock();
                writeln!(out, "{encoded}").and_then(|_| out.flush()).map_err(|e| {
                    JsError::from_native(JsNativeError::error().with_message(format!("write request: {e}")))
                })?;
            }

            let mut reply_line = String::new();
            {
                let mut inp = io::stdin().lock();
                let n = inp.read_line(&mut reply_line).map_err(|e| {
                    JsError::from_native(JsNativeError::error().with_message(format!("read reply: {e}")))
                })?;
                if n == 0 {
                    return Err(JsError::from_native(
                        JsNativeError::error().with_message("host closed connection"),
                    ));
                }
            }

            let reply: ParentToChild = serde_json::from_str(reply_line.trim()).map_err(|e| {
                JsError::from_native(JsNativeError::error().with_message(format!("invalid host reply: {e}")))
            })?;

            if !reply.ok {
                return Err(JsError::from_native(
                    JsNativeError::error()
                        .with_message(reply.error.unwrap_or_else(|| "host request failed".into())),
                ));
            }

            JsValue::from_json(&reply.data.unwrap_or(Value::Null), ctx)
        }

        let request_fn = NativeFunction::from_fn_ptr(|_this, args, ctx| {
            let arg = args.get_or_undefined(0);
            let payload = arg.to_json(ctx)?.unwrap_or(Value::Null);
            ipc_roundtrip(ChildToParent::Request { payload }, ctx)
        });
        let upload_fn = NativeFunction::from_fn_ptr(|_this, args, ctx| {
            let arg = args.get_or_undefined(0);
            let payload = arg.to_json(ctx)?.unwrap_or(Value::Null);
            ipc_roundtrip(ChildToParent::Upload { payload }, ctx)
        });
        init.function(request_fn, js_string!("request"), 1);
        init.function(upload_fn, js_string!("upload"), 1);
    }

    let codemode_obj = init.build();
    context.register_global_property(js_string!("codemode"), codemode_obj, Attribute::READONLY)?;
    Ok(())
}

fn emit_result(success: bool, result: Option<Value>, error: Option<String>, logs: Vec<String>) {
    let msg = ChildToParent::Result {
        success,
        result,
        error,
        logs,
    };
    if let Ok(s) = serde_json::to_string(&msg) {
        let mut out = io::stdout().lock();
        let _ = writeln!(out, "{s}");
        let _ = out.flush();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn truncate_output_leaves_short_values_intact() {
        let v = json!({ "hello": "world" });
        let (out, trunc) = truncate_output(v.clone(), 100);
        assert!(!trunc);
        assert_eq!(out, v);
    }

    #[test]
    fn truncate_output_marks_long_strings_and_objects() {
        let (out, trunc) = truncate_output(Value::String("a".repeat(50)), 20);
        assert!(trunc);
        let s = out.as_str().unwrap();
        assert!(s.starts_with(&"a".repeat(20)));
        assert!(s.ends_with(TRUNCATION_MARKER));

        let (out2, trunc2) = truncate_output(json!({ "data": "b".repeat(50) }), 20);
        assert!(trunc2);
        assert!(out2.as_str().unwrap().ends_with(TRUNCATION_MARKER));
    }
}
