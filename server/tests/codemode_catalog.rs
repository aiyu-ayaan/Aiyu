//! Phase 1 (Catalog) tests for Code Mode:
//! - Every catalog row resolves on `router()` (not 404 fallback or 405).
//! - Every admin section in `src/app/components/admin/shell/navConfig.js` has at least one catalog row.
//! - No "Never" route from `CODEMODE_PLAN.md` appears in the catalog, and no `/api/codemode/*` route appears.
//! - Redactions remove every secret field from sample and real GET outputs.
//! - Path validation rejects `..`, `//`, `%`, `?`, `#`, non-`/api/`, and `/api/codemode/*`.
//! - Generated OpenAPI document matches the catalog and filters by scope.

use aiyu_server::{
    AppState,
    codemode::catalog::{CATALOG, Scope, apply_redactions, match_entry, openapi_document, validate_path},
    config::{Config, parse_trusted},
    db::{self, Stamp},
    router,
    session::Claims,
};
use axum::{
    Router,
    body::Body,
    extract::ConnectInfo,
    http::{Request, StatusCode, header},
};
use chrono::{TimeDelta, Utc};
use http_body_util::BodyExt;
use regex::Regex;
use serde_json::{Value, json};
use std::{
    collections::BTreeSet,
    net::SocketAddr,
    path::PathBuf,
};
use tower::ServiceExt;

struct TestApp {
    router: Router,
    cookie: String,
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
    let db_path = std::env::temp_dir().join(format!("aiyu-codemode-test-{id}.db"));
    let web_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../web/dist");

    let mut state = AppState::new(Config {
        listen: "127.0.0.1:0".parse().unwrap(),
        jwt_secret: "test-jwt-secret-for-codemode-catalog".into(),
        trusted_proxies: parse_trusted("").unwrap(),
        uploads_dir: std::env::temp_dir().join(format!("aiyu-codemode-uploads-{id}")),
        public_dir: "/nonexistent".into(),
        database_path: db_path.clone(),
        web_dir,
    })
    .await
    .unwrap();
    state.package_version = Some("1.0.0".into());

    // Create & migrate the temporary database.
    state.db = db::connect(&db_path, true);
    db::migrate(&state.db).await.unwrap();

    // Seed an active admin session so authenticated GET handlers execute cleanly.
    let jti = "test-session-jti-secret-value";
    let now = Utc::now().naive_utc();
    let expires = (Utc::now() + TimeDelta::hours(24)).naive_utc();
    sqlx::query(
        r#"INSERT INTO "Session" (id, jti, label, "ipAddress", "userAgent", "lastSeenAt", "expiresAt", "createdAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $6)"#,
    )
    .bind("sess-1")
    .bind(jti)
    .bind("Test Session")
    .bind("127.0.0.1")
    .bind("codemode-test")
    .bind(Stamp(now))
    .bind(Stamp(expires))
    .execute(&state.db)
    .await
    .unwrap();

    let token = state
        .sessions
        .sign(&Claims {
            user: json!({ "username": "admin" }),
            jti: Some(jti.into()),
            expires: None,
            exp: (Utc::now() + TimeDelta::hours(24)).timestamp() as u64,
            iat: Some(Utc::now().timestamp() as u64),
        })
        .unwrap();
    let cookie = format!("session={token}");

