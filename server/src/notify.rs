//! `src/utils/notificationService.js`: send a message to the enabled channels (ntfy, Telegram, Discord), and the
//! admin's channel test.

use axum::{
    extract::{Request, State},
    http::StatusCode,
    response::Response,
};
use base64::Engine;
use serde_json::{Value, json};
use std::time::Duration;

use crate::{
    AppState,
    admin_settings::{failure, now_iso},
    api::{json_status, signed_in, truthy},
    pages,
    site_api::js_string,
    write,
};

const TIMEOUT: Duration = Duration::from_secs(10);

/// RFC 2047, for a header value that is not ASCII.
fn mime_header(text: &str) -> String {
    if text.is_ascii() {
        return text.to_string();
    }
    format!("=?utf-8?B?{}?=", base64::engine::general_purpose::STANDARD.encode(text))
}

/// One outgoing message of one channel.
#[derive(Debug, PartialEq)]
pub struct Outgoing {
    pub url: String,
    pub headers: Vec<(&'static str, String)>,
    pub body: String,
}

pub struct Message<'a> {
    pub title: &'a str,
    pub text: &'a str,
    /// ntfy priority, "1" to "5".
    pub priority: &'a str,
    pub tags: &'a str,
}

fn text(v: &Value) -> String {
    js_string(v)
}

fn ntfy(settings: &Value, m: &Message) -> Outgoing {
    let server = if truthy(&settings["serverUrl"]) { text(&settings["serverUrl"]) } else { "https://ntfy.sh".into() };
    let server = server.strip_suffix('/').unwrap_or(&server);
    let mut headers = vec![("title", mime_header(m.title)), ("priority", m.priority.into()), ("tags", m.tags.into())];
    if truthy(&settings["token"]) {
        headers.push(("authorization", format!("Bearer {}", text(&settings["token"]))));
    }
    Outgoing { url: format!("{server}/{}", text(&settings["topic"])), headers, body: m.text.into() }
}

fn json_message(url: String, body: Value) -> Outgoing {
    Outgoing { url, headers: vec![("content-type", "application/json".into())], body: body.to_string() }
}

fn telegram(settings: &Value, m: &Message) -> Outgoing {
    let body = json!({ "chat_id": settings["chatId"], "text": format!("*{}*\n\n{}", m.title, m.text), "parse_mode": "Markdown" });
    json_message(format!("https://api.telegram.org/bot{}/sendMessage", text(&settings["botToken"])), body)
}

fn discord(settings: &Value, m: &Message, color: u32) -> Outgoing {
    let body = json!({ "embeds": [{ "title": m.title, "description": m.text, "color": color, "timestamp": now_iso() }] });
    json_message(text(&settings["webhookUrl"]), body)
}

pub async fn deliver(http: &reqwest::Client, message: Outgoing) -> reqwest::Result<reqwest::Response> {
    let mut request = http.post(&message.url).timeout(TIMEOUT).body(message.body);
    for (name, value) in message.headers {
        request = request.header(name, value);
    }
    request.send().await
}

/// The messages `config` asks for.
fn outgoing(config: &Value, m: &Message) -> Vec<(&'static str, Outgoing)> {
    let on = |channel: &str, needed: &[&str]| {
        let c = &config[channel];
        truthy(&c["enabled"]) && needed.iter().all(|k| truthy(&c[*k]))
    };
    let mut out = Vec::new();
    if on("ntfy", &["topic"]) {
        out.push(("ntfy", ntfy(&config["ntfy"], m)));
    }
    if on("telegram", &["botToken", "chatId"]) {
        out.push(("telegram", telegram(&config["telegram"], m)));
    }
    if on("discord", &["webhookUrl"]) {
        out.push(("discord", discord(&config["discord"], m, 3_447_003)));
    }
    out
}

/// `sendNotification`: every enabled channel, together. Failures are logged and never reach the caller.
pub async fn send(state: &AppState, message: Message<'_>) -> Value {
    let config = match pages::try_singleton(&state.db, "NotificationConfig", true).await {
        Ok(c) => c,
        Err(err) => {
            tracing::error!(error = %err, "notification config read failed");
            return json!({ "success": false, "error": err.to_string() });
        }
    };
    if !truthy(&config["enabled"]) {
        return json!({ "success": false, "reason": "disabled" });
    }
    let messages = outgoing(&config, &message);
    if messages.is_empty() {
        return json!({ "success": false, "reason": "no_active_channels" });
    }
    let sends = messages.into_iter().map(|(channel, message)| async move {
        match deliver(&state.http, message).await {
            Ok(r) if r.status().is_success() => tracing::info!(channel, "notification sent"),
            Ok(r) => tracing::error!(channel, status = %r.status(), "notification refused"),
            // The error text would hold the URL, and a Telegram URL holds the bot token.
            Err(err) => tracing::error!(channel, error = %err.without_url(), "notification failed"),
        }
    });
    futures_util::future::join_all(sends).await;
    json!({ "success": true })
}

