//! Admin writes for socials, themes, projects, deployments and the gallery. Each handler mirrors its Next route:
//! same status codes and bodies, same cache invalidation and indexing pings.

use axum::{
    extract::{Path, RawQuery, Request, State},
    http::StatusCode,
    response::Response,
};
use chrono::Utc;
use serde_json::{Map, Value, json};
use sqlx::PgPool;

use crate::{
    AppState,
    api::{error, json_status, log_error, query_map, signed_in, truthy},
    pages, write,
    write::{Kind, Table},
};

use Kind::{Bool, Date, Int, Json, List, OptDate, OptJson, OptText, Text};

const SOCIAL: Table = Table {
    name: "Social",
    columns: &[("name", Text), ("url", Text), ("iconName", Text), ("isHidden", Bool)],
    created_at: false,
    updated_at: false,
};
const THEME: Table = Table {
    name: "Theme",
    columns: &[("name", Text), ("slug", Text), ("description", Text), ("isCustom", Bool), ("isPredefined", Bool), ("variants", Json)],
    created_at: true,
    updated_at: true,
};
pub(crate) const PROJECT: Table = Table {
    name: "Project",
    columns: &[
        ("name", Text), ("slug", Text), ("techStack", List), ("year", Text), ("status", Text), ("projectType", Text),
        ("description", Text), ("codeLink", OptText), ("blogLink", OptText), ("image", OptText), ("displayOrder", Int),
        ("source", Text), ("repoFullName", OptText), ("repoData", OptJson), ("readme", OptText), ("readmeFetchedAt", OptDate),
        ("syncedAt", OptDate), ("pinnedFields", List), ("createdAt", Date), ("updatedAt", Date),
    ],
    created_at: true,
    updated_at: true,
};
const DEPLOYMENT: Table = Table {
    name: "Deployment",
    columns: &[
        ("name", Text), ("slug", Text), ("techStack", List), ("status", Text), ("appType", Text), ("environment", Text),
        ("hostingProvider", Text), ("description", Text), ("hostedUrl", OptText), ("blogLink", OptText), ("image", OptText),
        ("displayOrder", Int), ("projectId", OptText), ("createdAt", Date), ("updatedAt", Date),
    ],
    created_at: true,
    updated_at: true,
};
const GALLERY: Table = Table {
    name: "Gallery",
    columns: &[
        ("src", Text), ("thumbnail", OptText), ("description", Text), ("width", Int), ("height", Int), ("isPinned", Bool),
        ("order", Int), ("createdAt", Date),
    ],
    created_at: true,
    updated_at: false,
};

/// Fields a GitHub sync writes; editing one on a synced project pins it (src/lib/projectSyncFields.js).
const PINNABLE: [&str; 8] = ["name", "description", "techStack", "year", "status", "projectType", "codeLink", "image"];

const UNAUTHORIZED: StatusCode = StatusCode::UNAUTHORIZED;
const FAILED: StatusCode = StatusCode::INTERNAL_SERVER_ERROR;

fn failed(route: &str, err: &anyhow::Error, message: &str) -> Response {
    log_error(route, err);
    error(FAILED, message)
}

/// Check the session, then read the JSON body.
async fn admin_body(state: &AppState, req: Request) -> Result<Option<Value>, Response> {
    let (parts, body) = req.into_parts();
    if !signed_in(state, &parts.headers).await {
        return Err(error(UNAUTHORIZED, "Unauthorized"));
    }
    Ok(write::json_body(body).await)
}

// ── socials ────────────────────────────────────────────────────────────────────────────────────────────

fn socials_changed() -> Value {
    json!({ "prefixes": ["db:socials"] })
}

pub async fn create_social(State(state): State<AppState>, req: Request) -> Response {
    const MESSAGE: &str = "Failed to create social link";
    let body = match admin_body(&state, req).await {
        Ok(Some(b)) => b,
        Ok(None) => return error(FAILED, MESSAGE),
        Err(res) => return res,
    };
    let created = async { write::insert(&state.db, &SOCIAL, write::prepare(&SOCIAL, &body)?).await }.await;
    match created {
        Ok(row) => {
            write::notify(&state, socials_changed()).await;
            json_status(StatusCode::CREATED, row)
        }
        Err(err) => failed("/api/socials", &err, MESSAGE),
    }
}