    // Seed one row for each parameterized resource so `/{id}` routes return 200, not handler 404.
    db::insert_row(&state.db, "Project", json!({ "id": "test-id", "name": "Demo", "slug": "demo", "year": "2026", "status": "Active", "projectType": "Web", "description": "desc" }).as_object().unwrap())
        .await
        .unwrap();
    db::insert_row(&state.db, "Deployment", json!({ "id": "test-id", "name": "Demo App", "slug": "demo-app", "appType": "Web", "hostingProvider": "VPS", "description": "desc" }).as_object().unwrap())
        .await
        .unwrap();
    db::insert_row(&state.db, "Blog", json!({ "id": "test-id", "title": "Demo Post", "slug": "demo-post", "content": "hello world", "date": "2026-01-01", "published": true }).as_object().unwrap())
        .await
        .unwrap();
    db::insert_row(&state.db, "Social", json!({ "id": "test-id", "name": "GitHub", "url": "https://github.com/example", "iconName": "github" }).as_object().unwrap())
        .await
        .unwrap();
    db::insert_row(&state.db, "Theme", json!({ "id": "test-id", "name": "Custom", "slug": "test-id", "variants": {} }).as_object().unwrap())
        .await
        .unwrap();
    db::insert_row(&state.db, "LegalApp", json!({ "id": "test-id", "name": "Demo Legal", "slug": "demo-legal" }).as_object().unwrap())
        .await
        .unwrap();
    db::insert_row(&state.db, "LegalDocument", json!({ "id": "test-id", "appId": "test-id", "kind": "privacy", "title": "Privacy", "slug": "privacy", "content": "policy" }).as_object().unwrap())
        .await
        .unwrap();

    // Seed Config with sealed gdriveConfig, AI provider keys, and n8n webhook auth key.
    let sealed_gdrive_secret = state.cipher.encrypt("super-secret-gdrive-client-secret").unwrap();
    let sealed_gdrive_refresh = state.cipher.encrypt("super-secret-gdrive-refresh-token").unwrap();
    let sealed_ai_key = state.cipher.encrypt("sk-live-secret-provider-key").unwrap();
    let sealed_gateway_key = state.cipher.encrypt("gw-live-secret-gateway-key").unwrap();
    let config_data = json!({
        "siteTitle": "Portfolio",
        "authorName": "Aiyu",
        "gdriveConfig": {
            "clientId": "client-id",
            "clientSecret": sealed_gdrive_secret,
            "refreshToken": sealed_gdrive_refresh,
            "retentionMonths": 3,
            "autoDeleteEnabled": true
        },
        "ai": {
            "enabled": false,
            "gatewayUrl": "https://gateway.example",
            "gatewayApiKey": sealed_gateway_key,
            "providers": [
                { "id": "p1", "name": "OpenAI", "type": "openai", "apiKey": sealed_ai_key }
            ]
        },
        "n8nWebhookAuthKey": "n8n-secret-auth-key"
    });
    db::insert_row(
        &state.db,
        "Config",
        json!({
            "id": "cfg-1",
            "data": config_data,
            "encryptedGithubToken": state.cipher.encrypt("ghp_secret").unwrap(),
            "blogApiTokenHash": "deadbeefhash"
        })
        .as_object()
        .unwrap(),
    )
    .await
    .unwrap();

    // Seed Cron with encrypted webhookEnv (GET /api/admin/crons decrypts it).
    let sealed_env_val = state.cipher.encrypt("CRON_DECRYPTED_SECRET_VALUE").unwrap();
    db::insert_row(
        &state.db,
        "Cron",
        json!({
            "id": "cron-1",
            "name": "Secret Hook",
            "type": "user",
            "schedule": "0 * * * *",
            "enabled": false,
            "action": "webhook",
            "webhookUrl": "https://example.com/hook",
            "webhookEnv": [{ "key": "API_SECRET", "value": sealed_env_val }]
        })
        .as_object()
        .unwrap(),
    )
    .await
    .unwrap();

    // Seed NotificationConfig with webhook URL and tokens.
    db::insert_row(
        &state.db,
        "NotificationConfig",
        json!({
            "id": "notif-1",
            "data": {
                "enabled": true,
                "ntfy": { "enabled": true, "serverUrl": "https://ntfy.private.example", "topic": "alerts", "token": "tk_ntfy_secret_token" },
                "telegram": { "enabled": true, "botToken": "123456:TELEGRAM_BOT_SECRET", "chatId": "999" },
                "discord": { "enabled": true, "webhookUrl": "https://discord.com/api/webhooks/123/DISCORD_SECRET" },
                "notifyOnContactMessage": true
            }
        })
        .as_object()
        .unwrap(),
    )
    .await
    .unwrap();

