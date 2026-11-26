//! Admin writes for the legal apps and their pages: port of src/lib/legal.js and `handleAdmin`.

use crate::db;
use axum::{
    extract::{Path, Request, State},
    http::{HeaderValue, StatusCode, header},
    response::Response,
};
use regex::Regex;
use serde_json::{Map, Value, json};
use crate::db::Db;
use std::sync::LazyLock;

use crate::{
    AppState,
    api::{error, json_status, log_error, signed_in, truthy},
    pages,
    site_api::js_string,
    write,
    write::{Kind, Table},
};

use Kind::{Bool, Int, OptText, Text};

const APP: Table = Table {
    name: "LegalApp",
    columns: &[("name", Text), ("slug", Text), ("packageName", Text), ("description", Text), ("contactEmail", Text), ("deploymentId", OptText)],
    created_at: true,
    updated_at: true,
};
const DOCUMENT: Table = Table {
    name: "LegalDocument",
    columns: &[
        ("appId", Text), ("kind", Text), ("title", Text), ("slug", Text), ("format", Text), ("content", Text), ("seoDescription", Text),
        ("effectiveDate", Text), ("published", Bool), ("noIndex", Bool), ("displayOrder", Int),
    ],
    created_at: true,
    updated_at: true,
};

/// `LEGAL_KINDS` (src/lib/legalKinds.js).
const KINDS: [(&str, &str); 8] = [
    ("privacy-policy", "Privacy Policy"), ("terms-and-conditions", "Terms & Conditions"), ("eula", "End User License Agreement"),
    ("data-deletion", "Data Deletion"), ("cookie-policy", "Cookie Policy"), ("refund-policy", "Refund Policy"),
    ("disclaimer", "Disclaimer"), ("custom", "Custom"),
];

/// Top-level paths an app slug may not take (`RESERVED_LEGAL_SLUGS`).
const RESERVED: [&str; 36] = [
    "admin", "api", "v1", "v2", "docs", "games", "desktop", "workers", "apps", "projects", "blogs", "gallery", "github", "ai", "about-me", "contact-us", "sitemap", "work-in-progress", "live-deployments", "about", "contact", "blog", "app", "project", "deployments", "uploads", "images", "public", "doom", "hf", "screenshots", "legal", "resume", "search", "login", "auth",
];

static SLUG: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"^[a-z0-9]+(-[a-z0-9]+)*$").expect("slug pattern"));
static PACKAGE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"^[A-Za-z](?-u:\w)*(\.[A-Za-z_](?-u:\w)*)+$").expect("package pattern"));

/// `LegalError`: a message the admin sees, with its status. Anything else is a 500.
#[derive(Debug)]
struct Refused(StatusCode, String);

impl std::fmt::Display for Refused {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.1)
    }
}
impl std::error::Error for Refused {}

fn refuse(status: StatusCode, message: impl Into<String>) -> anyhow::Error {
    Refused(status, message.into()).into()
}
fn invalid(message: impl Into<String>) -> anyhow::Error {
    refuse(StatusCode::BAD_REQUEST, message)
}

/// `str(value, field, { required, max })`: None when the field is absent.
fn string(input: &Value, field: &str, required: bool, max: usize) -> anyhow::Result<Option<String>> {
    let Some(value) = input.get(field).filter(|v| !v.is_null()) else {
        if required {
            return Err(invalid(format!("Missing required field: {field}")));
        }
        return Ok(None);
    };
    let s = js_string(value).trim().to_string();
    if required && s.is_empty() {
        return Err(invalid(format!("Field \"{field}\" must not be empty.")));
    }
    if s.encode_utf16().count() > max {
        return Err(invalid(format!("Field \"{field}\" exceeds {max} characters.")));
    }
    Ok(Some(s))
}

/// `String(value || '')`
fn text(value: &Value) -> String {
    if truthy(value) { js_string(value) } else { String::new() }
}

