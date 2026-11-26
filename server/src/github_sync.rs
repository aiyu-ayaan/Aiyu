//! GitHub repository → Project sync: the policy of src/lib/githubProjects.js (what a repo maps to, what a sync may
//! overwrite, how README links are made absolute) and the writes of src/lib/githubProjectSync.js. A sync never
//! touches a field the admin has pinned.

use chrono::{DateTime, Datelike, SecondsFormat, Utc};
use regex::{Captures, Regex};
use serde_json::{Map, Value, json};
use std::{sync::LazyLock, time::Duration};

use crate::{
    AppState,
    admin_content::PROJECT,
    api::truthy,
    github,
    pages::{self, generate_slug},
    site_api::js_string,
    write,
};

const API: &str = "https://api.github.com";
const RAW: &str = "https://raw.githubusercontent.com";
const WEB: &str = "https://github.com";
/// README_MAX_CHARS, in UTF-16 units as JavaScript counts.
const README_MAX: usize = 120_000;

/// Fields a sync may write (SYNCABLE_FIELDS); `image` is only ever seeded.
const SYNCABLE: [&str; 7] = ["name", "description", "techStack", "year", "status", "projectType", "codeLink"];
const STOPWORDS: [&str; 12] =
    ["hacktoberfest", "awesome", "awesome-list", "portfolio", "demo", "example", "examples", "tutorial", "boilerplate", "starter", "template", "sample"];
const CONNECTORS: [&str; 11] = ["to", "of", "in", "on", "for", "and", "the", "a", "an", "at", "by"];

// ── mapping ────────────────────────────────────────────────────────────────────────────────────────────

/// `value || fallback` as text.
fn text_or(v: &Value, fallback: &str) -> String {
    if truthy(v) { js_string(v) } else { fallback.to_string() }
}

fn list(v: &Value) -> &[Value] {
    v.as_array().map(Vec::as_slice).unwrap_or_default()
}

/// "text-to-speech" → "Text to Speech": short words are nearly always acronyms, except the connectors.
fn humanize(topic: &str) -> String {
    topic
        .split('-')
        .filter(|w| !w.is_empty())
        .map(|word| {
            if word.encode_utf16().count() <= 3 && !CONNECTORS.contains(&word) {
                return word.to_uppercase();
            }
            let mut chars = word.chars();
            chars.next().map(|f| f.to_uppercase().chain(chars).collect()).unwrap_or_default()
        })
        .collect::<Vec<_>>()
        .join(" ")
}

fn tech_stack(repo: &Value) -> Vec<String> {
    let mut stack: Vec<String> = Vec::new();
    if truthy(&repo["language"]) {
        stack.push(js_string(&repo["language"]));
    }
    for topic in list(&repo["topics"]) {
        let topic = text_or(topic, "").trim().to_lowercase();
        if topic.is_empty() || STOPWORDS.contains(&topic.as_str()) {
            continue;
        }
        let label = humanize(&topic);
        if !stack.iter().any(|s| s.to_lowercase() == label.to_lowercase()) {
            stack.push(label);
        }
        if stack.len() >= 8 {
            break;
        }
    }
    stack
}

/// The first of the named dates that is set; None when none is, or it cannot be read.
fn date(repo: &Value, keys: &[&str]) -> Option<DateTime<Utc>> {
    let value = keys.iter().map(|k| &repo[*k]).find(|v| truthy(v))?;
    DateTime::parse_from_rfc3339(value.as_str()?).ok().map(|d| d.to_utc())
}

/// "2021 - 2025" for a repo still pushed to, one year when created and last pushed in it.
fn year(repo: &Value, now: DateTime<Utc>) -> String {
    let created = date(repo, &["created_at"]).map(|d| d.year()).filter(|y| *y > 1970);
    let Some(created) = created else { return now.year().to_string() };
    match date(repo, &["pushed_at", "updated_at"]).map(|d| d.year()) {
        Some(pushed) if pushed > created => format!("{created} - {pushed}"),
        _ => created.to_string(),
    }
}

fn status(repo: &Value, now: DateTime<Utc>) -> &'static str {
    if truthy(&repo["archived"]) {
        return "Done";
    }
    let Some(pushed) = date(repo, &["pushed_at", "updated_at"]).filter(|d| d.timestamp_millis() > 0) else { return "Deferred" };
    let days = (now - pushed).num_milliseconds() as f64 / 86_400_000.0;
    if days <= 120.0 {
        "Working"
    } else if days <= 365.0 {
        "Done"
    } else {
        "Deferred"
    }
}