pub async fn update_social(State(state): State<AppState>, Path(id): Path<String>, req: Request) -> Response {
    const MESSAGE: &str = "Failed to update social link";
    let body = match admin_body(&state, req).await {
        Ok(Some(b)) => b,
        Ok(None) => return error(FAILED, MESSAGE),
        Err(res) => return res,
    };
    let updated = async { write::update(&state.db, &SOCIAL, &id, write::prepare(&SOCIAL, &body)?).await }.await;
    match updated {
        Ok(Some(row)) => {
            write::notify(&state, socials_changed()).await;
            json_status(StatusCode::OK, row)
        }
        Ok(None) => error(StatusCode::NOT_FOUND, "Social link not found"),
        Err(err) => failed("/api/socials/{id}", &err, MESSAGE),
    }
}

pub async fn delete_social(State(state): State<AppState>, Path(id): Path<String>, req: Request) -> Response {
    if !signed_in(&state, req.headers()).await {
        return error(UNAUTHORIZED, "Unauthorized");
    }
    match write::delete(&state.db, "Social", &id).await {
        Ok(Some(_)) => {
            write::notify(&state, socials_changed()).await;
            json_status(StatusCode::OK, json!({ "message": "Social link deleted successfully" }))
        }
        Ok(None) => error(StatusCode::NOT_FOUND, "Social link not found"),
        Err(err) => failed("/api/socials/{id}", &err, "Failed to delete social link"),
    }
}

// ── themes ─────────────────────────────────────────────────────────────────────────────────────────────

fn theme_failure(status: StatusCode, message: &str) -> Response {
    json_status(status, json!({ "success": false, "error": message }))
}

fn theme_error(err: &anyhow::Error) -> Response {
    log_error("/api/themes", err);
    theme_failure(FAILED, &err.to_string())
}

fn themes_changed() -> Value {
    json!({ "prefixes": ["db:themes", "db:theme:detail:", "db:config"] })
}

fn predefined(state: &AppState, slug: &str) -> bool {
    state.web.as_ref().is_some_and(|w| w.themes["presets"].get(slug).or_else(|| w.themes["legacy"].get(slug)).is_some())
}