/// `POST /api/admin/notifications/test`: try one channel with the settings in the body, before they are saved.
pub async fn test(State(state): State<AppState>, req: Request) -> Response {
    let (parts, body) = req.into_parts();
    if !signed_in(&state, &parts.headers).await {
        return json_status(StatusCode::UNAUTHORIZED, json!({ "success": false, "error": "Unauthorized", "message": "No authentication token provided" }));
    }
    let body = write::json_body(body).await.unwrap_or(Value::Null);
    let Some(channel) = body["channel"].as_str() else { return failure(StatusCode::INTERNAL_SERVER_ERROR, "channel is required") };
    let title = "🔔 Aiyu Integration Live Test";
    let upper = channel.to_uppercase();
    let words = format!("Congratulations! Your {upper} notification channel is successfully linked to your portfolio command center.");
    let m = Message { title, text: &words, priority: "4", tags: "bell,tada,partying_face" };
    let settings = &body[channel];
    let has = |keys: &[&str]| keys.iter().all(|k| truthy(&settings[*k]));
    let message = match channel {
        "ntfy" if has(&["topic"]) => ntfy(settings, &m),
        "ntfy" => return failure(StatusCode::BAD_REQUEST, "ntfy Topic is required for testing."),
        "telegram" if has(&["botToken", "chatId"]) => telegram(settings, &m),
        "telegram" => return failure(StatusCode::BAD_REQUEST, "Telegram Bot Token and Chat ID are required for testing."),
        "discord" if has(&["webhookUrl"]) => discord(settings, &m, 16_750_848),
        "discord" => return failure(StatusCode::BAD_REQUEST, "Discord Webhook URL is required for testing."),
        _ => return failure(StatusCode::BAD_REQUEST, "Invalid channel specified."),
    };
    // A refusal by the service is a reply the form shows, with status 200 as in Next.
    let refused = |error: String| json_status(StatusCode::OK, json!({ "success": false, "error": error }));
    let response = match deliver(&state.http, message).await {
        Ok(r) => r,
        Err(err) => {
            tracing::error!(channel, error = %err.without_url(), "notification test failed");
            return failure(StatusCode::INTERNAL_SERVER_ERROR, "fetch failed");
        }
    };
    let status = response.status();
    if !status.is_success() {
        let text = response.text().await.unwrap_or_default();
        return match channel {
            "ntfy" => refused(format!("ntfy server returned error ({}): {text}", status.as_u16())),
            "discord" => refused(format!("Discord Webhook returned status {}: {text}", status.as_u16())),
            _ => match serde_json::from_str::<Value>(&text) {
                Ok(reply) => {
                    let why = if truthy(&reply["description"]) { js_string(&reply["description"]) } else { reply.to_string() };
                    refused(format!("Telegram API error: {why}"))
                }
                Err(err) => failure(StatusCode::INTERNAL_SERVER_ERROR, &err.to_string()),
            },
        };
    }
    json_status(StatusCode::OK, json!({ "success": true, "message": format!("{upper} channel test message sent successfully!") }))
}

#[cfg(test)]
mod tests {
    use super::*;

    const M: Message = Message { title: "Hi é", text: "body", priority: "4", tags: "a,b" };

    #[test]
    fn channels_need_their_settings() {
        let config = json!({
            "ntfy": { "enabled": true, "topic": "t", "serverUrl": "http://n/", "token": "k" },
            "telegram": { "enabled": true, "botToken": "b" },
            "discord": { "enabled": false, "webhookUrl": "http://d" },
        });
        let out = outgoing(&config, &M);
        assert_eq!(out.len(), 1);
        assert_eq!(out[0].1.url, "http://n/t");
        assert_eq!(out[0].1.headers, [("title", "=?utf-8?B?SGkgw6k=?=".to_string()), ("priority", "4".into()), ("tags", "a,b".into()), ("authorization", "Bearer k".into())]);
    }

    #[test]
    fn telegram_and_discord_payloads() {
        let t = telegram(&json!({ "botToken": "1:x", "chatId": "9" }), &M);
        assert_eq!(t.url, "https://api.telegram.org/bot1:x/sendMessage");
        assert_eq!(t.body, r#"{"chat_id":"9","text":"*Hi é*\n\nbody","parse_mode":"Markdown"}"#);
        let d: Value = serde_json::from_str(&discord(&json!({ "webhookUrl": "u" }), &M, 7).body).unwrap();
        assert_eq!((d["embeds"][0]["title"].clone(), d["embeds"][0]["color"].clone()), (json!("Hi é"), json!(7)));
    }
}
