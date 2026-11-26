//! AI Hub data: `getAiPageData` (src/lib/dataFetchers.js) with `hydrateAiSections` (src/lib/aiSections.js),
//! and the sub-page table from src/lib/aiSubPages.js.

use serde_json::{Value, json};
use crate::db::{Db, Stamp};

/// `AI_SUBPAGES`: (section type, URL slug, fallback title).
pub const SUBPAGES: &[(&str, &str, &str)] = &[
    ("skills", "skills", "AI Skills & Specializations"),
    ("recommendations", "stack", "The Recommended Stack"),
    ("credits", "free-credits", "Free Credits & Free Tiers"),
    ("prompts", "prompt-library", "Prompt Library"),
];

/// `resolveSubPageThreshold`: how many entries of a section the hub shows.
fn threshold(config: &Value) -> usize {
    let number = match config.get("subPageThreshold") {
        None => f64::NAN,
        Some(Value::Null) => 0.0,
        Some(Value::Bool(b)) => f64::from(u8::from(*b)),
        Some(Value::Number(n)) => n.as_f64().unwrap_or(f64::NAN),
        Some(Value::String(s)) if s.trim().is_empty() => 0.0,
        Some(Value::String(s)) => s.trim().parse().unwrap_or(f64::NAN),
        _ => f64::NAN,
    };
    if number.is_finite() { number.round().clamp(1.0, 500.0) as usize } else { 12 }
}

/// Cuts each long section of the hub to what it shows, plus one entry so the view knows there is more, and records
/// the real number in `totalCount`. Returns how many entries are shown.
pub fn preview(config: &mut Value) -> usize {
    let shown = threshold(config);
    let Some(sections) = config.get_mut("sections").and_then(Value::as_array_mut) else { return shown };
    for section in sections {
        let key = match section["type"].as_str() {
            Some("skills") => "categories",
            Some("recommendations") => "cards",
            Some("credits") => "rows",
            Some("prompts") => "items",
            _ => continue,
        };
        let Some(list) = section["data"][key].as_array() else { continue };
        let nested = key == "categories";
        let total: usize = if nested { list.iter().map(|c| c["items"].as_array().map_or(0, Vec::len)).sum() } else { list.len() };
        if total <= shown {
            continue;
        }
        if let Some(list) = section["data"][key].as_array_mut() {
            if nested {
                let mut left = shown + 1;
                for items in list.iter_mut().filter_map(|c| c.get_mut("items").and_then(Value::as_array_mut)) {
                    items.truncate(left);
                    left -= items.len();
                }
            } else {
                list.truncate(shown + 1);
            }
        }
        section["totalCount"] = total.into();
    }
    shown
}

/// `findRenderableSection`: the first enabled section of `kind`.
pub fn renderable_section<'a>(config: &'a Value, kind: &str) -> Option<&'a Value> {
    config["sections"].as_array()?.iter().find(|s| s["type"] == kind && s["enabled"] != Value::Bool(false))
}

/// Render shapes of the four DB-backed sections, built in SQL (same order and fields as the JS builders).
const SKILLS: &str = r#"WITH items AS (
        SELECT s."categoryId", json_group_array(json(CASE WHEN COALESCE(s.url, '') <> ''
                 THEN json_object('id', s.id, 'name', s.name, 'description', s.description, 'url', s.url)
                 ELSE json_object('id', s.id, 'name', s.name, 'description', s.description) END)
               ORDER BY s."displayOrder" ASC, s."createdAt" DESC) AS items
        FROM "AiSkill" s GROUP BY s."categoryId")
    SELECT json_group_array(json_object('id', c.id, 'label', c.label, 'accent', c.accent, 'items', json(COALESCE(i.items, '[]')))
           ORDER BY c."displayOrder" ASC, c."createdAt" DESC)
    FROM "AiSkillCategory" c LEFT JOIN items i ON i."categoryId" = c.id"#;
const RECOMMENDATIONS: &str = r#"SELECT json_group_array(json_object('id', id, 'name', name, 'url', url, 'rating', rating, 'accent', accent,
        'blurb', blurb, 'tags', json(COALESCE(tags, '[]'))) ORDER BY "displayOrder" ASC, "createdAt" DESC)
    FROM "AiRecommendation""#;
const CREDITS: &str = r#"SELECT json_group_array(json_object('id', id, 'name', name, 'offer', offer, 'url', url,
        'noCard', json(iif("noCard", 'true', 'false')), 'freeApi', json(iif("freeApi", 'true', 'false')), 'note', note)
        ORDER BY "displayOrder" ASC, "createdAt" DESC)
    FROM "AiCredit""#;
const PROMPTS: &str = r#"SELECT json_group_array(json_object('id', id, 'title', title, 'role', role, 'prompt', prompt)
        ORDER BY "displayOrder" ASC, "createdAt" DESC)
    FROM "AiPrompt""#;

async fn list(db: &Db, sql: &str) -> anyhow::Result<Value> {
    Ok(serde_json::from_str(&sqlx::query_scalar::<_, String>(sql).fetch_one(db).await?)?)
}