    TestApp {
        router: router(state),
        cookie,
        db_path,
    }
}

async fn send_authed(app: &TestApp, method: &str, uri: &str) -> (StatusCode, Value) {
    let mut req = Request::builder()
        .method(method)
        .uri(uri)
        .header("host", "localhost")
        .header(header::COOKIE, &app.cookie)
        .body(Body::empty())
        .unwrap();
    req.extensions_mut().insert(ConnectInfo::<SocketAddr>("127.0.0.1:5555".parse().unwrap()));
    let res = app.router.clone().oneshot(req).await.unwrap();
    let status = res.status();
    let bytes = res.into_body().collect().await.unwrap().to_bytes();
    let json = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
    (status, json)
}

#[tokio::test]
async fn every_catalog_row_resolves_on_router() {
    assert!(!CATALOG.is_empty(), "CATALOG must not be empty");
    let app = test_app().await;

    for entry in CATALOG {
        // Every catalog path must itself pass path validation when parameters are substituted.
        let concrete_path = entry.path.replace("{id}", "test-id");
        assert!(
            validate_path(&concrete_path).is_ok(),
            "catalog path failed validate_path: {} {}",
            entry.method,
            entry.path
        );

        let (status, body) = if entry.scope == Scope::Read {
            send_authed(&app, entry.method, &concrete_path).await
        } else {
            // Unauthenticated write request verifies route + HTTP method exist on `router()`
            // (returns 401 rather than 404/405) without mutating state or hitting external services.
            let mut req = Request::builder()
                .method(entry.method)
                .uri(&concrete_path)
                .header("host", "localhost")
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from("{}"))
                .unwrap();
            req.extensions_mut().insert(ConnectInfo::<SocketAddr>("127.0.0.1:5555".parse().unwrap()));
            let res = app.router.clone().oneshot(req).await.unwrap();
            let status = res.status();
            let bytes = res.into_body().collect().await.unwrap().to_bytes();
            (status, serde_json::from_slice(&bytes).unwrap_or(Value::Null))
        };
        assert_ne!(
            status,
            StatusCode::METHOD_NOT_ALLOWED,
            "catalog row returned 405: {} {}",
            entry.method,
            entry.path
        );
        // Must not hit site_static::fallback 404 ("Not found").
        let is_fallback_404 = status == StatusCode::NOT_FOUND
            && body.get("error").and_then(Value::as_str) == Some("Not found");
        assert!(
            !is_fallback_404,
            "catalog row hit router 404 fallback: {} {} (body: {body})",
            entry.method,
            entry.path
        );
        // For all routes except /api/github/stats (which returns handler 404 when username is unconfigured),
        // seeded data guarantees a non-404 status.
        if entry.path != "/api/github/stats" {
            assert_ne!(
                status,
                StatusCode::NOT_FOUND,
                "catalog row unexpectedly returned 404: {} {} (body: {body})",
                entry.method,
                entry.path
            );
        }
    }
}