fn normalize_slug(value: &Value, fallback: &str) -> anyhow::Result<String> {
    let given = text(value).trim().to_string();
    let source = if given.is_empty() { fallback } else { &given };
    let slug = pages::generate_slug(source).replace('_', "-").trim_matches('-').to_string();
    if !SLUG.is_match(&slug) {
        return Err(invalid("Slug may only contain lowercase letters, numbers and single hyphens."));
    }
    Ok(slug)
}

fn app_slug(value: &Value, fallback: &str) -> anyhow::Result<String> {
    let slug = normalize_slug(value, fallback)?;
    if RESERVED.contains(&slug.as_str()) {
        return Err(invalid(format!("\"{slug}\" is a reserved site path. Pick another slug.")));
    }
    Ok(slug)
}

/// Package names look like reverse-DNS ids (com.example.app). Optional.
fn package_name(input: &Value) -> anyhow::Result<Option<String>> {
    let s = string(input, "packageName", false, 255)?;
    if s.as_deref().is_some_and(|s| !s.is_empty() && !PACKAGE.is_match(s)) {
        return Err(invalid("Package name must look like com.example.app."));
    }
    Ok(s)
}

/// The linked /apps entry: None to unlink.
async fn deployment_id(db: &Db, value: &Value) -> anyhow::Result<Value> {
    let id = text(value).trim().to_string();
    if id.is_empty() {
        return Ok(Value::Null);
    }
    let known: bool = sqlx::query_scalar(r#"SELECT EXISTS(SELECT 1 FROM "Deployment" WHERE id = $1)"#).bind(&id).fetch_one(db).await?;
    if !known {
        return Err(refuse(StatusCode::NOT_FOUND, "Linked app not found."));
    }
    Ok(id.into())
}

/// The app with every document, drafts included.
async fn app_with_docs(db: &Db, id: &str) -> anyhow::Result<Value> {
    let Some(mut app) = write::find(db, "LegalApp", id).await? else { return Err(refuse(StatusCode::NOT_FOUND, "Legal app not found.")) };
    let sql = format!(
        r#"SELECT {} FROM "LegalDocument" WHERE "appId" = $1 ORDER BY "displayOrder" ASC, "createdAt" DESC"#,
        db::row_json("LegalDocument")
    );
    let rows: Vec<String> = sqlx::query_scalar(&sql).bind(id).fetch_all(db).await?;
    let documents = rows.iter().map(|r| Ok(pages::to_client_row(serde_json::from_str(r)?))).collect::<anyhow::Result<Vec<_>>>()?;
    app["documents"] = documents.into();
    Ok(app)
}

/// A document with its `app`.
async fn document(db: &Db, id: &str) -> anyhow::Result<Value> {
    let Some(mut doc) = write::find(db, "LegalDocument", id).await? else { return Err(refuse(StatusCode::NOT_FOUND, "Legal page not found.")) };
    let app_id = doc["appId"].as_str().unwrap_or_default().to_string();
    doc["app"] = write::find(db, "LegalApp", &app_id).await?.unwrap_or(Value::Null);
    Ok(doc)
}

fn app_path(app: &Value) -> String {
    format!("/{}", app["slug"].as_str().unwrap_or_default())
}
fn document_path(app: &Value, doc: &Value) -> String {
    format!("{}/{}", app_path(app), doc["slug"].as_str().unwrap_or_default())
}
/// The app page and every page search engines may list.
fn app_paths(app: &Value) -> Vec<String> {
    let listed = app["documents"].as_array().into_iter().flatten().filter(|d| truthy(&d["published"]) && !truthy(&d["noIndex"]));
    std::iter::once(app_path(app)).chain(listed.map(|d| document_path(app, d))).collect()
}

/// `invalidate(paths)`: the pings for the legal pages that changed.
async fn changed(state: &AppState, updated: Vec<String>, deleted: Vec<String>) {
    let mut pings = vec![];
    for (paths, kind) in [(deleted, "URL_DELETED"), (updated, "URL_UPDATED")] {
        if !paths.is_empty() {
            pings.push(write::ping(&paths, kind));
        }
    }
    crate::indexing::auto(state, pings);
}

fn duplicate(err: anyhow::Error, message: String) -> anyhow::Error {
    if write::is_duplicate(&err) { refuse(StatusCode::CONFLICT, message) } else { err }
}

async fn create_app(state: &AppState, input: Value) -> anyhow::Result<Value> {
    let name = string(&input, "name", true, 120)?.unwrap_or_default();
    let slug = app_slug(&input["slug"], &name)?;
    let doc = json!({
        "name": name,
        "slug": slug,
        "packageName": package_name(&input)?.unwrap_or_default(),
        "description": string(&input, "description", false, 500)?.unwrap_or_default(),
        "contactEmail": string(&input, "contactEmail", false, 200)?.unwrap_or_default(),
        "deploymentId": deployment_id(&state.db, &input["deploymentId"]).await?,
    });
    let row = write::insert(&state.db, &APP, write::prepare(&APP, &doc)?)
        .await
        .map_err(|e| duplicate(e, format!("Slug \"{slug}\" is already used by another legal app.")))?;
    changed(state, vec![app_path(&row)], vec![]).await;
    app_with_docs(&state.db, row["_id"].as_str().unwrap_or_default()).await
}

async fn update_app(state: &AppState, id: &str, patch: Value) -> anyhow::Result<Value> {
    let existing = app_with_docs(&state.db, id).await?;
    let mut data = Map::new();
    let has = |k: &str| patch.get(k).is_some();
    if has("name") {
        data.insert("name".into(), string(&patch, "name", true, 120)?.into());
    }
    if has("slug") {
        let fallback = data.get("name").and_then(Value::as_str).or_else(|| existing["name"].as_str()).unwrap_or_default().to_string();
        data.insert("slug".into(), app_slug(&patch["slug"], &fallback)?.into());
    }
    if has("packageName") {
        data.insert("packageName".into(), package_name(&patch)?.unwrap_or_default().into());
    }
    for (key, max) in [("description", 500), ("contactEmail", 200)] {
        if has(key) {
            data.insert(key.into(), string(&patch, key, false, max)?.unwrap_or_default().into());
        }
    }
    if has("deploymentId") {
        data.insert("deploymentId".into(), deployment_id(&state.db, &patch["deploymentId"]).await?);
    }
    let slug = data.get("slug").and_then(Value::as_str).unwrap_or_default().to_string();
    write::update(&state.db, &APP, id, data)
        .await
        .map_err(|e| duplicate(e, format!("Slug \"{slug}\" is already used by another legal app.")))?;
    let updated = app_with_docs(&state.db, id).await?;
    let gone = if updated["slug"] != existing["slug"] { app_paths(&existing) } else { vec![] };
    changed(state, app_paths(&updated), gone).await;
    Ok(updated)
}

async fn delete_app(state: &AppState, id: &str) -> anyhow::Result<Value> {
    let existing = app_with_docs(&state.db, id).await?;
    write::delete(&state.db, "LegalApp", id).await?;
    changed(state, vec![], app_paths(&existing)).await;
    Ok(json!({ "deletedId": id }))
}

fn kind(value: &Value) -> anyhow::Result<&'static str> {
    let given = if truthy(value) { js_string(value) } else { "custom".into() };
    let given = given.trim();
    KINDS.iter().map(|(k, _)| *k).find(|k| *k == given).ok_or_else(|| invalid(format!("Unknown document kind \"{given}\".")))
}

