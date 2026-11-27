//! Phase 4 (Writes, audit entries, and `codemode.upload`) integration tests for Code Mode.

use aiyu_server::{
    AppState,
    codemode::{
        sandbox::{SandboxConfig, SandboxPool},
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
use base64::Engine;
use chrono::{TimeDelta, Utc};
use http_body_util::BodyExt;
use serde_json::{Value, json};
use std::{net::SocketAddr, path::PathBuf, time::Duration};
use tower::ServiceExt;

const BIN: &str = env!("CARGO_BIN_EXE_aiyu-server");

/// Valid 1x1 red PNG (68 bytes).
const PNG_1X1: &[u8] = &[
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
    0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xDD, 0x8D, 0xB0, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
    0x44, 0xAE, 0x42, 0x60, 0x82,
];

struct TestApp {
    router: Router,
    state: AppState,
    read_auth: String,
    write_auth: String,
    db_path: PathBuf,
    uploads_dir: PathBuf,
}

impl Drop for TestApp {
    fn drop(&mut self) {
        let _ = std::fs::remove_file(&self.db_path);
        let _ = std::fs::remove_file(format!("{}-wal", self.db_path.display()));
        let _ = std::fs::remove_file(format!("{}-shm", self.db_path.display()));
        let _ = std::fs::remove_dir_all(&self.uploads_dir);
    }
}

async fn insert_token(state: &AppState, id: &str, name: &str, scope: &str) -> String {
    let (raw, hash, last4) = generate_token();
    let now = Utc::now().naive_utc();
    let exp = (Utc::now() + TimeDelta::days(30)).naive_utc();
    sqlx::query(
        r#"INSERT INTO "AgentToken" (id, name, "tokenHash", "lastFour", scope, "expiresAt", "createdAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7)"#,
    )
    .bind(id)
    .bind(name)
    .bind(&hash)
    .bind(&last4)
    .bind(scope)
    .bind(Stamp(exp))
    .bind(Stamp(now))
    .execute(&state.db)
    .await
    .unwrap();
    format!("Bearer {raw}")
}

async fn test_app() -> TestApp {
    let id = db::new_id();
    let db_path = std::env::temp_dir().join(format!("aiyu-codemode-writes-{id}.db"));
    let uploads_dir = std::env::temp_dir().join(format!("aiyu-codemode-writes-up-{id}"));
    let web_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../web/dist");

    let mut state = AppState::new(Config {
        listen: "127.0.0.1:0".parse().unwrap(),
        jwt_secret: "test-jwt-secret-for-codemode-writes".into(),
        trusted_proxies: parse_trusted("").unwrap(),
        uploads_dir: uploads_dir.clone(),
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

    let read_auth = insert_token(&state, "tok-read", "ReadBot", "read").await;
    let write_auth = insert_token(&state, "tok-write", "WriterBot", "write").await;

    TestApp {
        router: router(state.clone()),
        state,
        read_auth,
        write_auth,
        db_path,
        uploads_dir,
    }
}

async fn exec(app: &TestApp, auth: &str, ip: &str, code: &str) -> (StatusCode, Value) {
    let mut req = Request::builder()
        .method("POST")
        .uri("/api/codemode/execute")
        .header("host", "localhost")
        .header(header::CONTENT_TYPE, "application/json")
        .header(header::AUTHORIZATION, auth)
        .body(Body::from(json!({ "code": code }).to_string()))
        .unwrap();
    req.extensions_mut()
        .insert(ConnectInfo(SocketAddr::from((ip.parse::<std::net::IpAddr>().unwrap(), 45000))));
    let res = app.router.clone().oneshot(req).await.unwrap();
    let status = res.status();
    let bytes = res.into_body().collect().await.unwrap().to_bytes();
    let json = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
    (status, json)
}

#[tokio::test]
async fn read_token_cannot_write_or_upload_and_write_token_cannot_send_secret_fields() {
    let app = test_app().await;
    let png_b64 = base64::engine::general_purpose::STANDARD.encode(PNG_1X1);

    // 1. Read token refused on write routes and codemode.upload.
    let read_attempts = format!(
        r#"async () => {{
            const out = [];
            for (const fn of [
                () => codemode.request({{ method: "PUT", path: "/api/home", body: {{ name: "X" }} }}),
                () => codemode.request({{ method: "POST", path: "/api/projects", body: {{ name: "P" }} }}),
                () => codemode.upload({{ name: "dot.png", type: "image/png", base64: "{png_b64}" }}),
            ]) {{
                try {{ await fn(); out.push(true); }} catch (e) {{ out.push(false); }}
            }}
            return out;
        }}"#
    );
    let (st, body) = exec(&app, &app.read_auth, "127.0.5.1", &read_attempts).await;
    assert_eq!(st, StatusCode::OK, "body: {body}");
    assert_eq!(body["result"], json!([false, false, false]));

    // 2. Write token CANNOT send secret/webhook fields to PUT /api/config, PUT /api/github/config, PUT /api/admin/seo/config.
    let secret_attempts = r#"async () => {
        const cases = [
            { method: "PUT", path: "/api/config", body: { siteTitle: "OK", blogApiTokenHash: "planted" } },
            { method: "PUT", path: "/api/config", body: { gdriveConfig: { clientSecret: "x" } } },
            { method: "PUT", path: "/api/config", body: { n8nWebhookAuthKey: "k" } },
            { method: "PUT", path: "/api/config", body: { n8nWebhookUrl: "https://evil.example" } },
            { method: "PUT", path: "/api/config", body: { encryptedGithubToken: "x" } },
            { method: "PUT", path: "/api/github/config", body: { username: "aiyu", githubToken: "ghp_x" } },
            { method: "PUT", path: "/api/github/config", body: { username: "aiyu", webhookSecret: "sec" } },
            { method: "PUT", path: "/api/admin/seo/config", body: { serviceAccount: "{}" } },
        ];
        const out = [];
        for (const c of cases) {
            try { await codemode.request(c); out.push({ path: c.path, ok: true }); }
            catch (e) { out.push({ path: c.path, ok: false, err: String(e) }); }
        }
        return out;
    }"#;
    let (st, body) = exec(&app, &app.write_auth, "127.0.5.2", secret_attempts).await;
    assert_eq!(st, StatusCode::OK, "body: {body}");
    assert_eq!(body["success"], json!(true));
    for item in body["result"].as_array().unwrap() {
        assert_eq!(item["ok"], json!(false), "secret field write should be rejected: {item}");
    }

    // No audit rows should have been created for refused attempts.
    let count: i64 = sqlx::query_scalar(r#"SELECT count(*) FROM "AuditLog" WHERE category = 'codemode'"#)
        .fetch_one(&app.state.db)
        .await
        .unwrap();
    assert_eq!(count, 0);
}

#[tokio::test]
async fn write_round_trips_and_upload_succeed_and_record_audit_entries() {
    let app = test_app().await;
    let png_b64 = base64::engine::general_purpose::STANDARD.encode(PNG_1X1);

    let script = format!(
        r#"async () => {{
            // Home, About, Header, Config
            const home = await codemode.request({{ method: "PUT", path: "/api/home", body: {{ name: "Aiyu Home" }} }});
            const about = await codemode.request({{ method: "PUT", path: "/api/about", body: {{ name: "Aiyu About" }} }});
            const header = await codemode.request({{ method: "PUT", path: "/api/header", body: {{ logoText: "AIYU" }} }});
            const cfg = await codemode.request({{ method: "PUT", path: "/api/config", body: {{ siteTitle: "Updated Title" }} }});

            // Projects CRUD
            const pCreate = await codemode.request({{
                method: "POST", path: "/api/projects",
                body: {{ name: "CodeMode Proj", year: "2026", status: "Active", projectType: "Web", description: "Test project" }}
            }});
            const pid = pCreate.data._id;
            const pUpdate = await codemode.request({{
                method: "PUT", path: `/api/projects/${{pid}}`,
                body: {{ description: "Updated project" }}
            }});
            const pDel = await codemode.request({{ method: "DELETE", path: `/api/projects/${{pid}}` }});

            // Socials CRUD
            const sCreate = await codemode.request({{
                method: "POST", path: "/api/socials",
                body: {{ name: "GitHub", url: "https://github.com/aiyu", iconName: "github" }}
            }});
            const sid = sCreate.data._id;
            const sDel = await codemode.request({{ method: "DELETE", path: `/api/socials/${{sid}}` }});

            // Blogs CRUD
            const bCreate = await codemode.request({{
                method: "POST", path: "/api/blogs",
                body: {{ title: "Shipping Code Mode in Rust", content: "This is a real article body with enough words to pass quality checks cleanly.", published: false }}
            }});
            const bid = bCreate.data.data._id;
            const bDel = await codemode.request({{ method: "DELETE", path: `/api/blogs/${{bid}}` }});

            // Ads, Social Metadata, Cron Timezone, Purge Cache
            const ads = await codemode.request({{ method: "PUT", path: "/api/admin/ads", body: {{ adsenseEnabled: false, adsTxt: "" }} }});
            const social = await codemode.request({{ method: "PUT", path: "/api/admin/social", body: {{ social: {{}} }} }});
            const tz = await codemode.request({{ method: "POST", path: "/api/admin/crons/timezone", body: {{ timezone: "UTC" }} }});
            const purge = await codemode.request({{ method: "POST", path: "/api/admin/purge-cache" }});

            // Legal App CRUD
            const lApp = await codemode.request({{ method: "POST", path: "/api/legal/apps", body: {{ name: "Test App", slug: "test-legal-app" }} }});
            const lid = lApp.data._id;
            const lDel = await codemode.request({{ method: "DELETE", path: `/api/legal/apps/${{lid}}` }});

            // Gallery CRUD
            const gCreate = await codemode.request({{
                method: "POST", path: "/api/gallery",
                body: {{ src: "/api/uploads/sample.webp", description: "Sample", width: 100, height: 100 }}
            }});
            const gid = gCreate.data.data._id;
            const gDel = await codemode.request({{ method: "DELETE", path: "/api/gallery", query: {{ id: gid }} }});

            // Upload via codemode.upload
            const up = await codemode.upload({{ name: "pixel.png", type: "image/png", base64: "{png_b64}" }});

            return {{
                statuses: [
                    home.status, about.status, header.status, cfg.status,
                    pCreate.status, pUpdate.status, pDel.status,
                    sCreate.status, sDel.status,
                    bCreate.status, bDel.status,
                    ads.status, social.status, tz.status, purge.status,
                    lApp.status, lDel.status,
                    gCreate.status, gDel.status,
                    up.status,
                ],
                uploadUrl: up.data.url,
            }};
        }}"#
    );

    let (st, body) = exec(&app, &app.write_auth, "127.0.5.3", &script).await;
    assert_eq!(st, StatusCode::OK, "body: {body}");
    assert_eq!(body["success"], json!(true), "body: {body}");

    let statuses: Vec<i64> = body["result"]["statuses"]
        .as_array()
        .unwrap()
        .iter()
        .map(|v| v.as_i64().unwrap())
        .collect();
    assert_eq!(statuses.len(), 20);
    for (idx, s) in statuses.iter().enumerate() {
        assert!((200..300).contains(s), "step {idx} returned non-2xx status {s}: {body}");
    }
    let upload_url = body["result"]["uploadUrl"].as_str().unwrap();
    assert!(upload_url.starts_with("/api/uploads/"), "unexpected upload url: {upload_url}");

    // Verify EVERY single write (20 total, including codemode.upload) created an AuditLog row
    // carrying the token name ("WriterBot"), HTTP method, and path!
    let rows: Vec<(String, String)> = sqlx::query_as(
        r#"SELECT action, details FROM "AuditLog" WHERE category = 'codemode' ORDER BY "createdAt" ASC"#,
    )
    .fetch_all(&app.state.db)
    .await
    .unwrap();
    assert_eq!(rows.len(), 20, "expected 20 audit rows, got {}: {rows:?}", rows.len());
    for (action, details) in &rows {
        assert_eq!(action, "CODEMODE_WRITE");
        assert!(details.contains("WriterBot"), "missing token name in audit: {details}");
    }
    assert!(rows.iter().any(|(_, d)| d.contains("POST /api/upload")), "missing upload audit row: {rows:?}");
    assert!(rows.iter().any(|(_, d)| d.contains("PUT /api/config")), "missing config audit row: {rows:?}");
    assert!(rows.iter().any(|(_, d)| d.contains("POST /api/projects")), "missing projects audit row: {rows:?}");
}