#[test]
fn every_admin_section_in_nav_config_has_at_least_one_catalog_row() {
    let nav_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../src/app/components/admin/shell/navConfig.js");
    let nav_source = std::fs::read_to_string(&nav_path)
        .expect("read src/app/components/admin/shell/navConfig.js");

    // Extract every `path: "/admin..."` declared in NAV_GROUPS and SETTINGS_ITEM.
    let re = Regex::new(r#"path:\s*"(/admin[^"]*)""#).unwrap();
    let nav_paths: BTreeSet<String> = re
        .captures_iter(&nav_source)
        .map(|c| c[1].to_string())
        .collect();
    assert!(
        nav_paths.len() >= 25,
        "expected at least 25 admin nav paths in navConfig.js, found {}",
        nav_paths.len()
    );

    let covered: BTreeSet<&str> = CATALOG
        .iter()
        .flat_map(|entry| entry.admin_paths.iter().copied())
        .collect();

    let missing: Vec<&String> = nav_paths
        .iter()
        .filter(|p| !covered.contains(p.as_str()))
        .collect();
    assert!(
        missing.is_empty(),
        "admin sections from navConfig.js missing from catalog: {missing:?}"
    );
}

#[test]
fn no_never_route_or_codemode_route_appears_in_catalog() {
    let forbidden: &[(&str, &str)] = &[
        // Code Mode itself (prevent recursion)
        ("POST", "/api/codemode/search"),
        ("POST", "/api/codemode/execute"),
        ("GET", "/api/codemode/tokens"),
        // Auth
        ("POST", "/api/auth/login"),
        ("POST", "/api/auth/logout"),
        ("GET", "/api/auth/github"),
        ("GET", "/api/auth/github/callback"),
        // Blog API token
        ("GET", "/api/admin/blogs/token"),
        ("POST", "/api/admin/blogs/token"),
        ("DELETE", "/api/admin/blogs/token"),
        // Analytics reset
        ("DELETE", "/api/admin/analytics"),
        // GitHub webhook
        ("POST", "/api/github/webhook"),
        // Cron mutations, env, preview
        ("POST", "/api/admin/crons"),
        ("PUT", "/api/admin/crons/123"),
        ("DELETE", "/api/admin/crons/123"),
        ("POST", "/api/admin/crons/123/run"),
        ("GET", "/api/admin/crons/env"),
        ("POST", "/api/admin/crons/env"),
        ("POST", "/api/admin/crons/preview"),
        // Notifications writes
        ("PUT", "/api/admin/notifications"),
        ("POST", "/api/admin/notifications/test"),
        // Security revoke
        ("POST", "/api/admin/security/sessions/123/revoke"),
        // Database dangerous routes
        ("GET", "/api/admin/export"),
        ("POST", "/api/admin/import"),
        ("GET", "/api/admin/gdrive/config"),
        ("POST", "/api/admin/gdrive/config"),
        ("GET", "/api/admin/gdrive/cron"),
        ("POST", "/api/admin/gdrive/cron"),
        ("GET", "/api/admin/gdrive/auth"),
        ("GET", "/api/admin/gdrive/callback"),
        ("POST", "/api/admin/gdrive/restore"),
        ("POST", "/api/admin/gdrive/delete"),
        ("POST", "/api/admin/gdrive/disconnect"),
        // Resources dangerous routes
        ("DELETE", "/api/admin/storage/unreferenced"),
        ("POST", "/api/admin/storage/migrate"),
        ("POST", "/api/admin/migrate-gallery"),
        // AI Core keys & provider validation
        ("PUT", "/api/admin/ai/config"),
        ("POST", "/api/admin/ai/models"),
        ("POST", "/api/admin/ai/validate-provider"),
    ];

    for entry in CATALOG {
        assert!(
            !entry.path.starts_with("/api/codemode"),
            "catalog must never expose /api/codemode/*: {}",
            entry.path
        );
        if entry.scope == Scope::Read {
            assert_eq!(
                entry.method, "GET",
                "Read catalog entry must be GET: {} {}",
                entry.method,
                entry.path
            );
        } else {
            assert!(
                matches!(entry.method, "POST" | "PUT" | "PATCH" | "DELETE"),
                "Write catalog entry must be mutating method: {} {}",
                entry.method,
                entry.path
            );
        }
    }

    for &(method, path) in forbidden {
        assert!(
            match_entry(method, path, Scope::Write).is_none(),
            "forbidden route matched catalog: {method} {path}"
        );
    }

    // No write row may ever accept a Singleton secret column or credential/webhook field.
    let forbidden_fields = [
        "encryptedGithubToken",
        "encryptedGithubWebhookSecret",
        "encryptedGeminiApiKey",
        "encryptedGroqApiKey",
        "encryptedOpenRouterApiKey",
        "encryptedGoogleServiceAccount",
        "blogApiTokenHash",
        "blogApiTokenLast4",
        "blogApiTokenCreatedAt",
        "gdriveConfig",
        "n8nWebhookAuthKey",
        "n8nWebhookUrl",
        "githubToken",
        "webhookSecret",
        "apiKey",
        "gatewayApiKey",
        "serviceAccount",
        "tokenHash",
        "botToken",
        "webhookUrl",
        "webhookEnv",
    ];
    for entry in CATALOG.iter().filter(|e| e.scope == Scope::Write) {
        for &field in entry.allowed_body_fields {
            assert!(
                !forbidden_fields.contains(&field),
                "write entry {} {} must never allow secret/webhook field `{field}`",
                entry.method,
                entry.path
            );
        }
    }
}

#[test]
fn path_validation_rejects_bad_paths_and_accepts_valid_api_paths() {
    let bad_paths = [
        "",
        "/",
        "/api",
        "/api/",
        "/blogs",
        "api/blogs",
        "/api/blogs/../config",
        "/api/..",
        "/api//blogs",
        "/api/blogs//123",
        "/api/blogs/%2e%2e",
        "/api/blogs%00",
        "/api/blogs?all=true",
        "/api/blogs#section",
        "/api/codemode",
        "/api/codemode/",
        "/api/codemode/search",
        "/api/codemode/execute",
        "/api/blogs\\admin",
        "/api/blogs\n",
    ];
    for p in bad_paths {
        assert!(validate_path(p).is_err(), "path should be rejected: {p:?}");
    }

    let good_paths = [
        "/api/health",
        "/api/blogs",
        "/api/blogs/my-post-1",
        "/api/admin/crons/logs",
        "/api/projects/abc_123/links",
    ];
    for p in good_paths {
        assert!(validate_path(p).is_ok(), "path should be accepted: {p:?}");
    }
}

#[tokio::test]
async fn redactions_remove_secrets_from_real_get_outputs() {
    let app = test_app().await;

    // 1. GET /api/admin/crons — decrypted webhookEnv must be removed
    let entry = match_entry("GET", "/api/admin/crons", Scope::Read).expect("crons entry");
    let (status, mut body) = send_authed(&app, "GET", "/api/admin/crons").await;
    assert_eq!(status, StatusCode::OK);
    assert!(body.to_string().contains("CRON_DECRYPTED_SECRET_VALUE"), "precondition: raw handler returns decrypted env");
    apply_redactions(&mut body, entry.redactions);
    let redacted_str = body.to_string();
    assert!(!redacted_str.contains("CRON_DECRYPTED_SECRET_VALUE"), "redacted crons leaked secret: {redacted_str}");
    assert!(!redacted_str.contains("webhookEnv"), "redacted crons still contains webhookEnv key: {redacted_str}");

    // 2. GET /api/admin/notifications — webhook URLs and tokens must be removed
    let entry = match_entry("GET", "/api/admin/notifications", Scope::Read).expect("notifications entry");
    let (status, mut body) = send_authed(&app, "GET", "/api/admin/notifications").await;
    assert_eq!(status, StatusCode::OK);
    let raw_str = body.to_string();
    assert!(raw_str.contains("tk_ntfy_secret_token"));
    assert!(raw_str.contains("TELEGRAM_BOT_SECRET"));
    assert!(raw_str.contains("DISCORD_SECRET"));
    apply_redactions(&mut body, entry.redactions);
    let redacted_str = body.to_string();
    for secret in ["tk_ntfy_secret_token", "TELEGRAM_BOT_SECRET", "DISCORD_SECRET", "ntfy.private.example"] {
        assert!(!redacted_str.contains(secret), "redacted notifications leaked {secret}: {redacted_str}");
    }
    assert_eq!(body["data"]["enabled"], json!(true), "non-secret fields preserved");

    // 3. GET /api/config — sealed gdriveConfig, AI provider/gateway keys, and n8nWebhookAuthKey must be removed
    let entry = match_entry("GET", "/api/config", Scope::Read).expect("config entry");
    let (status, mut body) = send_authed(&app, "GET", "/api/config").await;
    assert_eq!(status, StatusCode::OK);
    let raw_str = body.to_string();
    assert!(raw_str.contains("gdriveConfig"));
    assert!(raw_str.contains("n8n-secret-auth-key"));
    assert!(raw_str.contains("gatewayApiKey"));
    assert!(raw_str.contains("apiKey"));
    apply_redactions(&mut body, entry.redactions);
    let redacted_str = body.to_string();
    for forbidden in ["gdriveConfig", "n8n-secret-auth-key", "n8nWebhookAuthKey", "gatewayApiKey", "apiKey"] {
        assert!(!redacted_str.contains(forbidden), "redacted config leaked {forbidden}: {redacted_str}");
    }
    assert_eq!(body["siteTitle"], json!("Portfolio"), "non-secret config fields preserved");

    // 4. GET /api/admin/security/sessions — session jti must be removed
    let entry = match_entry("GET", "/api/admin/security/sessions", Scope::Read).expect("sessions entry");
    let (status, mut body) = send_authed(&app, "GET", "/api/admin/security/sessions").await;
    assert_eq!(status, StatusCode::OK);
    assert!(body.to_string().contains("test-session-jti-secret-value"));
    apply_redactions(&mut body, entry.redactions);
    let redacted_str = body.to_string();
    assert!(!redacted_str.contains("test-session-jti-secret-value"), "redacted sessions leaked jti: {redacted_str}");
    assert_eq!(body["sessions"][0]["label"], json!("Test Session"), "non-secret session fields preserved");
}

#[test]
fn openapi_document_matches_catalog_and_filters_by_scope() {
    let read_doc = openapi_document(Scope::Read);
    assert_eq!(read_doc["openapi"], json!("3.1.0"));
    let paths = read_doc["paths"].as_object().expect("openapi paths object");
    assert!(!paths.is_empty());

    // Every Read entry in CATALOG appears in the OpenAPI document.
    for entry in CATALOG.iter().filter(|e| Scope::Read.allows(e.scope)) {
        let method = entry.method.to_ascii_lowercase();
        let op = &paths[entry.path][&method];
        assert!(
            op.is_object(),
            "missing OpenAPI operation for {} {}",
            entry.method,
            entry.path
        );
        assert_eq!(op["summary"], json!(entry.summary));
        assert_eq!(op["x-scope"], json!(entry.scope.as_str()));
    }

    // No path outside the catalog appears in the OpenAPI document.
    for (path, methods) in paths {
        assert!(!path.starts_with("/api/codemode"));
        for method in methods.as_object().unwrap().keys() {
            let found = CATALOG.iter().any(|e| {
                e.path == path
                    && e.method.eq_ignore_ascii_case(method)
                    && Scope::Read.allows(e.scope)
            });
            assert!(found, "OpenAPI document contains uncataloged operation: {method} {path}");
        }
    }

    // Read OpenAPI doc must not include write helpers.
    assert!(read_doc.get("x-codemode-upload").is_none());

    // Write scope includes all read + write operations and documents codemode.upload.
    let write_doc = openapi_document(Scope::Write);
    assert!(write_doc.get("x-codemode-upload").is_some());
    let write_paths = write_doc["paths"].as_object().unwrap();
    let read_ops: usize = paths.values().map(|v| v.as_object().unwrap().len()).sum();
    let write_ops: usize = write_paths.values().map(|v| v.as_object().unwrap().len()).sum();
    assert!(write_ops > read_ops, "write scope must expose more operations than read scope");
    assert_eq!(write_ops, CATALOG.len());
}
