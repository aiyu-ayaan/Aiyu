//! Phase 3 (Tokens & read `execute`) integration tests for Code Mode.

use aiyu_server::{
    AppState,
    codemode::{
        INTERNAL_AUTH_HEADER,
        sandbox::{SandboxConfig, SandboxPool},
        token::{TOKEN_PREFIX, generate_token},
    },
    config::{Config, parse_trusted},
    db::{self, Stamp},
    export, router,
    session::Claims,
};
use axum::{
    Router,
    body::Body,
    extract::ConnectInfo,
    http::{Request, StatusCode, header},
};
use chrono::{DateTime, TimeDelta, Utc};
use http_body_util::BodyExt;
use serde_json::{Value, json};
use std::{net::SocketAddr, path::PathBuf, time::Duration};
use tower::ServiceExt;

const BIN: &str = env!("CARGO_BIN_EXE_aiyu-server");

struct TestApp {
    router: Router,
    state: AppState,
    admin_cookie: String,
    db_path: PathBuf,
}

impl Drop for TestApp {
    fn drop(&mut self) {
        let _ = std::fs::remove_file(&self.db_path);
        let _ = std::fs::remove_file(format!("{}-wal", self.db_path.display()));
        let _ = std::fs::remove_file(format!("{}-shm", self.db_path.display()));
    }
}

async fn test_app() -> TestApp {
    let id = db::new_id();
    let db_path = std::env::temp_dir().join(format!("aiyu-codemode-exec-{id}.db"));
    let web_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../web/dist");

    let mut state = AppState::new(Config {
        listen: "127.0.0.1:0".parse().unwrap(),
        jwt_secret: "test-jwt-secret-for-codemode-execute".into(),
        trusted_proxies: parse_trusted("").unwrap(),
        uploads_dir: std::env::temp_dir().join(format!("aiyu-codemode-exec-uploads-{id}")),
        public_dir: "/nonexistent".into(),
        database_path: db_path.clone(),
        web_dir,
    })
    .await
    .unwrap();
    state.package_version = Some("1.0.0".into());
    state.codemode = SandboxPool::new(SandboxConfig {
        binary: PathBuf::from(BIN),
        timeout: Duration::from_secs(15),
        ..SandboxConfig::default()
    });

    state.db = db::connect(&db_path, true);
    db::migrate(&state.db).await.unwrap();

    // Seed an active admin session.
    let jti = format!("exec-session-jti-secret-{id}");
    let now = Utc::now().naive_utc();
    let expires = (Utc::now() + TimeDelta::hours(24)).naive_utc();
    sqlx::query(
        r#"INSERT INTO "Session" (id, jti, label, "ipAddress", "userAgent", "lastSeenAt", "expiresAt", "createdAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $6)"#,
    )
    .bind(format!("sess-{id}"))
    .bind(&jti)
    .bind("Admin Browser")
    .bind("127.0.0.1")
    .bind("codemode-exec-test")
    .bind(Stamp(now))
    .bind(Stamp(expires))
    .execute(&state.db)
    .await
    .unwrap();

    let jwt = state
        .sessions
        .sign(&Claims {
            user: json!({ "username": "admin" }),
            jti: Some(jti),
            expires: None,
            exp: (Utc::now() + TimeDelta::hours(24)).timestamp() as u64,
            iat: Some(Utc::now().timestamp() as u64),
        })
        .unwrap();

    // Seed Blog, Config (with gdriveConfig + AI keys + n8n key), Cron (with encrypted webhookEnv), NotificationConfig.
    db::insert_row(
        &state.db,
        "Blog",
        json!({
            "id": "blog-1",
            "title": "Draft Secret Post",
            "slug": "draft-secret-post",
            "content": "Draft body",
            "date": "2026-01-01",
            "published": false
        })
        .as_object()
        .unwrap(),
    )
    .await
    .unwrap();

    let sealed_gdrive = state.cipher.encrypt("GDRIVE_CLIENT_SECRET_XYZ").unwrap();
    let sealed_ai_key = state.cipher.encrypt("OPENAI_PROVIDER_SECRET_XYZ").unwrap();
    let sealed_gw_key = state.cipher.encrypt("GATEWAY_SECRET_XYZ").unwrap();
    db::insert_row(
        &state.db,
        "Config",
        json!({
            "id": "cfg-1",
            "data": {
                "siteTitle": "Aiyu Portfolio",
                "authorName": "Aiyu",
                "gdriveConfig": { "clientId": "cid", "clientSecret": sealed_gdrive },
                "ai": {
                    "enabled": false,
                    "gatewayApiKey": sealed_gw_key,
                    "providers": [{ "id": "p1", "type": "openai", "apiKey": sealed_ai_key }]
                },
                "n8nWebhookAuthKey": "N8N_SECRET_XYZ"
            },
            "encryptedGithubToken": state.cipher.encrypt("GHP_SECRET_XYZ").unwrap(),
            "blogApiTokenHash": "bloghashxyz"
        })
        .as_object()
        .unwrap(),
    )
    .await
    .unwrap();

    let sealed_cron_env = state.cipher.encrypt("CRON_ENV_SECRET_XYZ").unwrap();
    db::insert_row(
        &state.db,
        "Cron",
        json!({
            "id": "cron-1",
            "name": "Nightly",
            "type": "user",
            "schedule": "0 0 * * *",
            "enabled": false,
            "action": "webhook",
            "webhookUrl": "https://example.com/hook",
            "webhookEnv": [{ "key": "HOOK_SECRET", "value": sealed_cron_env }]
        })
        .as_object()
        .unwrap(),
    )
    .await
    .unwrap();

    db::insert_row(
        &state.db,
        "NotificationConfig",
        json!({
            "id": "notif-1",
            "data": {
                "enabled": true,
                "ntfy": { "enabled": true, "serverUrl": "https://ntfy.secret.example", "topic": "t", "token": "NTFY_TOKEN_XYZ" },
                "telegram": { "enabled": true, "botToken": "TELEGRAM_TOKEN_XYZ", "chatId": "1" },
                "discord": { "enabled": true, "webhookUrl": "https://discord.com/api/webhooks/1/DISCORD_WEBHOOK_XYZ" },
                "notifyOnContactMessage": false
            }
        })
        .as_object()
        .unwrap(),
    )
    .await
    .unwrap();

    TestApp {
        router: router(state.clone()),
        state,
        admin_cookie: format!("session={jwt}"),
        db_path,
    }
}

