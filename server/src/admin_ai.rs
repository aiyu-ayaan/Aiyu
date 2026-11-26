//! Writes for the AI Hub tables (src/lib/aiSections.js): the admin session or the bearer token.

use axum::{
    extract::{Path, Request, State},
    http::StatusCode,
    response::Response,
};
use serde_json::{Map, Value, json};
use sqlx::PgPool;

use crate::{
    AppState,
    admin_site::number,
    api::{json_status, log_error, signed_in, truthy},
    pages,
    site_api::js_string,
    write,
    write::{Kind, Table},
};

use Kind::{Bool, Int, List, OptText, Text};

const fn table(name: &'static str, columns: &'static [(&'static str, Kind)]) -> Table {
    Table { name, columns, created_at: true, updated_at: true }
}

const CATEGORY: Table = table("AiSkillCategory", &[("label", Text), ("accent", Text), ("displayOrder", Int)]);
const SKILL: Table = table("AiSkill", &[("categoryId", Text), ("name", Text), ("description", Text), ("url", OptText), ("displayOrder", Int)]);
const RECOMMENDATION: Table = table(
    "AiRecommendation",
    &[("name", Text), ("url", Text), ("rating", Int), ("accent", Text), ("blurb", Text), ("tags", List), ("displayOrder", Int)],
);
const CREDIT: Table = table(
    "AiCredit",
    &[("name", Text), ("offer", Text), ("url", Text), ("noCard", Bool), ("freeApi", Bool), ("note", Text), ("displayOrder", Int)],
);
const PROMPT: Table = table("AiPrompt", &[("title", Text), ("role", Text), ("prompt", Text), ("displayOrder", Int)]);

const ACCENT: &str = "var(--accent-cyan)";

// ── field rules ────────────────────────────────────────────────────────────────────────────────────────

/// How one input field becomes one column.
#[derive(Clone, Copy)]
enum Rule {
    /// Required, not blank, at most this long.
    Required(usize),
    /// `str(v) || fallback`.
    Optional(usize, &'static str),
    /// `str(v) || null`.
    Nullable(usize),
    /// Optional text kept as sent (the accent on update).
    Kept(usize),
    /// A flag, true unless said otherwise.
    Flag,
    /// A number within bounds, with a default.
    Number(i64, i64),
    Tags,
}

struct Field {
    name: &'static str,
    create: Rule,
    update: Rule,
}

const fn field(name: &'static str, rule: Rule) -> Field {
    Field { name, create: rule, update: rule }
}

///One kind of AI Hub entry.
pub(crate) struct Entry {
    pub table: &'static Table,
    /// For messages: "Skill category".
    pub what: &'static str,
    /// Key of the reply: `{ ok, skill }`.
    pub reply: &'static str,
    /// In input order, which decides which error is reported.
    fields: &'static [Field],
}

use Rule::{Flag, Kept, Nullable, Number, Optional, Required, Tags};

pub(crate) const CATEGORIES: Entry = Entry {
    table: &CATEGORY,
    what: "Skill category",
    reply: "category",
    fields: &[field("label", Required(120)), Field { name: "accent", create: Optional(120, ACCENT), update: Kept(120) }],
};
pub(crate) const SKILLS: Entry = Entry {
    table: &SKILL,
    what: "Skill",
    reply: "skill",
    fields: &[field("categoryId", Required(120)), field("name", Required(200)), field("description", Optional(2000, "")), field("url", Nullable(1000))],
};
pub(crate) const RECOMMENDATIONS: Entry = Entry {
    table: &RECOMMENDATION,
    what: "Recommendation",
    reply: "recommendation",
    fields: &[
        field("name", Required(200)), field("url", Optional(1000, "")), field("rating", Number(5, 5)),
        Field { name: "accent", create: Optional(120, ACCENT), update: Kept(120) }, field("blurb", Optional(2000, "")), field("tags", Tags),
    ],
};
pub(crate) const CREDITS: Entry = Entry {
    table: &CREDIT,
    what: "Credit",
    reply: "credit",
    fields: &[
        field("name", Required(200)), field("offer", Optional(2000, "")), field("url", Optional(1000, "")), field("noCard", Flag),
        field("freeApi", Flag), field("note", Optional(500, "")),
    ],
};
pub(crate) const PROMPTS: Entry = Entry {
    table: &PROMPT,
    what: "Prompt",
    reply: "prompt",
    fields: &[field("title", Required(200)), field("role", Optional(80, "")), field("prompt", Required(20000))],
};

/// `AiSectionError`: shown to the caller with its status.
#[derive(Debug)]
pub(crate) struct Refused(pub StatusCode, pub String);

impl std::fmt::Display for Refused {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.1)
    }
}
impl std::error::Error for Refused {}

fn invalid(message: String) -> anyhow::Error {
    Refused(StatusCode::BAD_REQUEST, message).into()
}

/// `str(value, field, { required, max })`
pub(crate) fn string(value: Option<&Value>, name: &str, required: bool, max: usize) -> anyhow::Result<Option<String>> {
    let Some(value) = value.filter(|v| !v.is_null()) else {
        if required {
            return Err(invalid(format!("Missing required field: {name}")));
        }
        return Ok(None);
    };
    let s = js_string(value);
    if required && s.trim().is_empty() {
        return Err(invalid(format!("Field \"{name}\" must not be empty.")));
    }
    if s.encode_utf16().count() > max {
        return Err(invalid(format!("Field \"{name}\" exceeds {max} characters.")));
    }
    Ok(Some(s))
}

/// `int(value, field, { min: 0, max, fallback })`
fn integer(value: Option<&Value>, name: &str, max: i64) -> anyhow::Result<Option<i64>> {
    let Some(value) = value.filter(|v| !v.is_null() && v.as_str() != Some("")) else { return Ok(None) };
    let n = number(value);
    if !n.is_finite() {
        return Err(invalid(format!("Field \"{name}\" must be a number.")));
    }
    Ok(Some(((n + 0.5).floor() as i64).clamp(0, max)))
}

/// The column value of one field. None leaves the column to the database.
fn column(rule: Rule, input: &Value, name: &str) -> anyhow::Result<Option<Value>> {
    let value = input.get(name);
    Ok(match rule {
        Required(max) => string(value, name, true, max)?.map(Value::from),
        Optional(max, fallback) => Some(string(value, name, false, max)?.filter(|s| !s.is_empty()).unwrap_or_else(|| fallback.into()).into()),
        Nullable(max) => Some(string(value, name, false, max)?.filter(|s| !s.is_empty()).map_or(Value::Null, Value::from)),
        Kept(max) => string(value, name, false, max)?.map(Value::from),
        Flag => Some(match value {
            None | Some(Value::Null) => true,
            Some(Value::String(s)) if s == "false" => false,
            Some(v) => truthy(v),
        }
        .into()),
        Number(max, fallback) => Some(integer(value, name, max)?.unwrap_or(fallback).into()),
        Tags => match value.filter(|v| !v.is_null()) {
            None => Some(json!([])),
            Some(Value::Array(a)) if a.len() > 40 => return Err(invalid(format!("Field \"{name}\" has too many items (max 40)."))),
            Some(Value::Array(a)) => Some(
                a.iter()
                    .map(|v| String::from_utf16_lossy(&js_string(v).encode_utf16().take(120).collect::<Vec<_>>()))
                    .filter(|s| !s.is_empty())
                    .collect::<Vec<_>>()
                    .into(),
            ),
            Some(_) => return Err(invalid(format!("Field \"{name}\" must be an array of strings."))),
        },
    })
}

async fn exists(db: &PgPool, table: &str, what: &str, id: &str) -> anyhow::Result<()> {
    let found: bool = sqlx::query_scalar(&format!(r#"SELECT EXISTS(SELECT 1 FROM "{table}" WHERE id = $1)"#)).bind(id).fetch_one(db).await?;
    if !found {
        return Err(Refused(StatusCode::NOT_FOUND, format!("{what} not found.")).into());
    }
    Ok(())
}

async fn changed(state: &AppState) {
    write::notify(state, json!({ "keys": ["db:aiPage", "db:aiPage:stats"] })).await;
}

pub(crate) async fn create(state: &AppState, entry: &Entry, input: Value) -> anyhow::Result<Value> {
    anyhow::ensure!(!input.is_null(), "body is null");
    let mut data = Map::new();
    for f in entry.fields {
        if let Some(v) = column(f.create, &input, f.name)? {
            data.insert(f.name.into(), v);
        }
        // A skill's category must exist before the rest is looked at.
        if f.name == "categoryId" {
            exists(&state.db, "AiSkillCategory", "Skill category", data[f.name].as_str().unwrap_or_default()).await?;
        }
    }
    let order = match integer(input.get("displayOrder"), "displayOrder", 1_000_000)? {
        Some(n) => n,
        // New entries go to the top; skills are ordered within their category.
        None => {
            let sql = format!(r#"SELECT min("displayOrder") FROM "{}" t WHERE $1::text IS NULL OR to_jsonb(t)->>'categoryId' = $1"#, entry.table.name);
            let category = data.get("categoryId").and_then(Value::as_str);
            let min: Option<i32> = sqlx::query_scalar(&sql).bind(category).fetch_one(&state.db).await?;
            min.map_or(0, |m| i64::from(m) - 1)
        }
    };
    data.insert("displayOrder".into(), order.into());
    let row = write::insert(&state.db, entry.table, data).await?;
    changed(state).await;
    Ok(json!({ entry.reply: row }))
}

pub(crate) async fn update(state: &AppState, entry: &Entry, id: &str, patch: Value) -> anyhow::Result<Value> {
    exists(&state.db, entry.table.name, entry.what, id).await?;
    anyhow::ensure!(!patch.is_null(), "body is null");
    let mut data = Map::new();
    for f in entry.fields {
        if patch.get(f.name).is_none() {
            continue;
        }
        if let Some(v) = column(f.update, &patch, f.name)? {
            data.insert(f.name.into(), v);
        }
        if f.name == "categoryId" {
            exists(&state.db, "AiSkillCategory", "Skill category", data[f.name].as_str().unwrap_or_default()).await?;
        }
    }
    if patch.get("displayOrder").is_some() {
        data.insert("displayOrder".into(), integer(patch.get("displayOrder"), "displayOrder", 1_000_000)?.unwrap_or(0).into());
    }
    // `accent: null` counts as a field in Next too, and changes nothing.
    if data.is_empty() && !entry.fields.iter().any(|f| patch.get(f.name).is_some()) {
        return Err(invalid("No updatable fields provided.".into()));
    }
    let row = write::update(&state.db, entry.table, id, data).await?;
    changed(state).await;
    Ok(json!({ entry.reply: row }))
}

pub(crate) async fn remove(state: &AppState, entry: &Entry, id: &str) -> anyhow::Result<Value> {
    exists(&state.db, entry.table.name, entry.what, id).await?;
    write::delete(&state.db, entry.table.name, id).await?;
    changed(state).await;
    Ok(json!({ "deletedId": id }))
}

// ── backfill ───────────────────────────────────────────────────────────────────────────────────────────

/// `a.key || b`
fn or(value: &Value, fallback: Value) -> Value {
    if truthy(value) { value.clone() } else { fallback }
}

/// `seedDefaultsIfEmpty`: fill each empty table from the stored page, else from the bundled defaults.
async fn seed(state: &AppState, defaults: &Value) -> anyhow::Result<Value> {
    let db = &state.db;
    let stored = pages::try_singleton(db, "AiPage", true).await?;
    let source = if stored["sections"].is_array() { &stored } else { defaults };
    let section = |config: &Value, kind: &str, key: &str| -> Option<Vec<Value>> {
        // `byType`: the last section of a type wins.
        let found = config["sections"].as_array()?.iter().rev().find(|s| s["type"] == kind)?;
        found["data"][key].as_array().cloned()
    };
    let pick = |kind: &str, key: &str| section(source, kind, key).or_else(|| section(defaults, kind, key)).unwrap_or_default();
    let empty = async |table: &str| -> anyhow::Result<bool> {
        Ok(!sqlx::query_scalar::<_, bool>(&format!(r#"SELECT EXISTS(SELECT 1 FROM "{table}")"#)).fetch_one(db).await?)
    };
    let add = async |table: &'static Table, doc: Value| write::insert(db, table, write::prepare(table, &doc)?).await;
    let (mut skills, mut recommendations, mut credits, mut prompts) = (0, 0, 0, 0);

    if empty("AiSkillCategory").await? {
        for (position, cat) in pick("skills", "categories").iter().enumerate() {
            let row = add(&CATEGORY, json!({ "label": cat["label"], "accent": or(&cat["accent"], ACCENT.into()), "displayOrder": position })).await?;
            for (i, item) in cat["items"].as_array().into_iter().flatten().enumerate() {
                let doc = json!({
                    "categoryId": row["_id"], "name": item["name"], "description": or(&item["description"], "".into()),
                    "url": or(&item["url"], Value::Null), "displayOrder": i,
                });
                add(&SKILL, doc).await?;
                skills += 1;
            }
        }
    }
    if empty("AiRecommendation").await? {
        for (i, c) in pick("recommendations", "cards").iter().enumerate() {
            let doc = json!({
                "name": c["name"], "url": or(&c["url"], "".into()), "rating": if c["rating"].is_number() { c["rating"].clone() } else { 5.into() },
                "accent": or(&c["accent"], ACCENT.into()), "blurb": or(&c["blurb"], "".into()),
                "tags": if c["tags"].is_array() { c["tags"].clone() } else { json!([]) }, "displayOrder": i,
            });
            add(&RECOMMENDATION, doc).await?;
            recommendations += 1;
        }
    }
    if empty("AiCredit").await? {
        for (i, r) in pick("credits", "rows").iter().enumerate() {
            let doc = json!({
                "name": r["name"], "offer": or(&r["offer"], "".into()), "url": or(&r["url"], "".into()), "noCard": r["noCard"] != false,
                "freeApi": r["freeApi"] != false, "note": or(&r["note"], "".into()), "displayOrder": i,
            });
            add(&CREDIT, doc).await?;
            credits += 1;
        }
    }
    if empty("AiPrompt").await? {
        for (i, p) in pick("prompts", "items").iter().enumerate() {
            let doc = json!({ "title": p["title"], "role": or(&p["role"], "".into()), "prompt": or(&p["prompt"], "".into()), "displayOrder": i });
            add(&PROMPT, doc).await?;
            prompts += 1;
        }
    }
    changed(state).await;
    Ok(json!({ "seeded": { "skills": skills, "recommendations": recommendations, "credits": credits, "prompts": prompts } }))
}

// ── handlers ───────────────────────────────────────────────────────────────────────────────────────────

fn failure(status: StatusCode, message: &str) -> Response {
    json_status(status, json!({ "ok": false, "error": message }))
}

/// `handleWrite`: the session or the token, a body that may be empty, `{ ok: true, … }`.
async fn handle<F>(state: &AppState, req: Request, run: F) -> Response
where
    F: AsyncFnOnce(Value) -> anyhow::Result<Value>,
{
    let (parts, body) = req.into_parts();
    if !signed_in(state, &parts.headers).await && !write::bearer(state, &parts.headers).await {
        return failure(StatusCode::UNAUTHORIZED, "Unauthorized");
    }
    let body = write::json_body(body).await.unwrap_or_else(|| json!({}));
    match run(body).await {
        Ok(result) => {
            let mut out = Map::new();
            out.insert("ok".into(), true.into());
            out.extend(result.as_object().cloned().unwrap_or_default());
            json_status(StatusCode::OK, Value::Object(out))
        }
        Err(err) => match err.downcast_ref::<Refused>() {
            Some(Refused(status, message)) => failure(*status, message),
            None => {
                log_error("/api/ai", &err);
                failure(StatusCode::INTERNAL_SERVER_ERROR, "Internal error")
            }
        },
    }
}

macro_rules! handlers {
    ($entry:ident, $create:ident, $update:ident, $delete:ident) => {
        pub async fn $create(State(state): State<AppState>, req: Request) -> Response {
            handle(&state, req, async |body| create(&state, &$entry, body).await).await
        }
        pub async fn $update(State(state): State<AppState>, Path(id): Path<String>, req: Request) -> Response {
            handle(&state, req, async |body| update(&state, &$entry, &id, body).await).await
        }
        pub async fn $delete(State(state): State<AppState>, Path(id): Path<String>, req: Request) -> Response {
            handle(&state, req, async |_| remove(&state, &$entry, &id).await).await
        }
    };
}

handlers!(CATEGORIES, create_category, update_category, delete_category);
handlers!(SKILLS, create_skill, update_skill, delete_skill);
handlers!(RECOMMENDATIONS, create_recommendation, update_recommendation, delete_recommendation);
handlers!(CREDITS, create_credit, update_credit, delete_credit);
handlers!(PROMPTS, create_prompt, update_prompt, delete_prompt);

/// `POST /api/ai/seed`
pub async fn post_seed(State(state): State<AppState>, req: Request) -> Response {
    let (parts, _) = req.into_parts();
    if !signed_in(&state, &parts.headers).await && !write::bearer(&state, &parts.headers).await {
        return failure(StatusCode::UNAUTHORIZED, "Unauthorized");
    }
    let result = match &state.web {
        Some(web) => seed(&state, &web.ai_defaults).await,
        None => Err(anyhow::anyhow!("AI defaults are not loaded")),
    };
    match result {
        Ok(seeded) => json_status(StatusCode::OK, json!({ "ok": true, "seeded": seeded["seeded"] })),
        Err(err) => {
            log_error("/api/ai/seed", &err);
            failure(StatusCode::INTERNAL_SERVER_ERROR, "Failed to seed AI sections")
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn field_rules_match_node() {
        let get = |rule, input: Value| column(rule, &input, "f").map_err(|e| e.to_string());
        assert_eq!(get(Required(3), json!({})), Err("Missing required field: f".into()));
        assert_eq!(get(Required(3), json!({ "f": " " })), Err("Field \"f\" must not be empty.".into()));
        assert_eq!(get(Required(3), json!({ "f": "abcd" })), Err("Field \"f\" exceeds 3 characters.".into()));
        assert_eq!(get(Optional(9, "d"), json!({ "f": "" })), Ok(Some(json!("d"))));
        assert_eq!(get(Nullable(9), json!({})), Ok(Some(Value::Null)));
        assert_eq!(get(Flag, json!({ "f": "false" })), Ok(Some(json!(false))));
        assert_eq!(get(Flag, json!({})), Ok(Some(json!(true))));
        assert_eq!(get(Number(5, 5), json!({ "f": "9" })), Ok(Some(json!(5))));
        assert_eq!(get(Number(5, 5), json!({ "f": "x" })), Err("Field \"f\" must be a number.".into()));
        assert_eq!(get(Tags, json!({ "f": ["a", "", 2] })), Ok(Some(json!(["a", "2"]))));
        assert!(get(Tags, json!({ "f": "a" })).is_err());
    }
}