fn format(value: &Value) -> anyhow::Result<String> {
    let f = if truthy(value) { js_string(value) } else { "markdown".into() };
    let f = f.trim().to_lowercase();
    if !matches!(f.as_str(), "markdown" | "html") {
        return Err(invalid("Format must be \"markdown\" or \"html\"."));
    }
    Ok(f)
}

/// `Math.round(Number(value))` when that is a number.
fn position(value: &Value) -> Option<i64> {
    let n = crate::admin_site::number(value);
    n.is_finite().then(|| (n + 0.5).floor() as i64)
}

const DOCUMENT_TEXTS: [(&str, usize); 3] = [("content", 500_000), ("seoDescription", 300), ("effectiveDate", 40)];

async fn create_document(state: &AppState, app_id: &str, input: Value) -> anyhow::Result<Value> {
    let app = app_with_docs(&state.db, app_id).await?;
    let doc_kind = kind(&input["kind"])?;
    let label = KINDS.iter().find(|(k, _)| *k == doc_kind).map_or("Document", |(_, l)| *l);
    let custom = doc_kind == "custom";
    let title = string(&input, "title", false, 160)?.filter(|t| !t.is_empty()).unwrap_or_else(|| if custom { String::new() } else { label.into() });
    if title.is_empty() {
        return Err(invalid("Field \"title\" must not be empty."));
    }
    // New pages go to the top.
    let top = app["documents"][0]["displayOrder"].as_i64().map_or(0, |first| first - 1);
    let wanted = input.get("displayOrder").filter(|v| !v.is_null() && v.as_str() != Some("")).and_then(position);
    let slug = normalize_slug(&input["slug"], if custom { &title } else { doc_kind })?;
    let mut doc = Map::new();
    doc.insert("appId".into(), app_id.into());
    doc.insert("kind".into(), doc_kind.into());
    doc.insert("title".into(), title.into());
    doc.insert("slug".into(), slug.clone().into());
    doc.insert("format".into(), format(&input["format"])?.into());
    for (key, max) in DOCUMENT_TEXTS {
        doc.insert(key.into(), string(&input, key, false, max)?.unwrap_or_default().into());
    }
    doc.insert("published".into(), input.get("published").map_or(true, truthy).into());
    doc.insert("noIndex".into(), truthy(&input["noIndex"]).into());
    doc.insert("displayOrder".into(), wanted.unwrap_or(top).into());
    let row = write::insert(&state.db, &DOCUMENT, write::prepare(&DOCUMENT, &Value::Object(doc))?)
        .await
        .map_err(|e| duplicate(e, format!("\"{}/{slug}\" already exists.", app["slug"].as_str().unwrap_or_default())))?;
    let paths = if truthy(&row["published"]) { vec![app_path(&app), document_path(&app, &row)] } else { vec![] };
    changed(state, paths, vec![]).await;
    Ok(row)
}

