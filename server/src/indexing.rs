//! Google's Indexing API (src/lib/googleIndexing.js) and the automatic pings after content changes
//! (src/lib/autoIndexing.js).

use std::time::Duration;

use jsonwebtoken::{Algorithm, EncodingKey, Header};
use reqwest::RequestBuilder;
use serde_json::{Value, json};

use crate::{AppState, api::truthy, drive::google, pages, seo, site_api::js_string, web::site_url, write, write::Kind, write::Table};

const LOG: Table = Table {
    name: "IndexingLog",
    columns: &[("url", Kind::Text), ("type", Kind::Text), ("status", Kind::Text), ("response", Kind::Text)],
    created_at: true,
    updated_at: false,
};

pub const TYPES: [&str; 2] = ["URL_UPDATED", "URL_DELETED"];
/// Where the assertion is addressed, whatever stands in for Google in tests.
const AUDIENCE: &str = "https://oauth2.googleapis.com/token";

pub struct Ping {
    pub url: String,
    pub ok: bool,
    pub response: String,
}

impl Ping {
    pub fn json(&self) -> Value {
        json!({ "url": self.url, "status": self.status(), "response": self.response })
    }

    fn status(&self) -> &'static str {
        if self.ok { "success" } else { "error" }
    }
}

/// A short-lived assertion signed with the service account's key.
fn assertion(account: &str) -> anyhow::Result<String> {
    let account: Value = serde_json::from_str(account).map_err(|_| anyhow::anyhow!("Service account is not valid JSON."))?;
    seo::service_account_email(&account).map_err(|message| anyhow::anyhow!(message))?;
    let email = js_string(&account["client_email"]);
    let key = EncodingKey::from_rsa_pem(js_string(&account["private_key"]).as_bytes()).map_err(|err| anyhow::anyhow!("private_key cannot be read: {err}"))?;
    let now = chrono::Utc::now().timestamp();
    let claims = json!({
        "scope": "https://www.googleapis.com/auth/indexing", "iss": email, "sub": email, "aud": AUDIENCE, "iat": now, "exp": now + 3600,
    });
    Ok(jsonwebtoken::encode(&Header::new(Algorithm::RS256), &claims, &key)?)
}

async fn answer(request: RequestBuilder) -> anyhow::Result<(u16, Value)> {
    let response = request.timeout(Duration::from_secs(30)).send().await.map_err(|_| anyhow::anyhow!("fetch failed"))?;
    let status = response.status().as_u16();
    Ok((status, response.json().await.unwrap_or_else(|_| json!({}))))
}

async fn access_token(state: &AppState, account: &str) -> anyhow::Result<String> {
    let assertion = assertion(account)?;
    let form = url::form_urlencoded::Serializer::new(String::new())
        .append_pair("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer")
        .append_pair("assertion", &assertion)
        .finish();
    let request = state.http.post(google("oauth2.googleapis.com", "/token")).header("content-type", "application/x-www-form-urlencoded").body(form);
    let (status, data) = answer(request).await?;
    match data["access_token"].as_str().filter(|t| !t.is_empty() && (200..300).contains(&status)) {
        Some(token) => Ok(token.to_string()),
        None => {
            let said = [&data["error_description"], &data["error"]].into_iter().find(|v| truthy(v)).map(js_string);
            anyhow::bail!(said.unwrap_or_else(|| format!("Token exchange failed (HTTP {status}).")))
        }
    }
}

async fn publish(state: &AppState, token: &str, url: &str, kind: &str) -> anyhow::Result<String> {
    let request = state.http.post(google("indexing.googleapis.com", "/v3/urlNotifications:publish")).bearer_auth(token).json(&json!({ "url": url, "type": kind }));
    let (status, data) = answer(request).await?;
    if !(200..300).contains(&status) {
        let said = &data["error"]["message"];
        anyhow::bail!(if truthy(said) { js_string(said) } else { format!("Publish failed (HTTP {status}).") });
    }
    let metadata = &data["urlNotificationMetadata"];
    let when = [&metadata["latestUpdate"]["notifyTime"], &metadata["latestRemove"]["notifyTime"]].into_iter().find(|v| truthy(v));
    Ok(when.map_or_else(|| "Accepted by Google.".into(), |t| format!("Notified at {}", js_string(t))))
}

