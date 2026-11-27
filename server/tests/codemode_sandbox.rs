//! Phase 2 (Sandbox & `search`) integration tests for Code Mode.
//!
//! Spawns the real `aiyu-server codemode-sandbox` child binary (`CARGO_BIN_EXE_aiyu-server`)
//! and verifies:
//! - `POST /api/codemode/search` auth, async arrow execution, `codemode.spec()`, and `console.*` capture.
//! - `codemode.request` is `undefined` in `search` mode.
//! - Infinite loop killed by wall-clock timeout; parent stays responsive.
//! - Large allocation fails under `RLIMIT_AS`; parent stays responsive.
//! - No `fetch`, `process`, `require`, `import`, file, or env access.
//! - Script > 64 KB rejected; output > 24,000 chars truncated with `--- TRUNCATED ---`; concurrency > 2 returns 429.
//! - Execute IPC hook enforces max 50 requests/run and max 2 MB reply size.

use aiyu_server::{
    AppState,
    codemode::{
        sandbox::{
            MAX_OUTPUT_CHARS, MAX_REPLY_BYTES, MAX_REQUESTS_PER_RUN, MAX_SCRIPT_BYTES,
            SandboxConfig, SandboxError, SandboxMode, SandboxPool, TRUNCATION_MARKER,
        },
        token::generate_token,
    },
    config::{Config, parse_trusted},
    db::{self, Stamp},
    router,
};
use axum::{
    Router,
    body::Body,
    extract::ConnectInfo,
    http::{Request, StatusCode, header},
};
use chrono::{TimeDelta, Utc};
use http_body_util::BodyExt;
use serde_json::{Value, json};
use std::{
    net::SocketAddr,
    path::PathBuf,
    sync::{
        Arc,
        atomic::{AtomicUsize, Ordering},
    },
    time::Duration,
};
use tower::ServiceExt;

const BIN: &str = env!("CARGO_BIN_EXE_aiyu-server");

struct TestApp {
    router: Router,
    auth: String,
    db_path: PathBuf,
}

impl Drop for TestApp {
    fn drop(&mut self) {
        let _ = std::fs::remove_file(&self.db_path);
        let _ = std::fs::remove_file(format!("{}-wal", self.db_path.display()));
        let _ = std::fs::remove_file(format!("{}-shm", self.db_path.display()));
    }
}

async fn test_app(timeout: Duration) -> TestApp {
    let id = db::new_id();
    let db_path = std::env::temp_dir().join(format!("aiyu-codemode-sandbox-{id}.db"));
    let web_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../web/dist");

    let mut state = AppState::new(Config {
        listen: "127.0.0.1:0".parse().unwrap(),
        jwt_secret: "test-jwt-secret-for-codemode-sandbox".into(),
        trusted_proxies: parse_trusted("").unwrap(),
        uploads_dir: std::env::temp_dir().join(format!("aiyu-codemode-sb-uploads-{id}")),
        public_dir: "/nonexistent".into(),
        database_path: db_path.clone(),
        web_dir,
    })
    .await
    .unwrap();
    state.package_version = Some("1.0.0".into());
    state.codemode = SandboxPool::new(SandboxConfig {
        binary: PathBuf::from(BIN),
        timeout,
        ..SandboxConfig::default()
    });

    state.db = db::connect(&db_path, true);
    db::migrate(&state.db).await.unwrap();

    let (raw_token, token_hash, last_four) = generate_token();
    let now = Utc::now().naive_utc();
    let expires = (Utc::now() + TimeDelta::days(30)).naive_utc();
    sqlx::query(
        r#"INSERT INTO "AgentToken" (id, name, "tokenHash", "lastFour", scope, "expiresAt", "createdAt")
           VALUES ($1, $2, $3, $4, 'read', $5, $6)"#,
    )
    .bind(format!("tok-{id}"))
    .bind("Sandbox Test Token")
    .bind(&token_hash)
    .bind(&last_four)
    .bind(Stamp(expires))
    .bind(Stamp(now))
    .execute(&state.db)
    .await
    .unwrap();

    TestApp {
        router: router(state),
        auth: format!("Bearer {raw_token}"),
        db_path,
    }
}