async fn update_document(state: &AppState, id: &str, patch: Value) -> anyhow::Result<Value> {
    let existing = document(&state.db, id).await?;
    let app = existing["app"].clone();
    let mut data = Map::new();
    let has = |k: &str| patch.get(k).is_some();
    if has("kind") {
        data.insert("kind".into(), kind(&patch["kind"])?.into());
    }
    if has("title") {
        data.insert("title".into(), string(&patch, "title", true, 160)?.into());
    }
    if has("slug") {
        let fallback = data.get("title").and_then(Value::as_str).or_else(|| existing["title"].as_str()).unwrap_or_default().to_string();
        data.insert("slug".into(), normalize_slug(&patch["slug"], &fallback)?.into());
    }
    if has("format") {
        data.insert("format".into(), format(&patch["format"])?.into());
    }
    for (key, max) in DOCUMENT_TEXTS {
        if has(key) {
            data.insert(key.into(), string(&patch, key, false, max)?.unwrap_or_default().into());
        }
    }
    for key in ["published", "noIndex"] {
        if has(key) {
            data.insert(key.into(), truthy(&patch[key]).into());
        }
    }
    if let Some(n) = patch.get("displayOrder").and_then(position) {
        data.insert("displayOrder".into(), n.into());
    }
    let slug = data.get("slug").and_then(Value::as_str).unwrap_or_default().to_string();
    let row = write::update(&state.db, &DOCUMENT, id, data)
        .await
        .map_err(|e| duplicate(e, format!("\"{}/{slug}\" already exists.", app["slug"].as_str().unwrap_or_default())))?
        .ok_or_else(|| refuse(StatusCode::NOT_FOUND, "Legal page not found."))?;
    let hidden = row["slug"] != existing["slug"] || (truthy(&existing["published"]) && !truthy(&row["published"]));
    let gone = if hidden { vec![document_path(&app, &existing)] } else { vec![] };
    let mut paths = vec![app_path(&app)];
    if truthy(&row["published"]) && !truthy(&row["noIndex"]) {
        paths.push(document_path(&app, &row));
    }
    changed(state, paths, gone).await;
    Ok(row)
}

