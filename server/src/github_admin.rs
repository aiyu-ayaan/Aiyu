//! The GitHub routes besides the public statistics: the integration's settings, the admin's repo sync and the push
//! webhook (src/app/api/github/{config,sync,webhook}).

use axum::{
    extract::{RawQuery, Request, State},
    http::{HeaderMap, StatusCode},
    response::Response,
};
use chrono::Utc;
use hmac::{Hmac, Mac};
use serde_json::{Map, Value, json};
use sha2::Sha256;

use crate::{
    AppState,
    admin_settings::failure,
    api::{json_status, log_error, query_map, signed_in, truthy},
    github_sync, pages,
    session::constant_time_eq,
    site_api::js_string,
    write::{self, Singleton},
};

const GITHUB: Singleton = Singleton { table: "GitHub", timestamps: false, secrets: &[] };
const MAX_REPOS_PER_SYNC: usize = 30;
/// GitHub caps webhook payloads at 25 MB.
const WEBHOOK_LIMIT: usize = 25 * 1024 * 1024;

fn ok(value: Value) -> Response {
    json_status(StatusCode::OK, value)
}

fn refused() -> Response {
    json_status(StatusCode::UNAUTHORIZED, json!({ "success": false, "error": "Unauthorized", "message": "No authentication token provided" }))
}

// ── settings ───────────────────────────────────────────────────────────────────────────────────────────