/// The render shape of one DB-backed section (`skillsData`, `recommendationsData`, ...), with its list key.
pub async fn section(db: &Db, kind: &str) -> anyhow::Result<Value> {
    Ok(match kind {
        "skills" => json!({ "categories": list(db, SKILLS).await? }),
        "recommendations" => json!({ "cards": list(db, RECOMMENDATIONS).await? }),
        "credits" => json!({ "rows": list(db, CREDITS).await? }),
        "prompts" => json!({ "items": list(db, PROMPTS).await? }),
        _ => anyhow::bail!("unknown AI section {kind}"),
    })
}

/// The stored skeleton, or DEFAULT_AI_PAGE when no sections are saved (normalizeAiPageConfig).
pub async fn skeleton(db: &Db, defaults: &Value) -> anyhow::Result<Value> {
    let stored = crate::pages::try_singleton(db, "AiPage", true).await?;
    Ok(if stored["sections"].as_array().is_some_and(|s| !s.is_empty()) { stored } else { defaults.clone() })
}

/// `hydrateAiSections(skeleton)`: what `GET /api/ai-page` serves.
pub async fn hydrated(db: &Db, defaults: &Value) -> anyhow::Result<Value> {
    let mut config = skeleton(db, defaults).await?;
    let mut shaped = vec![];
    for (kind, key) in [("skills", "categories"), ("recommendations", "cards"), ("credits", "rows"), ("prompts", "items")] {
        shaped.push((kind, section(db, kind).await?, key));
    }
    if let Some(sections) = config.get_mut("sections").and_then(Value::as_array_mut) {
        for section in sections.iter_mut() {
            let Some((_, data, key)) = shaped.iter().find(|(k, ..)| section["type"] == *k) else { continue };
            // An empty table keeps the stored skeleton data (hydrateAiSections).
            if data[*key].as_array().is_some_and(|a| !a.is_empty()) {
                if let Some(obj) = section.as_object_mut() {
                    obj.insert("data".into(), data.clone());
                }
            }
        }
    }
    Ok(config)
}

/// `{ config, stats }` as the AI Hub pages get them. `defaults` is DEFAULT_AI_PAGE (exported by the Vite build).
pub async fn page_data(db: &Db, defaults: &Value) -> anyhow::Result<(Value, Value)> {
    Ok((hydrated(db, defaults).await?, stats(db).await))
}

/// `computeAiStats`: zeroed on error, like the JS.
async fn stats(db: &Db) -> Value {
    let row: Result<(i64, i64, i64, i64, i64, i64), _> = sqlx::query_as(
        r#"SELECT count(*), COALESCE(sum("totalTokens"), 0), COALESCE(sum("inputTokens"), 0),
                  COALESCE(sum("outputTokens"), 0),
                  COALESCE(sum("totalTokens") FILTER (WHERE "createdAt" >= $1), 0),
                  count(*) FILTER (WHERE "createdAt" >= $1)
           FROM "AiLog""#,
    )
    .bind(Stamp(chrono::Utc::now().naive_utc() - chrono::TimeDelta::days(7)))
    .fetch_one(db)
    .await;
    let top = |col: &str| format!(r#"SELECT "{col}", count("{col}") FROM "AiLog" GROUP BY "{col}" ORDER BY count("{col}") DESC LIMIT 1"#);
    let model: Option<(String, i64)> = sqlx::query_as(&top("model")).fetch_optional(db).await.unwrap_or(None);
    let provider: Option<(String, i64)> = sqlx::query_as(&top("provider")).fetch_optional(db).await.unwrap_or(None);
    let (calls, tokens, input, output, tokens7, calls7) = row.unwrap_or_default();
    json!({
        "totalCalls": calls, "totalTokens": tokens, "inputTokens": input, "outputTokens": output,
        "tokens7d": tokens7, "calls7d": calls7,
        "topModel": model.as_ref().map(|m| m.0.clone()), "topModelCalls": model.map(|m| m.1).unwrap_or(0),
        "topProvider": provider.map(|p| p.0),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_hub_keeps_one_entry_more_than_it_shows() {
        let mut config = json!({ "subPageThreshold": 2, "sections": [
            { "type": "skills", "data": { "categories": [{ "items": [1] }, { "items": [2, 3, 4] }, { "items": [5] }] } },
            { "type": "credits", "data": { "rows": [1, 2] } },
            { "type": "prompts", "data": { "items": [1, 2, 3, 4] } },
            { "type": "stats", "data": {} },
        ] });
        assert_eq!(preview(&mut config), 2);
        assert_eq!(config["sections"][0]["data"]["categories"], json!([{ "items": [1] }, { "items": [2, 3] }, { "items": [] }]));
        assert_eq!(config["sections"][0]["totalCount"], 5);
        assert_eq!(config["sections"][1], json!({ "type": "credits", "data": { "rows": [1, 2] } }));
        assert_eq!((config["sections"][2]["data"]["items"].clone(), config["sections"][2]["totalCount"].clone()), (json!([1, 2, 3]), json!(4)));
    }

    #[test]
    fn the_threshold_reads_like_javascript() {
        for (value, want) in [(json!({}), 12), (json!({ "subPageThreshold": null }), 1), (json!({ "subPageThreshold": "30" }), 30), (json!({ "subPageThreshold": 9000 }), 500), (json!({ "subPageThreshold": "x" }), 12)] {
            assert_eq!(threshold(&value), want, "{value}");
        }
    }
}