async fn post_search(app: &Router, auth: Option<&str>, ip: &str, body: Value) -> (StatusCode, Value) {
    let mut builder = Request::builder()
        .method("POST")
        .uri("/api/codemode/search")
        .header(header::CONTENT_TYPE, "application/json");
    if let Some(a) = auth {
        builder = builder.header(header::AUTHORIZATION, a);
    }
    let mut req = builder.body(Body::from(body.to_string())).unwrap();
    req.extensions_mut()
        .insert(ConnectInfo(SocketAddr::from((ip.parse::<std::net::IpAddr>().unwrap(), 43210))));

    let resp = app.clone().oneshot(req).await.unwrap();
    let status = resp.status();
    let bytes = resp.into_body().collect().await.unwrap().to_bytes();
    let json = serde_json::from_slice(&bytes).unwrap_or_else(|_| json!({ "raw": String::from_utf8_lossy(&bytes) }));
    (status, json)
}

#[tokio::test]
async fn search_requires_auth_and_runs_async_arrow_with_spec_and_logs() {
    let app = test_app(Duration::from_secs(10)).await;

    // Unauthenticated call must fail with 401.
    let (status, _) = post_search(&app.router, None, "127.0.0.10", json!({ "code": "async () => 1" })).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);

    // Authenticated search runs async arrow, accesses codemode.spec(), captures console logs,
    // and confirms codemode.request is undefined in search mode.
    let code = r#"async () => {
        console.log("searching", 42);
        console.warn("careful");
        console.error("oops");
        const spec = codemode.spec();
        const blogPaths = Object.keys(spec.paths).filter(p => p.includes("blogs"));
        return {
            openapi: spec.openapi,
            hasRequest: typeof codemode.request,
            blogPaths,
        };
    }"#;
    let (status, body) = post_search(&app.router, Some(&app.auth), "127.0.0.10", json!({ "code": code })).await;
    assert_eq!(status, StatusCode::OK, "body: {body}");
    assert_eq!(body["success"], json!(true), "body: {body}");
    assert_eq!(body["truncated"], json!(false));
    assert_eq!(body["result"]["openapi"], json!("3.1.0"));
    assert_eq!(body["result"]["hasRequest"], json!("undefined"));
    let paths = body["result"]["blogPaths"].as_array().unwrap();
    assert!(paths.iter().any(|p| p == "/api/blogs"), "expected /api/blogs in {paths:?}");
    assert_eq!(
        body["logs"],
        json!(["searching 42", "[warn] careful", "[error] oops"])
    );
}

#[tokio::test]
async fn infinite_loop_is_killed_and_parent_stays_responsive() {
    let app = test_app(Duration::from_millis(600)).await;

    let (status, body) = post_search(
        &app.router,
        Some(&app.auth),
        "127.0.0.11",
        json!({ "code": "async () => { while (true) {} }" }),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["success"], json!(false), "infinite loop must fail: {body}");
    assert!(
        body["error"].as_str().unwrap_or("").to_lowercase().contains("timed out"),
        "expected timeout error, got: {body}"
    );

    // Subsequent run must succeed cleanly.
    let (status2, body2) = post_search(
        &app.router,
        Some(&app.auth),
        "127.0.0.11",
        json!({ "code": "async () => ({ ok: true, sum: 2 + 2 })" }),
    )
    .await;
    assert_eq!(status2, StatusCode::OK);
    assert_eq!(body2["success"], json!(true), "post-timeout run failed: {body2}");
    assert_eq!(body2["result"], json!({ "ok": true, "sum": 4 }));
}