async fn secret(state: &AppState, column: &str) -> anyhow::Result<Option<String>> {
    let sql = format!(r#"SELECT "{column}" FROM "Config" LIMIT 1"#);
    let stored: Option<Option<String>> = sqlx::query_scalar(&sql).fetch_optional(&state.db).await?;
    Ok(stored.flatten().filter(|s| !s.is_empty()))
}

async fn api_get(state: &AppState, url: &str, token: Option<&str>) -> reqwest::Result<reqwest::Response> {
    let mut r = state.http.get(url).header("accept", "application/vnd.github.v3+json").header("user-agent", "Portfolio-App");
    if let Some(token) = token {
        r = r.header("authorization", format!("token {token}"));
    }
    r.timeout(std::time::Duration::from_secs(10)).send().await
}

async fn api_json(response: reqwest::Result<reqwest::Response>) -> Option<Value> {
    let response = response.ok().filter(|r| r.status().is_success())?;
    serde_json::from_slice(&response.bytes().await.ok()?).ok()
}

/// What the repo pickers show for each repo; private ones first.
fn repo_list(mut repos: Vec<Value>) -> Value {
    repos.sort_by_key(|r| !truthy(&r["private"]));
    let or = |r: &Value, k: &str, fallback: Value| if truthy(&r[k]) { r[k].clone() } else { fallback };
    let names: Vec<Value> = repos.iter().map(|r| r["name"].clone()).collect();
    let details: Vec<Value> = repos
        .iter()
        .map(|r| {
            json!({
                "name": r["name"], "fullName": r["full_name"], "description": or(r, "description", "".into()),
                "language": or(r, "language", "".into()), "stars": or(r, "stargazers_count", 0.into()),
                "forks": or(r, "forks_count", 0.into()), "isPrivate": truthy(&r["private"]), "isFork": truthy(&r["fork"]),
                "isArchived": truthy(&r["archived"]), "pushedAt": or(r, "pushed_at", Value::Null),
            })
        })
        .collect();
    json!({ "success": true, "data": names, "repos": details })
}

/// The account's repos; private ones only when `private` and the token belongs to that account.
async fn fetch_repos(state: &AppState, username: &str, token: Option<&str>, private: bool) -> Option<Vec<Value>> {
    let mut url = reqwest::Url::parse("https://api.github.com/users").ok()?;
    // A username is one path segment, whatever it holds.
    url.path_segments_mut().ok()?.push(username).push("repos");
    url.set_query(Some("per_page=100&sort=updated&type=public"));
    if private && token.is_some() {
        let identity = api_json(api_get(state, "https://api.github.com/user", token).await).await;
        if identity.is_some_and(|i| i["login"].as_str().is_some_and(|l| l.eq_ignore_ascii_case(username))) {
            let own = api_json(api_get(state, "https://api.github.com/user/repos?per_page=100&sort=updated&type=all", token).await).await;
            if let Some(Value::Array(repos)) = own {
                return Some(repos);
            }
        }
    }
    let mut response = api_get(state, url.as_str(), token).await;
    if response.as_ref().is_ok_and(|r| r.status() == 401) && token.is_some() {
        response = api_get(state, url.as_str(), None).await;
    }
    match api_json(response).await {
        Some(Value::Array(repos)) => Some(repos),
        _ => None,
    }
}

/// `GET /api/github/config`: public (the site reads the account name). With `?mode=repos`, the repo list; private
/// repos only for the signed-in admin.
pub async fn config(State(state): State<AppState>, RawQuery(q): RawQuery, headers: HeaderMap) -> Response {
    let params = query_map(&q);
    let result: anyhow::Result<Response> = async {
        let mut config = pages::try_singleton(&state.db, GITHUB.table, false).await?;
        if config.is_null() {
            let defaults = json!({ "username": "", "enabled": false });
            config = write::upsert_singleton(&state.db, &GITHUB, defaults.as_object().unwrap_or(&Map::new())).await?;
        }
        let token = match secret(&state, "encryptedGithubToken").await? {
            Some(sealed) => state.cipher.decrypt(&sealed),
            None => std::env::var("GITHUB_TOKEN").ok(),
        }
        .filter(|t| !t.is_empty());
        let has_webhook_secret = secret(&state, "encryptedGithubWebhookSecret").await?.is_some();

        if params.get("mode").map(String::as_str) == Some("repos") && truthy(&config["username"]) {
            let wanted = params.get("includePrivate").map_or_else(|| truthy(&config["includePrivate"]), |v| v == "true");
            let private = wanted && signed_in(&state, &headers).await;
            if let Some(repos) = fetch_repos(&state, &js_string(&config["username"]), token.as_deref(), private).await {
                return Ok(ok(repo_list(repos)));
            }
        }

        let token_status = match &token {
            None => "missing",
            Some(token) => match api_get(&state, "https://api.github.com/user", Some(token)).await {
                Ok(r) if r.status().is_success() => "valid",
                Ok(_) => "invalid",
                Err(_) => "unknown",
            },
        };
        if let Value::Object(data) = &mut config {
            data.insert("tokenStatus".into(), token_status.into());
            data.insert("hasToken".into(), token.is_some().into());
            data.insert("hasWebhookSecret".into(), has_webhook_secret.into());
        }
        Ok(ok(json!({ "success": true, "data": config })))
    }
    .await;
    result.unwrap_or_else(|err| {
        log_error("/api/github/config", &err);
        failure(StatusCode::INTERNAL_SERVER_ERROR, "Failed to fetch configuration")
    })
}

/// `PUT /api/github/config`
pub async fn put_config(State(state): State<AppState>, req: Request) -> Response {
    let (parts, body) = req.into_parts();
    if !signed_in(&state, &parts.headers).await {
        return refused();
    }
    let Some(body) = write::json_body(body).await.filter(|b| !b.is_null()) else {
        return failure(StatusCode::INTERNAL_SERVER_ERROR, "Invalid JSON body");
    };
    if body.get("username").is_some_and(|u| !u.is_string()) {
        return failure(StatusCode::BAD_REQUEST, "Invalid username");
    }
    let result: anyhow::Result<Response> = async {
        let existing = pages::try_singleton(&state.db, GITHUB.table, false).await?;
        let mut patch = Map::new();
        for key in ["username", "includePrivate", "hiddenRepos"] {
            if let Some(v) = body.get(key) {
                patch.insert(key.into(), v.clone());
            }
        }
        if let Some(sections) = body.get("sections") {
            let mut merged = existing["sections"].as_object().cloned().unwrap_or_default();
            merged.extend(sections.as_object().cloned().unwrap_or_default());
            patch.insert("sections".into(), merged.into());
        }
        // `enabled` defaults to true on the first save.
        match body.get("enabled") {
            Some(enabled) => patch.insert("enabled".into(), enabled.clone()),
            None if existing.is_null() => patch.insert("enabled".into(), true.into()),
            None => None,
        };
        // Secrets live encrypted on the Config row; an empty one clears it.
        let seal = |column: &str, value: Option<String>| {
            let sealed = value.and_then(|v| state.cipher.encrypt(&v)).unwrap_or_default();
            Map::from_iter([(column.to_string(), Value::from(sealed))])
        };
        if let Some(token) = body.get("githubToken") {
            anyhow::ensure!(!truthy(token) || token.is_string(), "githubToken must be a string");
            let patch = seal("encryptedGithubToken", token.as_str().map(str::to_string));
            write::upsert_singleton(&state.db, &crate::admin_site::CONFIG, &patch).await?;
            write::notify(&state, json!({ "prefixes": ["db:github", "db:config"] })).await;
        }
        if let Some(webhook) = body.get("webhookSecret") {
            let Some(webhook) = webhook.as_str() else { return Ok(failure(StatusCode::BAD_REQUEST, "Invalid webhook secret")) };
            let patch = seal("encryptedGithubWebhookSecret", Some(webhook.trim().to_string()));
            write::upsert_singleton(&state.db, &crate::admin_site::CONFIG, &patch).await?;
            write::notify(&state, json!({ "prefixes": ["db:config"] })).await;
        }
        let saved = write::upsert_singleton(&state.db, &GITHUB, &patch).await?;
        write::notify(&state, json!({ "prefixes": ["db:github"] })).await;
        Ok(ok(json!({ "success": true, "data": saved })))
    }
    .await;
    result.unwrap_or_else(|err| {
        log_error("/api/github/config", &err);
        failure(StatusCode::INTERNAL_SERVER_ERROR, &err.to_string())
    })
}

// ── sync ───────────────────────────────────────────────────────────────────────────────────────────────

/// The requested repos as "owner/repo" of the configured account, and the ones that are not its own.
fn resolve_names(requested: &[Value], username: &str) -> (Vec<String>, Vec<String>) {
    let owner = username.trim().to_lowercase();
    let (mut names, mut rejected, mut seen) = (Vec::new(), Vec::new(), Vec::new());
    for entry in requested {
        let value = if truthy(entry) { js_string(entry) } else { String::new() };
        let value = value.trim().trim_matches('/');
        if value.is_empty() {
            continue;
        }
        let (who, repo) = match value.split('/').collect::<Vec<_>>()[..] {
            [repo] => (owner.as_str(), repo),
            [who, repo] => (who, repo),
            _ => ("", ""),
        };
        if repo.is_empty() || who.to_lowercase() != owner {
            rejected.push(value.to_string());
            continue;
        }
        let full = format!("{who}/{repo}");
        if !seen.contains(&full.to_lowercase()) {
            seen.push(full.to_lowercase());
            names.push(full);
        }
    }
    (names, rejected)
}

struct Selection {
    names: Vec<String>,
    rejected: Vec<String>,
    token: Option<String>,
}

/// The checks both the preview and the sync make; the error is the reply.
async fn selection(state: &AppState, requested: &[Value]) -> anyhow::Result<Result<Selection, Response>> {
    let bad = |message: &str| Ok(Err(failure(StatusCode::BAD_REQUEST, message)));
    let config = pages::try_singleton(&state.db, GITHUB.table, false).await?;
    if !truthy(&config["username"]) {
        return bad("GitHub username not configured");
    }
    if requested.is_empty() {
        return bad("No repositories selected");
    }
    if requested.len() > MAX_REPOS_PER_SYNC {
        return bad(&format!("Select at most {MAX_REPOS_PER_SYNC} repositories per sync"));
    }
    let (mut names, rejected) = resolve_names(requested, &js_string(&config["username"]));
    if names.is_empty() {
        let body = json!({ "success": false, "error": "No repositories belonging to the configured account were selected", "rejected": rejected });
        return Ok(Err(json_status(StatusCode::BAD_REQUEST, body)));
    }
    // The dashboard's hidden list governs sync too.
    let hidden = github_sync::hidden(&config);
    names.retain(|n| !n.split('/').nth(1).is_some_and(|r| hidden.contains(&r.to_lowercase())));
    Ok(Ok(Selection { names, rejected, token: github_sync::token(state).await? }))
}

fn sync_failed(err: anyhow::Error) -> Response {
    log_error("/api/github/sync", &err);
    failure(StatusCode::INTERNAL_SERVER_ERROR, "Sync failed")
}

/// `GET /api/github/sync?repo=...`: what a sync would change, without writing.
pub async fn preview(State(state): State<AppState>, RawQuery(q): RawQuery, headers: HeaderMap) -> Response {
    if !signed_in(&state, &headers).await {
        return refused();
    }
    let requested: Vec<Value> = url::form_urlencoded::parse(q.unwrap_or_default().as_bytes()).filter(|(k, _)| k == "repo").map(|(_, v)| v.into_owned().into()).collect();
    let selection = match selection(&state, &requested).await {
        Ok(Ok(s)) => s,
        Ok(Err(reply)) => return reply,
        Err(err) => return sync_failed(err),
    };
    let token = selection.token.as_deref();
    let mut results = Vec::new();
    for name in &selection.names {
        let one: Result<Value, String> = async {
            let repo = github_sync::fetch_repo(&state, name, token).await.map_err(|e| e.message)?;
            let existing = github_sync::linked_project(&state, name).await.map_err(|e| e.to_string())?;
            let incoming = github_sync::map_repo(&repo, Utc::now());
            let (mut changes, pinned) = github_sync::diff(&existing, &incoming);
            // The README is read only when it could give the project a picture.
            if !truthy(&existing["image"]) && !pinned.iter().any(|p| p == "image") {
                let branch = repo["default_branch"].as_str().filter(|b| !b.is_empty()).unwrap_or("main").to_string();
                let readme = github_sync::fetch_readme(&state, name, token, &branch).await;
                if let Some(image) = readme.as_deref().and_then(github_sync::readme_image) {
                    changes.push(json!({ "field": "image", "from": existing["image"], "to": image }));
                }
            }
            let status = if existing.is_null() { "new" } else { "linked" };
            Ok(json!({ "repo": name, "status": status, "projectId": existing["_id"], "changes": changes, "pinned": pinned }))
        }
        .await;
        results.push(one.unwrap_or_else(|error| json!({ "repo": name, "status": "error", "error": error })));
    }
    ok(json!({ "success": true, "data": results }))
}

/// `POST /api/github/sync` with `{ repos: [...] }` or `{ repo }`.
pub async fn run_sync(State(state): State<AppState>, req: Request) -> Response {
    let (parts, body) = req.into_parts();
    if !signed_in(&state, &parts.headers).await {
        return refused();
    }
    let body = write::json_body(body).await.unwrap_or(Value::Null);
    let requested = match body["repos"].as_array() {
        Some(repos) => repos.clone(),
        None if truthy(&body["repo"]) => vec![body["repo"].clone()],
        None => vec![],
    };
    let selection = match selection(&state, &requested).await {
        Ok(Ok(s)) => s,
        Ok(Err(reply)) => return reply,
        Err(err) => return sync_failed(err),
    };
    let results = github_sync::sync(&state, &selection.names, selection.token.as_deref(), false).await;
    let count = |s: &str| results.iter().filter(|r| r["status"] == s).count();
    let summary = json!({ "created": count("created"), "updated": count("updated"), "failed": count("error") });
    ok(json!({ "success": true, "data": { "results": results, "rejected": selection.rejected, "summary": summary } }))
}

// ── webhook ────────────────────────────────────────────────────────────────────────────────────────────

/// Events that can change what a project card shows.
const SYNC_EVENTS: [&str; 8] = ["push", "repository", "release", "star", "fork", "create", "delete", "public"];

fn signature_matches(body: &[u8], header: &str, secret: &str) -> bool {
    let Ok(mut mac) = Hmac::<Sha256>::new_from_slice(secret.as_bytes()) else { return false };
    mac.update(body);
    constant_time_eq(header, &format!("sha256={}", hex::encode(mac.finalize().into_bytes())))
}

/// `POST /api/github/webhook`: GitHub cannot sign in, so every delivery must carry a valid body signature. Only
/// repos already linked to a project are synced.
pub async fn webhook(State(state): State<AppState>, req: Request) -> Response {
    let failed = |err: anyhow::Error| {
        log_error("/api/github/webhook", &err);
        failure(StatusCode::INTERNAL_SERVER_ERROR, "Webhook failed")
    };
    let secret = match secret(&state, "encryptedGithubWebhookSecret").await {
        Ok(sealed) => sealed.and_then(|s| state.cipher.decrypt(&s)).filter(|s| !s.is_empty()),
        Err(err) => return failed(err),
    };
    let Some(secret) = secret else { return failure(StatusCode::SERVICE_UNAVAILABLE, "Webhook secret not configured") };
    let (parts, body) = req.into_parts();
    let head = |name: &str| parts.headers.get(name).and_then(|v| v.to_str().ok()).unwrap_or("").to_string();
    let signature = head("x-hub-signature-256");
    let invalid = || failure(StatusCode::UNAUTHORIZED, "Invalid signature");
    // No signature, no reason to read the body.
    if !signature.starts_with("sha256=") {
        return invalid();
    }
    let Ok(raw) = axum::body::to_bytes(body, WEBHOOK_LIMIT).await else { return invalid() };
    if !signature_matches(&raw, &signature, &secret) {
        return invalid();
    }
    let event = head("x-github-event");
    if event == "ping" {
        return ok(json!({ "success": true, "data": { "event": event, "message": "pong" } }));
    }
    let skipped = |why: &str| ok(json!({ "success": true, "data": { "event": event, "skipped": why } }));
    if !SYNC_EVENTS.contains(&event.as_str()) {
        return skipped("event not relevant");
    }
    let Ok(payload) = serde_json::from_slice::<Value>(&raw) else { return failure(StatusCode::BAD_REQUEST, "Invalid JSON payload") };
    let full_name = &payload["repository"]["full_name"];
    if !truthy(full_name) {
        return skipped("no repository in payload");
    }
    let full_name = js_string(full_name);
    // GitHub keeps the owner's casing; the stored name may differ.
    let linked: Result<Option<String>, sqlx::Error> =
        sqlx::query_scalar(r#"SELECT "repoFullName" FROM "Project" WHERE lower("repoFullName") = lower($1) LIMIT 1"#)
            .bind(&full_name)
            .fetch_optional(&state.db)
            .await;
    let repo = match linked {
        Ok(Some(repo)) => repo,
        Ok(None) => {
            return ok(json!({ "success": true, "data": { "event": event, "repo": full_name, "skipped": "repository not linked to a project" } }));
        }
        Err(err) => return failed(err.into()),
    };
    // GitHub gives up after 10 s: answer now, sync afterwards.
    let (background, name, kind) = (state.clone(), repo.clone(), event.clone());
    tokio::spawn(async move {
        let token = github_sync::token(&background).await.unwrap_or_default();
        let results = github_sync::sync(&background, std::slice::from_ref(&name), token.as_deref(), false).await;
        let status = results.first().and_then(|r| r["status"].as_str()).unwrap_or("none");
        tracing::info!(event = %kind, repo = %name, status, "webhook sync");
    });
    json_status(StatusCode::ACCEPTED, json!({ "success": true, "data": { "event": event, "repo": repo, "queued": true } }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_the_accounts_own_repos_are_selected() {
        let asked = [json!("a"), json!("/Me/b/"), json!("me/B"), json!("other/c"), json!("x/y/z"), json!(""), json!(null)];
        let (names, rejected) = resolve_names(&asked, " Me ");
        assert_eq!(names, ["me/a", "Me/b"]);
        assert_eq!(rejected, ["other/c", "x/y/z"]);
    }

    #[test]
    fn webhook_signatures_follow_github() {
        // node -e "console.log(require('crypto').createHmac('sha256','s').update('body').digest('hex'))"
        let good = "sha256=42b8bcd495dedaa647a9447f9bf55ad006326c2ab94ab26360ac9935a4340f95";
        assert!(signature_matches(b"body", good, "s"));
        assert!(!signature_matches(b"body!", good, "s") && !signature_matches(b"body", good, "t") && !signature_matches(b"body", "sha256=", "s"));
    }

    #[test]
    fn private_repos_list_first() {
        let out = repo_list(vec![json!({ "name": "a", "private": false }), json!({ "name": "b", "private": true, "stargazers_count": 3 })]);
        assert_eq!(out["data"], json!(["b", "a"]));
        assert_eq!((out["repos"][0]["stars"].clone(), out["repos"][1]["description"].clone()), (json!(3), json!("")));
    }
}