pub(crate) async fn theme_slug_taken(db: &PgPool, slug: &str) -> anyhow::Result<bool> {
    Ok(sqlx::query_scalar(r#"SELECT EXISTS(SELECT 1 FROM "Theme" WHERE slug = $1)"#).bind(slug).fetch_one(db).await?)
}

/// A custom theme by slug or id.
async fn theme_id(db: &PgPool, identifier: &str) -> anyhow::Result<Option<String>> {
    Ok(sqlx::query_scalar(r#"SELECT id FROM "Theme" WHERE slug = $1 OR id = $1 LIMIT 1"#).bind(identifier).fetch_optional(db).await?)
}

/// `name.toLowerCase()`, runs of other characters to `-`, no leading or trailing `-`.
fn theme_slug(name: &str) -> String {
    name.to_lowercase().split(|c: char| !(c.is_ascii_lowercase() || c.is_ascii_digit())).filter(|p| !p.is_empty()).collect::<Vec<_>>().join("-")
}

pub async fn create_theme(State(state): State<AppState>, req: Request) -> Response {
    let (parts, body) = req.into_parts();
    if !signed_in(&state, &parts.headers).await {
        return theme_failure(UNAUTHORIZED, "Unauthorized");
    }
    let Some(body) = write::json_body(body).await.filter(Value::is_object) else { return theme_failure(FAILED, "Invalid JSON body") };
    let variants = &body["variants"];
    if !truthy(&body["name"]) || !truthy(variants) || !truthy(&variants["light"]) || !truthy(&variants["dark"]) {
        return theme_failure(StatusCode::BAD_REQUEST, "Name and both light/dark variants are required");
    }
    let Some(name) = body["name"].as_str() else { return theme_failure(FAILED, "name must be a string") };
    let slug = theme_slug(name);
    if predefined(&state, &slug) {
        return theme_failure(StatusCode::BAD_REQUEST, "Theme name conflicts with a predefined theme");
    }
    let result: anyhow::Result<Option<Value>> = async {
        if theme_slug_taken(&state.db, &slug).await? {
            return Ok(None);
        }
        let description = if truthy(&body["description"]) { body["description"].clone() } else { json!("") };
        let doc = json!({ "name": name, "description": description, "slug": slug, "isCustom": true, "isPredefined": false, "variants": variants });
        Ok(Some(write::insert(&state.db, &THEME, write::prepare(&THEME, &doc)?).await?))
    }
    .await;
    match result {
        Ok(Some(row)) => {
            write::notify(&state, themes_changed()).await;
            json_status(StatusCode::CREATED, json!({ "success": true, "data": row }))
        }
        Ok(None) => theme_failure(StatusCode::BAD_REQUEST, "A theme with this name already exists"),
        Err(err) => theme_error(&err),
    }
}

pub async fn update_theme(State(state): State<AppState>, Path(id): Path<String>, req: Request) -> Response {
    let (parts, body) = req.into_parts();
    if !signed_in(&state, &parts.headers).await {
        return theme_failure(UNAUTHORIZED, "Unauthorized");
    }
    if predefined(&state, &id) {
        return theme_failure(StatusCode::FORBIDDEN, "Cannot modify predefined themes");
    }
    let Some(body) = write::json_body(body).await.filter(Value::is_object) else { return theme_failure(FAILED, "Invalid JSON body") };
    let result: anyhow::Result<Option<Value>> = async {
        let Some(existing) = theme_id(&state.db, &id).await? else { return Ok(None) };
        let mut doc = Map::new();
        for (key, keep) in [("name", truthy(&body["name"])), ("description", body.get("description").is_some()), ("variants", truthy(&body["variants"]))] {
            if keep {
                doc.insert(key.into(), body[key].clone());
            }
        }
        write::update(&state.db, &THEME, &existing, write::prepare(&THEME, &Value::Object(doc))?).await
    }
    .await;
    match result {
        Ok(Some(row)) => {
            write::notify(&state, themes_changed()).await;
            json_status(StatusCode::OK, json!({ "success": true, "data": row }))
        }
        Ok(None) => theme_failure(StatusCode::NOT_FOUND, "Theme not found"),
        Err(err) => theme_error(&err),
    }
}

pub async fn delete_theme(State(state): State<AppState>, Path(id): Path<String>, req: Request) -> Response {
    if !signed_in(&state, req.headers()).await {
        return theme_failure(UNAUTHORIZED, "Unauthorized");
    }
    if predefined(&state, &id) {
        return theme_failure(StatusCode::FORBIDDEN, "Cannot delete predefined themes");
    }
    let result: anyhow::Result<Response> = async {
        let config = pages::try_singleton(&state.db, "Config", false).await?;
        if config["activeTheme"].as_str() == Some(id.as_str()) {
            return Ok(theme_failure(StatusCode::BAD_REQUEST, "Cannot delete the active theme. Please activate another theme first."));
        }
        let deleted = match theme_id(&state.db, &id).await? {
            Some(existing) => write::delete(&state.db, "Theme", &existing).await?,
            None => None,
        };
        let Some(row) = deleted else { return Ok(theme_failure(StatusCode::NOT_FOUND, "Theme not found")) };
        write::notify(&state, themes_changed()).await;
        Ok(json_status(StatusCode::OK, json!({ "success": true, "message": "Theme deleted successfully", "data": row })))
    }
    .await;
    result.unwrap_or_else(|err| theme_error(&err))
}

// ── projects and deployments ───────────────────────────────────────────────────────────────────────────

/// What differs between `/api/projects` and `/api/deployments`.
struct Entry {
    table: &'static Table,
    /// Singular, for messages: "project".
    noun: &'static str,
    title: &'static str,
    /// Public list page: "/projects".
    base: &'static str,
    slug_prefix: &'static str,
    cache: &'static str,
}

const PROJECTS: Entry = Entry { table: &PROJECT, noun: "project", title: "Project", base: "/projects", slug_prefix: "project", cache: "db:projects" };
const DEPLOYMENTS: Entry =
    Entry { table: &DEPLOYMENT, noun: "deployment", title: "Deployment", base: "/apps", slug_prefix: "app", cache: "db:deployments" };

impl Entry {
    fn path(&self, row: &Value) -> String {
        format!("{}/{}", self.base, pages::entity_slug(row, self.slug_prefix))
    }

    fn effects(&self, pings: Vec<Value>) -> Value {
        json!({ "prefixes": [self.cache], "pings": pings })
    }

    fn not_found(&self) -> Response {
        error(StatusCode::NOT_FOUND, &format!("{} not found", self.title))
    }
}

/// `normalizeProjectIdInput`: absent leaves the link alone, empty unlinks, an unknown id is refused.
async fn link_project(db: &PgPool, doc: &mut Map<String, Value>) -> anyhow::Result<bool> {
    let Some(value) = doc.get("projectId") else { return Ok(true) };
    let id = if truthy(value) { crate::site_api::js_string(value).trim().to_string() } else { String::new() };
    if id.is_empty() {
        doc.insert("projectId".into(), Value::Null);
        return Ok(true);
    }
    let known: bool = sqlx::query_scalar(r#"SELECT EXISTS(SELECT 1 FROM "Project" WHERE id = $1)"#).bind(&id).fetch_one(db).await?;
    doc.insert("projectId".into(), id.into());
    Ok(known)
}

fn unknown_project() -> Response {
    error(StatusCode::BAD_REQUEST, "Linked project not found")
}

/// A number below every existing one, so a new entry lists first.
async fn first_position(db: &PgPool, table: &str, column: &str) -> anyhow::Result<i64> {
    let min: Option<i32> = sqlx::query_scalar(&format!(r#"SELECT min("{column}") FROM "{table}""#)).fetch_one(db).await?;
    Ok(min.map_or(0, |m| i64::from(m) - 1))
}

async fn create_entry(state: AppState, req: Request, entry: &Entry) -> Response {
    let message = format!("Failed to create {}", entry.noun);
    let body = match admin_body(&state, req).await {
        Ok(Some(b)) => b,
        Ok(None) => return error(FAILED, &message),
        Err(res) => return res,
    };
    let result: anyhow::Result<Option<Value>> = async {
        let mut doc = body.as_object().cloned().unwrap_or_default();
        if entry.table.name == "Deployment" && !link_project(&state.db, &mut doc).await? {
            return Ok(None);
        }
        // `Number.isFinite`: only a real number keeps its place.
        if !doc.get("displayOrder").is_some_and(Value::is_number) {
            doc.insert("displayOrder".into(), first_position(&state.db, entry.table.name, "displayOrder").await?.into());
        }
        Ok(Some(write::insert(&state.db, entry.table, write::prepare(entry.table, &Value::Object(doc))?).await?))
    }
    .await;
    match result {
        Ok(Some(row)) => {
            let paths = [entry.path(&row), entry.base.to_string()];
            write::notify(&state, entry.effects(vec![write::ping(&paths, "URL_UPDATED")])).await;
            json_status(StatusCode::CREATED, row)
        }
        Ok(None) => unknown_project(),
        Err(err) => failed(entry.base, &err, &message),
    }
}

/// The fields of a synced project this edit changes, added to the pinned ones.
fn pinned(existing: &Value, data: &Map<String, Value>) -> Option<Vec<Value>> {
    let changed: Vec<&str> = PINNABLE.into_iter().filter(|f| data.get(*f).is_some_and(|v| *v != existing[*f])).collect();
    if changed.is_empty() {
        return None;
    }
    let mut all = existing["pinnedFields"].as_array().cloned().unwrap_or_default();
    for field in changed {
        if !all.iter().any(|v| v == field) {
            all.push(field.into());
        }
    }
    Some(all)
}

async fn update_entry(state: AppState, id: String, req: Request, entry: &Entry) -> Response {
    let message = format!("Failed to update {}", entry.noun);
    let body = match admin_body(&state, req).await {
        Ok(Some(b)) => b,
        Ok(None) => return error(FAILED, &message),
        Err(res) => return res,
    };
    let result: anyhow::Result<Result<Option<Value>, Response>> = async {
        let mut doc = body.as_object().cloned().unwrap_or_default();
        if entry.table.name == "Deployment" && !link_project(&state.db, &mut doc).await? {
            return Ok(Err(unknown_project()));
        }
        let mut data = write::prepare(entry.table, &Value::Object(doc.clone()))?;
        // An explicit `pinnedFields` wins: that is the admin handing a field back to the sync.
        if entry.table.name == "Project" && !doc.contains_key("pinnedFields") {
            if let Some(existing) = write::find(&state.db, "Project", &id).await? {
                if existing["source"] == "github" {
                    if let Some(all) = pinned(&existing, &data) {
                        data.insert("pinnedFields".into(), all.into());
                    }
                }
            }
        }
        Ok(Ok(write::update(&state.db, entry.table, &id, data).await?))
    }
    .await;
    match result {
        Ok(Ok(Some(row))) => {
            let paths = [entry.path(&row), entry.base.to_string()];
            write::notify(&state, entry.effects(vec![write::ping(&paths, "URL_UPDATED")])).await;
            json_status(StatusCode::OK, row)
        }
        Ok(Ok(None)) => entry.not_found(),
        Ok(Err(res)) => res,
        Err(err) => failed(entry.base, &err, &message),
    }
}

async fn delete_entry(state: AppState, id: String, req: Request, entry: &Entry) -> Response {
    if !signed_in(&state, req.headers()).await {
        return error(UNAUTHORIZED, "Unauthorized");
    }
    match write::delete(&state.db, entry.table.name, &id).await {
        Ok(Some(row)) => {
            let pings = vec![write::ping(&[entry.path(&row)], "URL_DELETED"), write::ping(&[entry.base.to_string()], "URL_UPDATED")];
            write::notify(&state, entry.effects(pings)).await;
            json_status(StatusCode::OK, json!({ "message": format!("{} deleted successfully", entry.title) }))
        }
        Ok(None) => entry.not_found(),
        Err(err) => failed(entry.base, &err, &format!("Failed to delete {}", entry.noun)),
    }
}

/// The ids of a reorder request, or why it is refused.
fn ordered_ids(body: &Value, noun: &str) -> Result<Vec<String>, String> {
    let list = body["orderedIds"].as_array().cloned().unwrap_or_default();
    if list.is_empty() {
        return Err("orderedIds must be a non-empty array".into());
    }
    // `new Set` compares objects by identity, so only repeated plain values count.
    let duplicated = list.iter().enumerate().any(|(i, v)| !v.is_object() && !v.is_array() && list[..i].contains(v));
    if duplicated {
        return Err("orderedIds must not contain duplicates".into());
    }
    list.iter()
        .map(|v| v.as_str().filter(|s| !s.trim().is_empty()).map(str::to_string))
        .collect::<Option<Vec<_>>>()
        .ok_or_else(|| format!("orderedIds contains invalid {noun} id values"))
}

async fn reorder(state: AppState, req: Request, entry: &Entry) -> Response {
    let message = format!("Failed to reorder {}s", entry.noun);
    let body = match admin_body(&state, req).await {
        Ok(Some(b)) => b,
        Ok(None) => return error(FAILED, &message),
        Err(res) => return res,
    };
    let ids = match ordered_ids(&body, entry.noun) {
        Ok(ids) => ids,
        Err(why) => return error(StatusCode::BAD_REQUEST, &why),
    };
    let table = entry.table.name;
    let result: anyhow::Result<bool> = async {
        let known: i64 = sqlx::query_scalar(&format!(r#"SELECT count(*) FROM "{table}" WHERE id = ANY($1)"#)).bind(&ids).fetch_one(&state.db).await?;
        if known != ids.len() as i64 {
            return Ok(false);
        }
        sqlx::query(&format!(
            r#"UPDATE "{table}" t SET "displayOrder" = o.pos - 1, "updatedAt" = $2
               FROM unnest($1::text[]) WITH ORDINALITY AS o(id, pos) WHERE t.id = o.id"#
        ))
        .bind(&ids)
        .bind(Utc::now().naive_utc())
        .execute(&state.db)
        .await?;
        Ok(true)
    }
    .await;
    match result {
        Ok(true) => {
            write::notify(&state, entry.effects(vec![])).await;
            json_status(StatusCode::OK, json!({ "message": format!("{} order updated successfully", entry.title) }))
        }
        Ok(false) => error(StatusCode::NOT_FOUND, &format!("One or more {}s were not found", entry.noun)),
        Err(err) => failed(entry.base, &err, &message),
    }
}

pub async fn create_project(State(state): State<AppState>, req: Request) -> Response {
    create_entry(state, req, &PROJECTS).await
}
pub async fn update_project(State(state): State<AppState>, Path(id): Path<String>, req: Request) -> Response {
    update_entry(state, id, req, &PROJECTS).await
}
pub async fn delete_project(State(state): State<AppState>, Path(id): Path<String>, req: Request) -> Response {
    delete_entry(state, id, req, &PROJECTS).await
}
pub async fn reorder_projects(State(state): State<AppState>, req: Request) -> Response {
    reorder(state, req, &PROJECTS).await
}
pub async fn create_deployment(State(state): State<AppState>, req: Request) -> Response {
    create_entry(state, req, &DEPLOYMENTS).await
}
pub async fn update_deployment(State(state): State<AppState>, Path(id): Path<String>, req: Request) -> Response {
    update_entry(state, id, req, &DEPLOYMENTS).await
}
pub async fn delete_deployment(State(state): State<AppState>, Path(id): Path<String>, req: Request) -> Response {
    delete_entry(state, id, req, &DEPLOYMENTS).await
}
pub async fn reorder_deployments(State(state): State<AppState>, req: Request) -> Response {
    reorder(state, req, &DEPLOYMENTS).await
}

// ── gallery ────────────────────────────────────────────────────────────────────────────────────────────

fn gallery_failure(status: StatusCode, message: &str) -> Response {
    json_status(status, json!({ "success": false, "error": message }))
}

/// `withAuth`'s reply.
fn gallery_unauthorized() -> Response {
    json_status(UNAUTHORIZED, json!({ "success": false, "error": "Unauthorized", "message": "No authentication token provided" }))
}

/// Next answers every gallery write error with 400 and the error text.
fn gallery_error(err: &anyhow::Error) -> Response {
    log_error("/api/gallery", err);
    gallery_failure(StatusCode::BAD_REQUEST, &err.to_string())
}

fn gallery_changed() -> Value {
    json!({ "keys": ["db:gallery"] })
}

pub async fn create_gallery_item(State(state): State<AppState>, req: Request) -> Response {
    let (parts, body) = req.into_parts();
    if !signed_in(&state, &parts.headers).await {
        return gallery_unauthorized();
    }
    let Some(body) = write::json_body(body).await else { return gallery_failure(StatusCode::BAD_REQUEST, "Invalid JSON body") };
    let created: anyhow::Result<Value> = async {
        let mut doc = body.as_object().cloned().unwrap_or_default();
        if !doc.get("order").is_some_and(Value::is_number) {
            doc.insert("order".into(), first_position(&state.db, "Gallery", "order").await?.into());
        }
        write::insert(&state.db, &GALLERY, write::prepare(&GALLERY, &Value::Object(doc))?).await
    }
    .await;
    match created {
        Ok(row) => {
            write::notify(&state, gallery_changed()).await;
            json_status(StatusCode::CREATED, json!({ "success": true, "data": row }))
        }
        Err(err) => gallery_error(&err),
    }
}

pub async fn delete_gallery_item(State(state): State<AppState>, RawQuery(query): RawQuery, req: Request) -> Response {
    if !signed_in(&state, req.headers()).await {
        return gallery_unauthorized();
    }
    let Some(id) = query_map(&query).remove("id").filter(|id| !id.is_empty()) else {
        return gallery_failure(StatusCode::BAD_REQUEST, "ID is required");
    };
    match write::delete(&state.db, "Gallery", &id).await {
        Ok(Some(row)) => {
            write::notify(&state, gallery_changed()).await;
            // The thumbnail file goes too; only its name is used, so the path stays inside the uploads folder.
            let name = row["thumbnail"].as_str().and_then(|t| std::path::Path::new(t).file_name());
            if let Some(name) = name {
                if let Err(err) = tokio::fs::remove_file(state.config.uploads_dir.join(name)).await {
                    tracing::warn!(%err, "failed to delete thumbnail");
                }
            }
            json_status(StatusCode::OK, json!({ "success": true, "data": {} }))
        }
        Ok(None) => gallery_failure(StatusCode::NOT_FOUND, "Item not found"),
        Err(err) => gallery_error(&err),
    }
}

/// New positions for several items: all or none.
async fn reorder_gallery(db: &PgPool, items: &[Value]) -> anyhow::Result<()> {
    let mut tx = db.begin().await?;
    for item in items {
        let (Some(id), Some(order)) = (item["id"].as_str(), item.get("order").and_then(|o| write::parse_int(o))) else {
            anyhow::bail!("every item needs an id and an order");
        };
        let done = sqlx::query(r#"UPDATE "Gallery" SET "order" = $1 WHERE id = $2"#).bind(i32::try_from(order)?).bind(id).execute(&mut *tx).await?;
        anyhow::ensure!(done.rows_affected() == 1, "Record to update not found.");
    }
    tx.commit().await?;
    Ok(())
}

pub async fn update_gallery(State(state): State<AppState>, req: Request) -> Response {
    let (parts, body) = req.into_parts();
    if !signed_in(&state, &parts.headers).await {
        return gallery_unauthorized();
    }
    let Some(body) = write::json_body(body).await.filter(|b| !b.is_null()) else {
        return gallery_failure(StatusCode::BAD_REQUEST, "Invalid JSON body");
    };
    if let Some(items) = body["items"].as_array() {
        return match reorder_gallery(&state.db, items).await {
            Ok(()) => {
                write::notify(&state, gallery_changed()).await;
                json_status(StatusCode::OK, json!({ "success": true, "message": "Ordering updated successfully" }))
            }
            Err(err) => gallery_error(&err),
        };
    }
    if !truthy(&body["id"]) {
        return gallery_failure(StatusCode::BAD_REQUEST, "Invalid request payload");
    }
    let Some(id) = body["id"].as_str() else { return gallery_failure(StatusCode::BAD_REQUEST, "id must be a string") };
    let updated = async { write::update(&state.db, &GALLERY, id, write::prepare(&GALLERY, &body["update"])?).await }.await;
    match updated {
        Ok(Some(row)) => {
            write::notify(&state, gallery_changed()).await;
            json_status(StatusCode::OK, json!({ "success": true, "data": row }))
        }
        Ok(None) => gallery_failure(StatusCode::NOT_FOUND, "Item not found"),
        Err(err) => gallery_error(&err),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn theme_slugs_match_next() {
        assert_eq!(theme_slug("  My Theme!! v2 "), "my-theme-v2");
        assert_eq!(theme_slug("Éclair"), "clair");
    }

    #[test]
    fn reorder_requests_are_checked_like_next() {
        let why = |v: Value| ordered_ids(&json!({ "orderedIds": v }), "project").unwrap_err();
        assert_eq!(why(json!([])), "orderedIds must be a non-empty array");
        assert_eq!(why(json!("a")), "orderedIds must be a non-empty array");
        assert_eq!(why(json!(["a", "a"])), "orderedIds must not contain duplicates");
        assert_eq!(why(json!(["a", " "])), "orderedIds contains invalid project id values");
        assert_eq!(ordered_ids(&json!({ "orderedIds": ["a", "b"] }), "project").unwrap(), ["a", "b"]);
    }

    #[test]
    fn editing_a_synced_field_pins_it() {
        let existing = json!({ "name": "a", "year": "2026", "pinnedFields": ["year"] });
        let data = |v: Value| v.as_object().unwrap().clone();
        assert_eq!(pinned(&existing, &data(json!({ "name": "a", "displayOrder": 3 }))), None);
        assert_eq!(pinned(&existing, &data(json!({ "name": "b", "year": "2027" }))), Some(vec![json!("year"), json!("name")]));
    }
}