fn project_type(repo: &Value) -> &'static str {
    if truthy(&repo["fork"]) {
        return "Fork";
    }
    let topics: Vec<String> = list(&repo["topics"]).iter().map(|t| js_string(t).to_lowercase()).collect();
    let has = |names: &[&str]| names.iter().any(|n| topics.iter().any(|t| t == n));
    if has(&["library", "sdk"]) {
        "Library"
    } else if has(&["cli"]) {
        "CLI"
    } else if has(&["android", "ios", "mobile"]) {
        "Mobile"
    } else if truthy(&repo["homepage"]) {
        "Web"
    } else {
        "Open Source"
    }
}

/// `Number(v) || 0`
fn count(v: &Value) -> Value {
    match v {
        Value::Number(_) => v.clone(),
        Value::String(s) => s.trim().parse::<i64>().unwrap_or(0).into(),
        Value::Bool(true) => 1.into(),
        _ => 0.into(),
    }
}

/// `Project.repoData`: a whitelist of the GitHub payload, for display.
pub fn repo_data(repo: &Value) -> Value {
    let spdx = &repo["license"]["spdx_id"];
    let license = if truthy(spdx) && spdx != "NOASSERTION" { spdx.clone() } else { text_or(&repo["license"]["name"], "").into() };
    let watchers = if repo["subscribers_count"].is_null() { &repo["watchers_count"] } else { &repo["subscribers_count"] };
    let or = |k: &str, fallback: Value| if truthy(&repo[k]) { repo[k].clone() } else { fallback };
    json!({
        "fullName": or("full_name", "".into()),
        "htmlUrl": or("html_url", "".into()),
        "homepage": or("homepage", "".into()),
        "stars": count(&repo["stargazers_count"]),
        "forks": count(&repo["forks_count"]),
        "watchers": count(watchers),
        "openIssues": count(&repo["open_issues_count"]),
        "language": or("language", "".into()),
        "topics": list(&repo["topics"]).iter().take(12).cloned().collect::<Vec<_>>(),
        "license": license,
        "defaultBranch": or("default_branch", "main".into()),
        "isArchived": truthy(&repo["archived"]),
        "isFork": truthy(&repo["fork"]),
        "isPrivate": truthy(&repo["private"]),
        "pushedAt": or("pushed_at", Value::Null),
        "createdAt": or("created_at", Value::Null),
    })
}

/// The syncable fields of a Project, as the repo describes them.
pub fn map_repo(repo: &Value, now: DateTime<Utc>) -> Map<String, Value> {
    let or = |k: &str| if truthy(&repo[k]) { repo[k].clone() } else { "".into() };
    [
        ("name", or("name")),
        ("description", or("description")),
        ("techStack", json!(tech_stack(repo))),
        ("year", year(repo, now).into()),
        ("status", status(repo, now).into()),
        ("projectType", project_type(repo).into()),
        ("codeLink", or("html_url")),
    ]
    .into_iter()
    .map(|(k, v)| (k.to_string(), v))
    .collect()
}

fn pins(existing: &Value) -> Vec<&str> {
    list(&existing["pinnedFields"]).iter().filter_map(Value::as_str).collect()
}

/// What a sync may write over `existing`: unpinned syncable fields the repo has a value for.
pub fn merge(existing: &Value, incoming: &Map<String, Value>) -> Map<String, Value> {
    let pinned = pins(existing);
    SYNCABLE
        .iter()
        .filter(|f| !pinned.contains(f))
        .filter_map(|&field| {
            let value = incoming.get(field)?;
            let empty = value.is_null() || value.as_str().is_some_and(|s| s.trim().is_empty()) || value.as_array().is_some_and(Vec::is_empty);
            (!empty).then(|| (field.to_string(), value.clone()))
        })
        .collect()
}

/// What a sync would change, for the admin's preview.
pub fn diff(existing: &Value, incoming: &Map<String, Value>) -> (Vec<Value>, Vec<Value>) {
    let changes = merge(existing, incoming)
        .into_iter()
        .filter(|(field, next)| {
            let current = &existing[field.as_str()];
            if next.is_array() { !(current == next || (!truthy(current) && list(next).is_empty())) } else { existing.is_null() || current != next }
        })
        .map(|(field, next)| json!({ "field": field, "from": existing[field.as_str()], "to": next }))
        .collect();
    let pinned = list(&existing["pinnedFields"]).to_vec();
    (changes, pinned)
}