async fn send(
    app: &Router,
    method: &str,
    uri: &str,
    ip: &str,
    headers: &[(&str, &str)],
    body: Option<Value>,
) -> (StatusCode, Value, String) {
    let mut builder = Request::builder().method(method).uri(uri).header("host", "localhost");
    for &(k, v) in headers {
        builder = builder.header(k, v);
    }
    let body = match body {
        Some(v) => {
            builder = builder.header(header::CONTENT_TYPE, "application/json");
            Body::from(v.to_string())
        }
        None => Body::empty(),
    };
    let mut req = builder.body(body).unwrap();
    req.extensions_mut()
        .insert(ConnectInfo(SocketAddr::from((ip.parse::<std::net::IpAddr>().unwrap(), 44000))));
    let res = app.clone().oneshot(req).await.unwrap();
    let status = res.status();
    let bytes = res.into_body().collect().await.unwrap().to_bytes();
    let text = String::from_utf8_lossy(&bytes).into_owned();
    let json = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
    (status, json, text)
}

async fn create_agent_token(app: &TestApp, name: &str, scope: &str) -> (String, String) {
    let (status, body, _) = send(
        &app.router,
        "POST",
        "/api/admin/codemode/tokens",
        "127.0.1.1",
        &[("cookie", &app.admin_cookie)],
        Some(json!({ "name": name, "scope": scope })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "create token failed: {body}");
    let tok = body["token"].as_str().unwrap().to_string();
    let id = body["item"]["id"].as_str().unwrap().to_string();
    (tok, id)
}

#[tokio::test]
async fn token_crud_30_day_expiry_no_hash_and_excluded_from_backup() {
    let app = test_app().await;

    // Create token via admin session.
    let (status, created, _) = send(
        &app.router,
        "POST",
        "/api/admin/codemode/tokens",
        "127.0.2.1",
        &[("cookie", &app.admin_cookie)],
        Some(json!({ "name": "CI Reader" })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "body: {created}");
    assert_eq!(created["success"], json!(true));
    let raw_token = created["token"].as_str().unwrap();
    assert!(raw_token.starts_with(TOKEN_PREFIX));
    assert_eq!(raw_token.len(), TOKEN_PREFIX.len() + 48);
    assert_eq!(created["item"]["name"], json!("CI Reader"));
    assert_eq!(created["item"]["scope"], json!("read"));
    assert_eq!(created["item"]["lastFour"], json!(&raw_token[raw_token.len() - 4..]));
    assert!(created["item"].get("tokenHash").is_none());

    // Verify 30-day expiry.
    let created_at: DateTime<Utc> = created["item"]["createdAt"].as_str().unwrap().parse().unwrap();
    let expires_at: DateTime<Utc> = created["item"]["expiresAt"].as_str().unwrap().parse().unwrap();
    let diff = expires_at - created_at;
    assert!((diff - TimeDelta::days(30)).num_seconds().abs() <= 5, "expiry diff: {diff}");

    // List tokens: must include item and NEVER include tokenHash or raw token.
    let (status, listed, raw_list) = send(
        &app.router,
        "GET",
        "/api/admin/codemode/tokens",
        "127.0.2.1",
        &[("cookie", &app.admin_cookie)],
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(listed["success"], json!(true));
    assert_eq!(listed["tokens"].as_array().unwrap().len(), 1);
    assert!(!raw_list.contains("tokenHash"));
    assert!(!raw_list.contains(raw_token));

    // Backup/export MUST NOT include AgentToken.
    assert!(!export::all_keys().iter().any(|k| k.to_ascii_lowercase().contains("token")));
    let mut zip_buf = Vec::new();
    export::write_backup(
        &mut zip_buf,
        &app.state.db,
        &export::all_keys(),
        None,
        Utc::now().naive_utc(),
    )
    .await
    .unwrap();
    let zip_lossy = String::from_utf8_lossy(&zip_buf);
    assert!(!zip_lossy.contains("AgentToken"), "backup zip must not contain AgentToken");
    assert!(!zip_lossy.contains("CI Reader"), "backup zip must not contain agent token names");

    // Revoke token.
    let id = created["item"]["id"].as_str().unwrap();
    let (status, revoked, _) = send(
        &app.router,
        "DELETE",
        &format!("/api/admin/codemode/tokens/{id}"),
        "127.0.2.1",
        &[("cookie", &app.admin_cookie)],
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK, "body: {revoked}");
    assert_eq!(revoked["success"], json!(true));

    // Revoked token gets 401 on both search and execute.
    let auth = format!("Bearer {raw_token}");
    for endpoint in ["/api/codemode/search", "/api/codemode/execute"] {
        let (st, _, _) = send(
            &app.router,
            "POST",
            endpoint,
            "127.0.2.2",
            &[("authorization", &auth)],
            Some(json!({ "code": "async () => 1" })),
        )
        .await;
        assert_eq!(st, StatusCode::UNAUTHORIZED, "revoked token must get 401 on {endpoint}");
    }
}

#[tokio::test]
async fn expired_malformed_and_cookie_auth_refused_and_agent_token_refused_on_normal_routes() {
    let app = test_app().await;
    let (valid_token, _) = create_agent_token(&app, "Valid Reader", "read").await;
    let valid_auth = format!("Bearer {valid_token}");

    // Seed an expired token directly in DB.
    let (expired_token, expired_hash, expired_last4) = generate_token();
    let past = (Utc::now() - TimeDelta::hours(1)).naive_utc();
    sqlx::query(
        r#"INSERT INTO "AgentToken" (id, name, "tokenHash", "lastFour", scope, "expiresAt", "createdAt")
           VALUES ('tok-exp', 'Expired', $1, $2, 'read', $3, $3)"#,
    )
    .bind(&expired_hash)
    .bind(&expired_last4)
    .bind(Stamp(past))
    .execute(&app.state.db)
    .await
    .unwrap();
    let expired_auth = format!("Bearer {expired_token}");

    // Expired, malformed, and admin-cookie-only calls get 401 on /api/codemode/{search,execute}.
    for endpoint in ["/api/codemode/search", "/api/codemode/execute"] {
        for headers in [
            vec![("authorization", expired_auth.as_str())],
            vec![("authorization", "Bearer not-a-valid-token")],
            vec![("authorization", "Bearer aiyu_agent_1234")],
            vec![("cookie", app.admin_cookie.as_str())],
        ] {
            let (st, _, _) = send(
                &app.router,
                "POST",
                endpoint,
                "127.0.3.1",
                &headers,
                Some(json!({ "code": "async () => 1" })),
            )
            .await;
            assert_eq!(st, StatusCode::UNAUTHORIZED, "expected 401 on {endpoint} with {headers:?}");
        }
    }

    // Valid agent token MUST get 401 on normal admin routes.
    for (method, path) in [
        ("GET", "/api/admin/crons"),
        ("GET", "/api/admin/security/sessions"),
        ("GET", "/api/admin/codemode/tokens"),
        ("POST", "/api/admin/codemode/tokens"),
    ] {
        let (st, _, _) = send(
            &app.router,
            method,
            path,
            "127.0.3.2",
            &[("authorization", &valid_auth)],
            (method == "POST").then(|| json!({ "name": "Escalation" })),
        )
        .await;
        assert_eq!(st, StatusCode::UNAUTHORIZED, "agent token must get 401 on {method} {path}");
    }

    // Forged internal secret header (even with the real per-process secret!) is stripped on inbound HTTP requests.
    let secret = app.state.codemode_internal_secret.clone();
    for (method, path) in [
        ("GET", "/api/admin/crons"),
        ("GET", "/api/admin/security/sessions"),
        ("GET", "/api/admin/codemode/tokens"),
    ] {
        let (st, _, _) = send(
            &app.router,
            method,
            path,
            "127.0.3.3",
            &[(INTERNAL_AUTH_HEADER, &secret)],
            None,
        )
        .await;
        assert_eq!(st, StatusCode::UNAUTHORIZED, "forged internal header must be stripped on {method} {path}");
    }
}

#[tokio::test]
async fn execute_reads_through_router_redacts_all_secrets_and_refuses_bad_paths_and_writes() {
    let app = test_app().await;
    let (token, _) = create_agent_token(&app, "Full Reader", "read").await;
    let auth = format!("Bearer {token}");

    // 1. Read blogs (?all=true sees draft), config, crons, notifications, sessions, system-prompt.
    let code = r#"async () => {
        const blogs = await codemode.request({ method: "GET", path: "/api/blogs", query: { all: "true" } });
        const config = await codemode.request({ method: "GET", path: "/api/config" });
        const crons = await codemode.request({ method: "GET", path: "/api/admin/crons" });
        const notif = await codemode.request({ method: "GET", path: "/api/admin/notifications" });
        const sessions = await codemode.request({ method: "GET", path: "/api/admin/security/sessions" });
        const prompt = await codemode.request({ method: "GET", path: "/api/admin/system-prompt" });
        return { blogs, config, crons, notif, sessions, prompt };
    }"#;

    let (status, body, raw) = send(
        &app.router,
        "POST",
        "/api/codemode/execute",
        "127.0.4.1",
        &[("authorization", &auth)],
        Some(json!({ "code": code })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "body: {body}");
    assert_eq!(body["success"], json!(true), "body: {body}");

    let res = &body["result"];
    // Draft blog is visible because in-process call authenticated as admin.
    assert_eq!(res["blogs"]["status"], json!(200));
    assert_eq!(res["blogs"]["data"]["data"][0]["title"], json!("Draft Secret Post"));

    // Non-secret fields preserved.
    assert_eq!(res["config"]["status"], json!(200));
    assert_eq!(res["config"]["data"]["siteTitle"], json!("Aiyu Portfolio"));
    assert_eq!(res["crons"]["status"], json!(200));
    assert_eq!(res["crons"]["data"]["data"][0]["name"], json!("Nightly"));
    assert_eq!(res["notif"]["status"], json!(200));
    assert_eq!(res["notif"]["data"]["data"]["enabled"], json!(true));
    assert_eq!(res["sessions"]["status"], json!(200));
    assert_eq!(res["sessions"]["data"]["sessions"][0]["label"], json!("Admin Browser"));
    assert_eq!(res["prompt"]["status"], json!(200));
    assert!(res["prompt"]["text"].as_str().unwrap().contains("Aiyu Portfolio"));

    // Every secret across ALL 5 endpoints MUST be absent from the entire response.
    for leaked in [
        "GDRIVE_CLIENT_SECRET_XYZ",
        "gdriveConfig",
        "OPENAI_PROVIDER_SECRET_XYZ",
        "GATEWAY_SECRET_XYZ",
        "gatewayApiKey",
        "N8N_SECRET_XYZ",
        "n8nWebhookAuthKey",
        "GHP_SECRET_XYZ",
        "bloghashxyz",
        "CRON_ENV_SECRET_XYZ",
        "webhookEnv",
        "NTFY_TOKEN_XYZ",
        "ntfy.secret.example",
        "TELEGRAM_TOKEN_XYZ",
        "DISCORD_WEBHOOK_XYZ",
        "exec-session-jti-secret-",
    ] {
        assert!(!raw.contains(leaked), "execute response leaked `{leaked}`");
    }

    // 2. Bad paths, /api/codemode/*, and write attempts are refused.
    let bad_calls_code = r#"async () => {
        const cases = [
            { method: "POST", path: "/api/codemode/search", body: { code: "async () => 1" } },
            { method: "POST", path: "/api/codemode/execute", body: { code: "async () => 1" } },
            { method: "GET", path: "/api/blogs/../config" },
            { method: "GET", path: "/api//blogs" },
            { method: "GET", path: "/api/blogs/%2e%2e" },
            { method: "GET", path: "/api/blogs?all=true" },
            { method: "GET", path: "/api/blogs#top" },
            { method: "POST", path: "/api/projects", body: { name: "x" } },
            { method: "PUT", path: "/api/config", body: { siteTitle: "hacked" } },
        ];
        const results = [];
        for (const req of cases) {
            try {
                await codemode.request(req);
                results.push({ path: req.path, ok: true });
            } catch (e) {
                results.push({ path: req.path, ok: false, error: String(e) });
            }
        }
        return results;
    }"#;
    let (status, body, _) = send(
        &app.router,
        "POST",
        "/api/codemode/execute",
        "127.0.4.2",
        &[("authorization", &auth)],
        Some(json!({ "code": bad_calls_code })),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "body: {body}");
    assert_eq!(body["success"], json!(true), "body: {body}");
    for item in body["result"].as_array().unwrap() {
        assert_eq!(item["ok"], json!(false), "call should have been refused: {item}");
    }
}

#[tokio::test]
async fn client_ip_is_forwarded_and_codemode_rate_limit_is_30_per_minute_per_ip() {
    let app = test_app().await;
    let (token, _) = create_agent_token(&app, "Rate Limit Tester", "read").await;
    let auth = format!("Bearer {token}");

    // 1. Caller IP is forwarded into in-process requests: /api/gallery allows 60 req/min per IP.
    // Exhaust 60 calls from 10.88.0.1 across two scripts (50 + 15), verifying 429 on 10.88.0.1
    // while 10.88.0.2 still gets 200.
    let call_n = |n: usize| {
        format!(
            r#"async () => {{
                let ok = 0, limited = 0;
                for (let i = 0; i < {n}; i++) {{
                    const r = await codemode.request({{ method: "GET", path: "/api/gallery" }});
                    if (r.status === 200) ok++;
                    else if (r.status === 429) limited++;
                }}
                return {{ ok, limited }};
            }}"#
        )
    };
    let (st1, b1, _) = send(
        &app.router,
        "POST",
        "/api/codemode/execute",
        "10.88.0.1",
        &[("authorization", &auth)],
        Some(json!({ "code": call_n(50) })),
    )
    .await;
    assert_eq!(st1, StatusCode::OK, "b1: {b1}");
    assert_eq!(b1["result"]["ok"], json!(50));

    let (st2, b2, _) = send(
        &app.router,
        "POST",
        "/api/codemode/execute",
        "10.88.0.1",
        &[("authorization", &auth)],
        Some(json!({ "code": call_n(15) })),
    )
    .await;
    assert_eq!(st2, StatusCode::OK, "b2: {b2}");
    assert_eq!(b2["result"]["ok"], json!(10));
    assert_eq!(b2["result"]["limited"], json!(5));

    // Different caller IP has its own independent bucket.
    let (st3, b3, _) = send(
        &app.router,
        "POST",
        "/api/codemode/execute",
        "10.88.0.2",
        &[("authorization", &auth)],
        Some(json!({ "code": call_n(3) })),
    )
    .await;
    assert_eq!(st3, StatusCode::OK, "b3: {b3}");
    assert_eq!(b3["result"]["ok"], json!(3));
    assert_eq!(b3["result"]["limited"], json!(0));

    // 2. /api/codemode/* itself enforces 30 runs/minute per IP.
    // Send 30 lightweight invalid-body requests from 10.99.0.1 (400, no child spawn), then assert 31st is 429.
    for i in 0..30 {
        let (st, _, _) = send(
            &app.router,
            "POST",
            "/api/codemode/search",
            "10.99.0.1",
            &[("authorization", &auth)],
            Some(json!({ "code": "" })),
        )
        .await;
        assert_eq!(st, StatusCode::BAD_REQUEST, "request {i} should pass rate limit and fail validation");
    }
    let (st_limited, _, _) = send(
        &app.router,
        "POST",
        "/api/codemode/search",
        "10.99.0.1",
        &[("authorization", &auth)],
        Some(json!({ "code": "" })),
    )
    .await;
    assert_eq!(st_limited, StatusCode::TOO_MANY_REQUESTS, "31st request in 1 min must get 429");

    // Different IP is unaffected.
    let (st_other, _, _) = send(
        &app.router,
        "POST",
        "/api/codemode/search",
        "10.99.0.2",
        &[("authorization", &auth)],
        Some(json!({ "code": "" })),
    )
    .await;
    assert_eq!(st_other, StatusCode::BAD_REQUEST, "other IP should not be rate limited");
}