#[tokio::test]
async fn large_allocation_fails_under_rlimit_and_parent_stays_responsive() {
    let app = test_app(Duration::from_secs(10)).await;

    // Allocate > 128 MB in chunks so heap growth hits RLIMIT_AS.
    let oom_code = r#"async () => {
        const chunks = [];
        const chunk = "x".repeat(1024 * 1024);
        for (let i = 0; i < 200; i++) {
            chunks.push(chunk + i);
        }
        return chunks.length;
    }"#;
    let (status, body) = post_search(&app.router, Some(&app.auth), "127.0.0.12", json!({ "code": oom_code })).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["success"], json!(false), "large allocation must fail: {body}");

    // Subsequent run must succeed cleanly.
    let (status2, body2) = post_search(
        &app.router,
        Some(&app.auth),
        "127.0.0.12",
        json!({ "code": "async () => 'still alive'" }),
    )
    .await;
    assert_eq!(status2, StatusCode::OK);
    assert_eq!(body2["success"], json!(true), "post-OOM run failed: {body2}");
    assert_eq!(body2["result"], json!("still alive"));
}

#[tokio::test]
async fn sandbox_exposes_no_io_env_or_module_loading() {
    let app = test_app(Duration::from_secs(10)).await;

    let code = r#"async () => {
        let importErr = null;
        try {
            await eval('import("/etc/passwd")');
        } catch (e) {
            importErr = String(e);
        }
        return {
            fetch: typeof fetch,
            process: typeof process,
            require: typeof require,
            setTimeout: typeof setTimeout,
            Deno: typeof Deno,
            Bun: typeof Bun,
            importErr,
        };
    }"#;
    let (status, body) = post_search(&app.router, Some(&app.auth), "127.0.0.13", json!({ "code": code })).await;
    assert_eq!(status, StatusCode::OK, "body: {body}");
    assert_eq!(body["success"], json!(true), "body: {body}");
    let r = &body["result"];
    assert_eq!(r["fetch"], json!("undefined"));
    assert_eq!(r["process"], json!("undefined"));
    assert_eq!(r["require"], json!("undefined"));
    assert_eq!(r["setTimeout"], json!("undefined"));
    assert_eq!(r["Deno"], json!("undefined"));
    assert_eq!(r["Bun"], json!("undefined"));
    let err = r["importErr"].as_str().unwrap_or("");
    assert!(
        err.contains("disabled") && !err.contains("could not open file"),
        "expected IdleModuleLoader rejection without touching disk, got: {err}"
    );
}

#[tokio::test]
async fn script_size_limit_output_truncation_and_concurrency_cap() {
    let app = test_app(Duration::from_secs(5)).await;

    // 1. Script > 64 KB rejected with 400.
    let huge_code = format!("async () => '{}'", "a".repeat(MAX_SCRIPT_BYTES + 10));
    let (status, body) = post_search(&app.router, Some(&app.auth), "127.0.0.14", json!({ "code": huge_code })).await;
    assert_eq!(status, StatusCode::BAD_REQUEST, "body: {body}");
    assert_eq!(body["success"], json!(false));

    // 2. Output > 24,000 chars truncated with marker and truncated: true.
    let big_out = r#"async () => "z".repeat(30000)"#;
    let (status, body) = post_search(&app.router, Some(&app.auth), "127.0.0.14", json!({ "code": big_out })).await;
    assert_eq!(status, StatusCode::OK, "body: {body}");
    assert_eq!(body["success"], json!(true), "body: {body}");
    assert_eq!(body["truncated"], json!(true));
    let text = body["result"].as_str().expect("truncated result should be string");
    assert!(text.ends_with(TRUNCATION_MARKER), "missing truncation marker");
    assert!(text.chars().count() <= MAX_OUTPUT_CHARS + TRUNCATION_MARKER.chars().count());

    // 3. Concurrency > 2 returns 429.
    let slow_app = test_app(Duration::from_millis(800)).await;
    let r1 = slow_app.router.clone();
    let r2 = slow_app.router.clone();
    let c1 = slow_app.auth.clone();
    let c2 = slow_app.auth.clone();
    let spin = json!({ "code": "async () => { while (true) {} }" });
    let spin1 = spin.clone();
    let spin2 = spin.clone();

    let h1 = tokio::spawn(async move { post_search(&r1, Some(&c1), "127.0.0.15", spin1).await });
    let h2 = tokio::spawn(async move { post_search(&r2, Some(&c2), "127.0.0.16", spin2).await });

    // Give the two concurrent runs a moment to acquire both semaphore permits.
    tokio::time::sleep(Duration::from_millis(120)).await;

    let (status3, body3) = post_search(
        &slow_app.router,
        Some(&slow_app.auth),
        "127.0.0.17",
        json!({ "code": "async () => 123" }),
    )
    .await;
    assert_eq!(status3, StatusCode::TOO_MANY_REQUESTS, "3rd concurrent run must get 429: {body3}");
    assert_eq!(body3["success"], json!(false));

    let _ = h1.await;
    let _ = h2.await;
}

