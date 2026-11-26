//! `POST /api/contact/message`: the public contact form. The message is stored first, then forwarded to the
//! notification channels and the n8n webhook; their failures never fail the visitor's request.

use crate::db::{Stamp};
use axum::{
    extract::{Request, State},
    http::StatusCode,
    response::Response,
};
use serde_json::{Value, json};
use std::time::Duration;

use crate::{
    AppState,
    admin_settings::now_iso,
    api::{error, json_status, log_error, truthy},
    db::new_id,
    notify, pages,
    site_api::js_string,
};

/// A name, an address and a message: far below this.
const BODY_LIMIT: usize = 256 * 1024;

async fn save(state: &AppState, name: &str, email: &str, message: &str) -> anyhow::Result<()> {
    sqlx::query(r#"INSERT INTO "ContactMessage" (id, name, email, message, "createdAt") VALUES ($1, $2, $3, $4, $5)"#)
        .bind(new_id())
        .bind(name)
        .bind(email)
        .bind(message)
        .bind(Stamp(chrono::Utc::now().naive_utc()))
        .execute(&state.db)
        .await?;
    Ok(())
}

async fn forward_to_webhook(state: &AppState, config: &Value, name: &str, email: &str, message: &str) {
    if !truthy(&config["n8nWebhookEnabled"]) || !truthy(&config["n8nWebhookUrl"]) {
        return;
    }
    let payload = json!({ "sender": name, "email": email, "content": message, "timestamp": now_iso() });
    let mut request = state
        .http
        .post(js_string(&config["n8nWebhookUrl"]))
        .timeout(Duration::from_secs(10))
        .header("content-type", "application/json")
        .header("accept", "application/json")
        .header("user-agent", "AiyuPortfolio/1.0")
        .body(payload.to_string());
    if truthy(&config["n8nWebhookAuthKey"]) {
        request = request.header("authorization", js_string(&config["n8nWebhookAuthKey"]));
    }
    match request.send().await {
        Ok(r) if r.status().is_success() => tracing::info!("n8n webhook triggered"),
        Ok(r) => tracing::error!(status = %r.status(), "n8n webhook failed"),
        Err(err) => tracing::error!(error = %err.without_url(), "n8n webhook failed"),
    }
}

pub async fn submit(State(state): State<AppState>, req: Request) -> Response {
    let failed = || error(StatusCode::INTERNAL_SERVER_ERROR, "Failed to send message");
    let Ok(bytes) = axum::body::to_bytes(req.into_body(), BODY_LIMIT).await else { return failed() };
    let Ok(body) = serde_json::from_slice::<Value>(&bytes) else { return failed() };
    if body.is_null() {
        return failed();
    }
    let fields = ["name", "email", "message"].map(|k| &body[k]);
    if fields.iter().any(|f| !truthy(f)) {
        return error(StatusCode::BAD_REQUEST, "Name, email, and message are required");
    }
    // The columns are text: anything else is refused, as Prisma refuses it.
    let [Some(name), Some(email), Some(message)] = fields.map(Value::as_str) else { return failed() };
    if let Err(err) = save(&state, name, email, message).await {
        log_error("/api/contact/message", &err);
        return failed();
    }

    let notifications = pages::singleton(&state.db, "NotificationConfig", true).await;
    if truthy(&notifications["enabled"]) && truthy(&notifications["notifyOnContactMessage"]) {
        let title = format!("📧 New Contact Message: {name}");
        let text = format!("From: {name} <{email}>\n\nMessage:\n{message}");
        notify::send(&state, notify::Message { title: &title, text: &text, priority: "4", tags: "email,envelope,incoming_envelope" }).await;
    }
    match pages::try_singleton(&state.db, "Config", false).await {
        Ok(config) => forward_to_webhook(&state, &config, name, email, message).await,
        Err(err) => {
            log_error("/api/contact/message", &err);
            return failed();
        }
    }
    json_status(StatusCode::CREATED, json!({ "success": true, "message": "Message sent successfully" }))
}