async fn delete_document(state: &AppState, id: &str) -> anyhow::Result<Value> {
    let existing = document(&state.db, id).await?;
    write::delete(&state.db, "LegalDocument", id).await?;
    let app = &existing["app"];
    let gone = if truthy(&existing["published"]) { vec![document_path(app, &existing)] } else { vec![] };
    changed(state, vec![app_path(app)], gone).await;
    Ok(json!({ "deletedId": id }))
}

/// `handleAdmin`: the session, a body that may be empty, and `no-store` JSON.
async fn handle<F>(state: &AppState, req: Request, run: F) -> Response
where
    F: AsyncFnOnce(Value) -> anyhow::Result<Value>,
{
    let (parts, body) = req.into_parts();
    if !signed_in(state, &parts.headers).await {
        return error(StatusCode::UNAUTHORIZED, "Unauthorized");
    }
    let body = if parts.method == axum::http::Method::DELETE { None } else { write::json_body(body).await };
    match run(body.unwrap_or_else(|| json!({}))).await {
        Ok(value) => {
            let mut res = json_status(StatusCode::OK, value);
            res.headers_mut().insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
            res
        }
        Err(err) => match err.downcast_ref::<Refused>() {
            Some(Refused(status, message)) => error(*status, message),
            None => {
                log_error("/api/legal", &err);
                error(StatusCode::INTERNAL_SERVER_ERROR, "Internal error")
            }
        },
    }
}

pub async fn post_app(State(state): State<AppState>, req: Request) -> Response {
    handle(&state, req, async |body| create_app(&state, body).await).await
}
pub async fn put_app(State(state): State<AppState>, Path(id): Path<String>, req: Request) -> Response {
    handle(&state, req, async |body| update_app(&state, &id, body).await).await
}
pub async fn remove_app(State(state): State<AppState>, Path(id): Path<String>, req: Request) -> Response {
    handle(&state, req, async |_| delete_app(&state, &id).await).await
}
pub async fn post_document(State(state): State<AppState>, Path(id): Path<String>, req: Request) -> Response {
    handle(&state, req, async |body| create_document(&state, &id, body).await).await
}
pub async fn put_document(State(state): State<AppState>, Path(id): Path<String>, req: Request) -> Response {
    handle(&state, req, async |body| update_document(&state, &id, body).await).await
}
pub async fn remove_document(State(state): State<AppState>, Path(id): Path<String>, req: Request) -> Response {
    handle(&state, req, async |_| delete_document(&state, &id).await).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn slugs_follow_the_legal_rules() {
        assert_eq!(app_slug(&Value::Null, "My App_2!").unwrap(), "my-app-2");
        assert_eq!(normalize_slug(&json!("  -A B- "), "x").unwrap(), "a-b");
        for taken in ["admin", "auth", "Blogs"] {
            assert!(app_slug(&json!(taken), "x").is_err(), "{taken}");
        }
        assert!(normalize_slug(&json!("a__b"), "x").is_err());
        assert!(normalize_slug(&json!("!!!"), "x").is_err());
    }

    #[test]
    fn package_names_are_reverse_dns() {
        assert!(package_name(&json!({ "packageName": "com.example.app" })).is_ok());
        assert!(package_name(&json!({ "packageName": "" })).is_ok());
        assert!(package_name(&json!({ "packageName": "nodots" })).is_err());
    }
}