#[tokio::test]
async fn execute_ipc_enforces_request_count_and_reply_size_limits() {
    let pool = SandboxPool::new(SandboxConfig {
        binary: PathBuf::from(BIN),
        timeout: Duration::from_secs(10),
        ..SandboxConfig::default()
    });

    // 1. Normal execute IPC round-trip works.
    let calls = Arc::new(AtomicUsize::new(0));
    let calls_cb = Arc::clone(&calls);
    let resp = pool
        .run(
            SandboxMode::Execute,
            r#"async () => {
                const a = await codemode.request({ method: "GET", path: "/api/version" });
                const b = await codemode.request({ method: "GET", path: "/api/health" });
                return { a, b };
            }"#,
            json!({ "openapi": "3.1.0", "paths": {} }),
            move |req| {
                let n = calls_cb.fetch_add(1, Ordering::SeqCst) + 1;
                async move { Ok(json!({ "call": n, "path": req["path"] })) }
            },
        )
        .await
        .unwrap();
    assert!(resp.success, "resp: {resp:?}");
    assert_eq!(calls.load(Ordering::SeqCst), 2);
    assert_eq!(resp.result.unwrap()["b"]["path"], json!("/api/health"));

    // 2. Exceeding MAX_REQUESTS_PER_RUN (50) returns an error to JS.
    let over_limit_code = format!(
        r#"async () => {{
            for (let i = 0; i < {}; i++) {{
                await codemode.request({{ method: "GET", path: "/api/version" }});
            }}
            return "unreachable";
        }}"#,
        MAX_REQUESTS_PER_RUN + 1
    );
    let resp_many = pool
        .run(
            SandboxMode::Execute,
            &over_limit_code,
            json!({}),
            |_req| async { Ok(json!({ "ok": true })) },
        )
        .await
        .unwrap();
    assert!(!resp_many.success, "exceeding 50 requests must fail: {resp_many:?}");
    assert!(
        resp_many.error.as_deref().unwrap_or("").contains("50"),
        "expected request limit error, got: {:?}",
        resp_many.error
    );

    // 3. Reply exceeding MAX_REPLY_BYTES (2 MB) returns a narrower-query error.
    let huge_reply = Value::String("x".repeat(MAX_REPLY_BYTES + 1024));
    let resp_big = pool
        .run(
            SandboxMode::Execute,
            r#"async () => await codemode.request({ method: "GET", path: "/api/blogs" })"#,
            json!({}),
            move |_req| {
                let v = huge_reply.clone();
                async move { Ok(v) }
            },
        )
        .await
        .unwrap();
    assert!(!resp_big.success, "reply > 2 MB must fail: {resp_big:?}");
    assert!(
        resp_big.error.as_deref().unwrap_or("").to_lowercase().contains("narrower"),
        "expected narrower-query error, got: {:?}",
        resp_big.error
    );

    // 4. Direct ScriptTooLarge error check.
    let err = pool
        .run(
            SandboxMode::Search,
            &"a".repeat(MAX_SCRIPT_BYTES + 1),
            json!({}),
            |_req| async { Ok(Value::Null) },
        )
        .await
        .unwrap_err();
    assert!(matches!(err, SandboxError::ScriptTooLarge { .. }));
}