// ── README ─────────────────────────────────────────────────────────────────────────────────────────────

fn regex(pattern: &str) -> Regex {
    Regex::new(pattern).expect("constant pattern")
}

static INLINE_LINK: LazyLock<Regex> = LazyLock::new(|| regex(r"(!?)\[([^\]]*)\]\(\s*([^)\s]+)([^)]*)\)"));
static REFERENCE_LINK: LazyLock<Regex> = LazyLock::new(|| regex(r"(?m)^(\s*\[[^\]]+\]:\s*)(\S+)"));
static HTML_ATTRIBUTE: LazyLock<Regex> = LazyLock::new(|| regex(r#"(?i)(?-u:\b)(src|href)=(?:"([^"']+)"|'([^"']+)')"#));
static ASSET: LazyLock<Regex> = LazyLock::new(|| regex(r"(?i)\.(png|jpe?g|gif|svg|webp|avif|bmp|ico|mp4|webm|mov)(\?.*)?$"));
static ABSOLUTE: LazyLock<Regex> = LazyLock::new(|| regex(r"(?i)^((https?:)?//|#|[a-z][a-z0-9+.-]*:)"));

fn is_absolute(url: &str) -> bool {
    let url = url.trim();
    url.is_empty() || ABSOLUTE.is_match(url)
}

fn is_asset(url: &str) -> bool {
    ASSET.is_match(url.trim())
}

/// A relative README path on GitHub: images from the raw host, everything else on the rendered file view.
fn resolve(url: &str, repo: &str, branch: &str, asset: bool) -> String {
    let path = url.trim();
    let path = path.strip_prefix("./").unwrap_or(path).trim_start_matches('/');
    if path.is_empty() {
        url.to_string()
    } else if asset {
        format!("{RAW}/{repo}/{branch}/{path}")
    } else {
        format!("{WEB}/{repo}/blob/{branch}/{path}")
    }
}

/// `absolutizeReadmeUrls`: relative links would resolve against this site and break.
pub fn absolutize(markdown: &str, repo: &str, branch: &str) -> String {
    if markdown.is_empty() || repo.is_empty() {
        return markdown.to_string();
    }
    let out = INLINE_LINK.replace_all(markdown, |c: &Captures| {
        let (bang, text, url, tail) = (&c[1], &c[2], &c[3], &c[4]);
        if is_absolute(url) {
            return c[0].to_string();
        }
        format!("{bang}[{text}]({}{tail})", resolve(url, repo, branch, bang == "!" || is_asset(url)))
    });
    let out = REFERENCE_LINK.replace_all(&out, |c: &Captures| {
        if is_absolute(&c[2]) {
            return c[0].to_string();
        }
        format!("{}{}", &c[1], resolve(&c[2], repo, branch, is_asset(&c[2])))
    });
    HTML_ATTRIBUTE
        .replace_all(&out, |c: &Captures| {
            let (quote, url) = match c.get(2) {
                Some(m) => ('"', m.as_str()),
                None => ('\'', &c[3]),
            };
            if is_absolute(url) {
                return c[0].to_string();
            }
            let asset = c[1].eq_ignore_ascii_case("src") || is_asset(url);
            format!("{}={quote}{}{quote}", &c[1], resolve(url, repo, branch, asset))
        })
        .into_owned()
}

const BADGE_HOSTS: [&str; 31] = [
    "img.shields.io", "shields.io", "badgen.net", "badge.fury.io", "travis-ci.org", "travis-ci.com", "api.travis-ci.com",
    "ci.appveyor.com", "codecov.io", "coveralls.io", "snyk.io", "api.codeclimate.com", "david-dm.org", "forthebadge.com",
    "sonarcloud.io", "api.netlify.com", "maven-badges.herokuapp.com", "isitmaintained.com",
    "bestpractices.coreinfrastructure.org", "deepsource.io", "app.fossa.com", "badge.buildkite.com", "hits.seeyoufarm.com",
    "visitor-badge.laobi.icu", "visitor-badge.glitch.me", "komarev.com", "img.buymeacoffee.com", "www.herokucdn.com",
    "deploy.cloud.run", "gitpod.io", "vercel.com",
];
const MORE_BADGE_HOSTS: [&str; 4] = ["railway.app", "opencollective.com", "jitpack.io", "poser.pugx.org"];

static BADGE_PATH: LazyLock<Regex> = LazyLock::new(|| {
    regex(r"(?i)/badge(s)?(?-u:\b)|badge\.(svg|png)$|/actions/workflows/|/workflows/[^/]+/badge|/button\.(svg|png)$|/shield")
});
static BADGE_ALT: LazyLock<Regex> = LazyLock::new(|| {
    regex(r"(?i)(?-u:\b)(badge|shield|build|ci|cd|pipeline|coverage|codecov|licen[cs]e|version|downloads?|stars?|forks?|issues?|release|npm|pypi|maven|gradle|jitpack|sponsor|donate|patreon|discord|twitter|slack|gitter|contributors?)(?-u:\b)")
});
static MARKDOWN_IMAGE: LazyLock<Regex> = LazyLock::new(|| regex(r"!\[([^\]]*)\]\(\s*([^)\s]+)[^)]*\)"));
static IMG_TAG: LazyLock<Regex> = LazyLock::new(|| regex(r"(?i)<img(?-u:\b)[^>]*>"));
static IMG_SRC: LazyLock<Regex> = LazyLock::new(|| regex(r#"(?i)(?-u:\b)src=(?:"([^"']+)"|'([^"']+)')"#));
static IMG_ALT: LazyLock<Regex> = LazyLock::new(|| regex(r#"(?i)(?-u:\b)alt=(?:"([^"']*)"|'([^"']*)')"#));
static HERO: LazyLock<Regex> = LazyLock::new(|| regex(r"(?i)\.(png|jpe?g|gif|webp|avif)(\?.*)?$"));

fn is_badge(url: &str, alt: &str) -> bool {
    let Ok(parsed) = reqwest::Url::parse(url.trim()) else { return true };
    let host = parsed.host_str().unwrap_or("").to_ascii_lowercase();
    BADGE_HOSTS.contains(&host.as_str()) || MORE_BADGE_HOSTS.contains(&host.as_str()) || BADGE_PATH.is_match(parsed.path()) || BADGE_ALT.is_match(alt)
}

/// The first picture of an absolutized README that is not a badge.
pub fn readme_image(markdown: &str) -> Option<String> {
    let quoted = |re: &Regex, tag: &str| re.captures(tag).and_then(|c| c.get(1).or_else(|| c.get(2)).map(|m| m.as_str().to_string()));
    let mut candidates: Vec<(usize, String, String)> =
        MARKDOWN_IMAGE.captures_iter(markdown).map(|c| (c.get(0).map_or(0, |m| m.start()), c[1].to_string(), c[2].to_string())).collect();
    for tag in IMG_TAG.find_iter(markdown) {
        let Some(src) = quoted(&IMG_SRC, tag.as_str()) else { continue };
        candidates.push((tag.start(), quoted(&IMG_ALT, tag.as_str()).unwrap_or_default(), src));
    }
    candidates.sort_by_key(|c| c.0);
    candidates.into_iter().find(|(_, alt, url)| HERO.is_match(url) && !is_badge(url, alt)).map(|c| c.2)
}

/// A poster for a project that has none (and has not pinned having none).
fn seed_image(existing: &Value, readme: Option<&str>) -> Option<String> {
    if truthy(&existing["image"]) || pins(existing).contains(&"image") {
        return None;
    }
    readme_image(readme?)
}

/// `truncateReadme`: cut at a line end, so markdown is never split inside a fence.
pub fn truncate(markdown: &str, max: usize) -> String {
    let mut units = 0;
    let cut = markdown.char_indices().find_map(|(i, c)| {
        units += c.len_utf16();
        (units > max).then_some(i)
    });
    let Some(cut) = cut else { return markdown.to_string() };
    let clipped = &markdown[..cut];
    let body = match clipped.rfind('\n') {
        Some(at) if clipped[..at].encode_utf16().count() * 2 > max => &clipped[..at],
        _ => clipped,
    };
    format!("{body}\n\n*(README truncated.)*")
}

// ── network ────────────────────────────────────────────────────────────────────────────────────────────

/// A GitHub API failure with the message the admin sees.
#[derive(Debug)]
pub struct FetchError {
    pub status: Option<u16>,
    pub message: String,
}

fn env_ms(name: &str, default: u64) -> Duration {
    Duration::from_millis(std::env::var(name).ok().and_then(|v| v.trim().parse().ok()).unwrap_or(default))
}

/// `owner/repo` with only the characters GitHub allows, so a name cannot reach another API path.
fn safe_name(full_name: &str) -> bool {
    let part = |p: &str| !p.is_empty() && p != "." && p != ".." && p.chars().all(|c| c.is_ascii_alphanumeric() || "-_.".contains(c));
    full_name.split_once('/').is_some_and(|(owner, repo)| part(owner) && part(repo))
}

fn request(state: &AppState, url: String, token: Option<&str>, accept: &str) -> reqwest::RequestBuilder {
    let mut r = state.http.get(url).header("accept", accept).header("user-agent", "Portfolio-App").header("x-github-api-version", "2022-11-28");
    if let Some(token) = token.filter(|t| !t.is_empty()) {
        r = r.header("authorization", format!("token {token}"));
    }
    r
}

pub async fn fetch_repo(state: &AppState, full_name: &str, token: Option<&str>) -> Result<Value, FetchError> {
    let failed = |status: u16| FetchError { status: Some(status), message: format!("GitHub repo fetch failed ({status})") };
    if !safe_name(full_name) {
        return Err(failed(404));
    }
    let req = request(state, format!("{API}/repos/{full_name}"), token, "application/vnd.github+json");
    let upstream = |message| FetchError { status: None, message };
    let res = github::guarded(req, Some(env_ms("GITHUB_UPSTREAM_TIMEOUT_MS", 2_500))).await.map_err(|e| upstream(e.message))?;
    let code = res.status().as_u16();
    if !res.status().is_success() {
        let header = |name: &str| res.headers().get(name).and_then(|v| v.to_str().ok()).unwrap_or("").to_string();
        // A bare "403" hides the usual cause: 60 requests an hour without a token.
        if (code == 403 || code == 429) && header("x-ratelimit-remaining") == "0" {
            let until = header("x-ratelimit-reset")
                .parse::<i64>()
                .ok()
                .filter(|s| *s > 0)
                .and_then(|s| DateTime::from_timestamp(s, 0))
                .map(|t| format!(" until {}", t.to_rfc3339_opts(SecondsFormat::Millis, true)))
                .unwrap_or_default();
            let hint = if token.is_some_and(|t| !t.is_empty()) { "" } else { " (no GitHub token configured; add one in /admin/github to raise the limit to 5000/hour)" };
            return Err(FetchError { status: Some(code), message: format!("GitHub API rate limit reached{until}{hint}") });
        }
        return Err(failed(code));
    }
    let bytes = res.bytes().await.map_err(|e| upstream(e.without_url().to_string()))?;
    serde_json::from_slice(&bytes).map_err(|e| upstream(e.to_string()))
}

/// The README as markdown, absolutized and truncated. A missing or unreachable README is None.
pub async fn fetch_readme(state: &AppState, full_name: &str, token: Option<&str>, branch: &str) -> Option<String> {
    if !safe_name(full_name) {
        return None;
    }
    let req = request(state, format!("{API}/repos/{full_name}/readme"), token, "application/vnd.github.raw");
    let res = match github::guarded(req, Some(env_ms("GITHUB_README_TIMEOUT_MS", 6_000))).await {
        Ok(r) if r.status().is_success() => r,
        Ok(_) => return None,
        Err(err) => {
            tracing::warn!(repo = full_name, error = %err.message, "README fetch failed");
            return None;
        }
    };
    let markdown = res.text().await.ok().filter(|m| !m.trim().is_empty())?;
    Some(truncate(&absolutize(&markdown, full_name, branch), README_MAX))
}

// ── persistence ────────────────────────────────────────────────────────────────────────────────────────

/// `getGithubToken`: the stored token, else `GITHUB_TOKEN`.
pub async fn token(state: &AppState) -> anyhow::Result<Option<String>> {
    let stored: Option<Option<String>> = sqlx::query_scalar(r#"SELECT "encryptedGithubToken" FROM "Config" LIMIT 1"#).fetch_optional(&state.db).await?;
    Ok(match stored.flatten().filter(|s| !s.is_empty()) {
        Some(sealed) => state.cipher.decrypt(&sealed),
        None => std::env::var("GITHUB_TOKEN").ok().map(|t| t.trim().to_string()).filter(|t| !t.is_empty()),
    })
}

/// The project row linked to exactly this repo, client-shaped; Null when there is none.
pub async fn linked_project(state: &AppState, full_name: &str) -> anyhow::Result<Value> {
    let raw: Option<String> = sqlx::query_scalar(r#"SELECT row_to_json(t)::text FROM "Project" t WHERE "repoFullName" = $1"#)
        .bind(full_name)
        .fetch_optional(&state.db)
        .await?;
    Ok(match raw {
        Some(raw) => pages::to_client_row(serde_json::from_str(&raw)?),
        None => Value::Null,
    })
}

/// `createUniqueProjectSlug`
async fn unique_slug(state: &AppState, name: &str) -> anyhow::Result<String> {
    let generated = generate_slug(name);
    let base = if generated.is_empty() { "project-entry".to_string() } else { generated };
    let mut candidate = base.clone();
    for suffix in 2.. {
        let taken: bool = sqlx::query_scalar(r#"SELECT EXISTS(SELECT 1 FROM "Project" WHERE slug = $1)"#).bind(&candidate).fetch_one(&state.db).await?;
        if !taken {
            break;
        }
        candidate = format!("{base}-{suffix}");
    }
    Ok(candidate)
}

async fn sync_one(state: &AppState, full_name: &str, token: Option<&str>, only_if_changed: bool) -> Result<Value, FetchError> {
    let db = |e: anyhow::Error| FetchError { status: None, message: e.to_string() };
    let repo = fetch_repo(state, full_name, token).await?;
    let data = repo_data(&repo);
    let incoming = map_repo(&repo, Utc::now());
    let existing = linked_project(state, full_name).await.map_err(db)?;

    // Compared as values: the stored JSON does not keep its key order.
    if only_if_changed && !existing.is_null() && existing["repoData"] == data {
        return Ok(json!({ "repo": full_name, "status": "unchanged", "projectId": existing["_id"] }));
    }
    let branch = data["defaultBranch"].as_str().unwrap_or("main").to_string();
    let readme = fetch_readme(state, full_name, token, &branch).await;
    let mut patch = merge(&existing, &incoming);
    let image = seed_image(&existing, readme.as_deref());
    if let Some(image) = &image {
        patch.insert("image".into(), image.clone().into());
    }
    let written: Vec<String> = patch.keys().cloned().collect();
    let now = Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true);
    let mut row = patch;
    row.insert("source".into(), "github".into());
    row.insert("repoFullName".into(), full_name.into());
    row.insert("repoData".into(), data);
    row.insert("syncedAt".into(), now.clone().into());
    if let Some(readme) = &readme {
        row.insert("readme".into(), readme.clone().into());
        row.insert("readmeFetchedAt".into(), now.into());
    }

    let saved = async {
        if let Some(id) = existing["_id"].as_str() {
            let data = write::prepare(&PROJECT, &Value::Object(row))?;
            return write::update(&state.db, &PROJECT, id, data).await?.ok_or_else(|| anyhow::anyhow!("project disappeared"));
        }
        // A new row needs the fields the schema requires; the admin owns them afterwards.
        let name = text_or(row.get("name").unwrap_or(&Value::Null), &text_or(&repo["name"], ""));
        let first: Option<i32> = sqlx::query_scalar(r#"SELECT min("displayOrder") FROM "Project""#).fetch_one(&state.db).await?;
        for (key, fallback) in [("description", String::new()), ("year", Utc::now().year().to_string()), ("status", "Working".into()), ("projectType", "Open Source".into())] {
            let value = text_or(row.get(key).unwrap_or(&Value::Null), &fallback);
            row.insert(key.into(), value.into());
        }
        row.insert("displayOrder".into(), first.map_or(0, |m| i64::from(m) - 1).into());
        row.insert("slug".into(), unique_slug(state, &name).await?.into());
        row.insert("name".into(), name.into());
        write::insert(&state.db, &PROJECT, write::prepare(&PROJECT, &Value::Object(row))?).await
    }
    .await
    .map_err(db)?;

    let skipped: Vec<&str> = pins(&existing).into_iter().filter(|f| incoming.contains_key(*f)).collect();
    Ok(json!({
        "repo": full_name,
        "status": if existing.is_null() { "created" } else { "updated" },
        "projectId": saved["_id"],
        "slug": pages::entity_slug(&saved, "project"),
        "readme": readme.is_some(),
        "image": image,
        "fieldsWritten": written,
        "pinnedSkipped": skipped,
    }))
}

/// `syncRepositories`: one after another; a failing repo is reported and does not stop the rest.
pub async fn sync(state: &AppState, names: &[String], token: Option<&str>, only_if_changed: bool) -> Vec<Value> {
    let mut results = Vec::new();
    for name in names {
        results.push(match sync_one(state, name, token, only_if_changed).await {
            Ok(result) => result,
            Err(err) => {
                tracing::error!(repo = %name, error = %err.message, "GitHub sync failed");
                let message = if err.status == Some(404) { "Repository not found or not visible to the configured token".into() } else { err.message };
                json!({ "repo": name, "status": "error", "error": message })
            }
        });
    }
    let mut paths: Vec<String> = Vec::new();
    for slug in results.iter().filter(|r| r["status"] == "created" || r["status"] == "updated").filter_map(|r| r["slug"].as_str()) {
        let path = format!("/projects/{slug}");
        if !paths.contains(&path) {
            paths.push(path);
        }
    }
    if !paths.is_empty() {
        paths.push("/projects".into());
        write::notify(state, json!({ "prefixes": ["db:projects"], "pings": [write::ping(&paths, "URL_UPDATED")] })).await;
    }
    results
}

/// The configured account's repos the admin has hidden, lower case.
pub fn hidden(config: &Value) -> Vec<String> {
    list(&config["hiddenRepos"]).iter().map(|n| js_string(n).to_lowercase()).collect()
}

/// `syncLinkedRepositories`: refresh every project already linked to a repo (the scheduled task).
pub async fn sync_linked(state: &AppState) -> anyhow::Result<Value> {
    let hidden = hidden(&pages::try_singleton(&state.db, "GitHub", false).await?);
    let linked: Vec<String> = sqlx::query_scalar(r#"SELECT "repoFullName" FROM "Project" WHERE source = 'github' AND "repoFullName" IS NOT NULL"#)
        .fetch_all(&state.db)
        .await?;
    let names: Vec<String> =
        linked.into_iter().filter(|n| !n.split('/').nth(1).is_some_and(|r| hidden.contains(&r.to_lowercase()))).collect();
    let token = token(state).await?;
    let results = sync(state, &names, token.as_deref(), true).await;
    let count = |s: &str| results.iter().filter(|r| r["status"] == s).count();
    let summary = json!({ "total": results.len(), "updated": count("updated"), "unchanged": count("unchanged"), "failed": count("error") });
    Ok(json!({ "results": results, "summary": summary }))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Made by scripts/perf/github-fixtures.mjs from src/lib/githubProjects.js.
    const FIXTURES: &str = include_str!("../tests/fixtures/github-projects.json");

    #[test]
    fn matches_the_javascript_policy() {
        let f: Value = serde_json::from_str(FIXTURES).unwrap();
        let now: DateTime<Utc> = f["now"].as_str().unwrap().parse().unwrap();
        for case in f["repos"].as_array().unwrap() {
            let repo = &case["repo"];
            assert_eq!(Value::Object(map_repo(repo, now)), case["project"], "{repo}");
            assert_eq!(repo_data(repo), case["data"], "{repo}");
        }
        for case in f["merges"].as_array().unwrap() {
            let (existing, incoming) = (&case["existing"], case["incoming"].as_object().unwrap());
            assert_eq!(Value::Object(merge(existing, incoming)), case["patch"], "{existing}");
            let (changes, pinned) = diff(existing, incoming);
            assert_eq!(json!({ "changes": changes, "pinned": pinned }), case["diff"], "{existing}");
        }
        for case in f["readmes"].as_array().unwrap() {
            let markdown = case["markdown"].as_str().unwrap();
            let out = absolutize(markdown, "me/repo", "dev");
            assert_eq!(out, case["absolute"].as_str().unwrap(), "{markdown}");
            assert_eq!(json!(readme_image(&out)), case["image"], "{markdown}");
        }
        for case in f["truncations"].as_array().unwrap() {
            let (text, max) = (case["text"].as_str().unwrap(), case["max"].as_u64().unwrap() as usize);
            assert_eq!(truncate(text, max), case["out"].as_str().unwrap(), "{text:?} {max}");
        }
    }

    #[test]
    fn repo_names_cannot_reach_other_paths() {
        assert!(safe_name("me/a.b_c-1"));
        for bad in ["me", "me/..", "me/a/b", "me/a?x", "me/%2e%2e", "../user", "me/"] {
            assert!(!safe_name(bad), "{bad}");
        }
    }
}