/// Tells Google about each URL with one access token. A single URL's failure is reported with that URL.
pub async fn ping(state: &AppState, account: &str, urls: &[String], kind: &str) -> anyhow::Result<Vec<Ping>> {
    anyhow::ensure!(TYPES.contains(&kind), "Invalid indexing type \"{kind}\".");
    let token = access_token(state, account).await?;
    let mut out = Vec::new();
    for url in urls {
        let (ok, response) = match publish(state, &token, url, kind).await {
            Ok(said) => (true, said),
            Err(err) => (false, err.to_string()),
        };
        out.push(Ping { url: url.clone(), ok, response });
    }
    Ok(out)
}

/// The log rows of a batch; `prefix` marks the automatic ones.
pub async fn record(state: &AppState, pings: &[Ping], kind: &str, prefix: &str) -> anyhow::Result<()> {
    for p in pings {
        let response: String = format!("{prefix}{}", p.response).chars().take(2000).collect();
        let row = json!({ "url": p.url, "type": kind, "status": p.status(), "response": response });
        write::insert(&state.db, &LOG, write::prepare(&LOG, &row)?).await?;
    }
    Ok(())
}

/// The stored service account, opened.
pub async fn account(state: &AppState) -> anyhow::Result<Option<Option<String>>> {
    let stored: Option<Option<String>> = sqlx::query_scalar(r#"SELECT "encryptedGoogleServiceAccount" FROM "SeoConfig" LIMIT 1"#).fetch_optional(&state.db).await?;
    Ok(stored.flatten().filter(|s| !s.is_empty()).map(|s| state.cipher.decrypt(&s).filter(|v| !v.is_empty())))
}

/// `toCanonicalSiteUrl`
pub fn canonical(base: &str, path: &str) -> String {
    let path = path.trim();
    if path.is_empty() || path == "/" {
        return base.to_string();
    }
    let slash = if path.starts_with('/') { "" } else { "/" };
    format!("{base}{slash}{}", path.trim_end_matches('/'))
}

/// `toCanonicalUrls`: absolute site URLs of paths or URLs, each once.
fn canonical_urls(base: &str, paths: &[Value]) -> Vec<String> {
    let mut out: Vec<String> = Vec::new();
    for path in paths.iter().filter_map(Value::as_str).map(str::trim).filter(|p| !p.is_empty()) {
        let local = if path.starts_with("http") {
            let Ok(url) = reqwest::Url::parse(path) else { continue };
            url.path().to_string()
        } else {
            path.to_string()
        };
        let url = canonical(base, &local);
        if !out.contains(&url) {
            out.push(url);
        }
    }
    out
}

async fn run(state: &AppState, wanted: &Value) -> anyhow::Result<()> {
    let stored = pages::try_singleton(&state.db, "SeoConfig", false).await?;
    if !truthy(&seo::merge_seo_config(&stored)["indexing"]["autoPing"]) {
        return Ok(());
    }
    let Some(Some(account)) = account(state).await? else { return Ok(()) };
    let urls = canonical_urls(&site_url(), wanted["paths"].as_array().map(Vec::as_slice).unwrap_or_default());
    if urls.is_empty() {
        return Ok(());
    }
    let kind = wanted["type"].as_str().unwrap_or(TYPES[0]);
    let results = ping(state, &account, &urls, kind).await?;
    record(state, &results, kind, "[auto] ").await
}

/// Queues the pings of a content change (`{ paths, type }` each). They run after the reply and never fail a write.
pub fn auto(state: &AppState, pings: Vec<Value>) {
    if pings.is_empty() {
        return;
    }
    let state = state.clone();
    tokio::spawn(async move {
        for wanted in &pings {
            if let Err(err) = run(&state, wanted).await {
                tracing::warn!(error = %err, "indexing ping failed");
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn urls_are_made_canonical_and_unique() {
        let paths = [json!("/blogs/a/"), json!("blogs/a"), json!("https://other.example/blogs/a?x=1"), json!("/"), json!(" "), json!(5)];
        assert_eq!(canonical_urls("https://s.example", &paths), ["https://s.example/blogs/a", "https://s.example"]);
    }
}
