//! AI Hub data: `getAiPageData` (src/lib/dataFetchers.js) with `hydrateAiSections` (src/lib/aiSections.js),
//! and the sub-page table from src/lib/aiSubPages.js.

use serde_json::{Value, json};
use sqlx::PgPool;

/// `AI_SUBPAGES`: (section type, URL slug, fallback title).
pub const SUBPAGES: &[(&str, &str, &str)] = &[
    ("skills", "skills", "AI Skills & Specializations"),
    ("recommendations", "stack", "The Recommended Stack"),
    ("credits", "free-credits", "Free Credits & Free Tiers"),
    ("prompts", "prompt-library", "Prompt Library"),
];

/// `findRenderableSection`: the first enabled section of `kind`.
pub fn renderable_section<'a>(config: &'a Value, kind: &str) -> Option<&'a Value> {
    config["sections"].as_array()?.iter().find(|s| s["type"] == kind && s["enabled"] != Value::Bool(false))
}

/// Render shapes of the four DB-backed sections, built in SQL (same order and fields as the JS builders).
const SKILLS: &str = r#"WITH items AS (
        SELECT s."categoryId", json_agg(CASE WHEN COALESCE(s.url, '') <> ''
                 THEN json_build_object('id', s.id, 'name', s.name, 'description', s.description, 'url', s.url)
                 ELSE json_build_object('id', s.id, 'name', s.name, 'description', s.description) END
               ORDER BY s."displayOrder" ASC, s."createdAt" DESC) AS items
        FROM "AiSkill" s GROUP BY s."categoryId")
    SELECT COALESCE(json_agg(json_build_object('id', c.id, 'label', c.label, 'accent', c.accent, 'items', COALESCE(i.items, '[]'::json))
           ORDER BY c."displayOrder" ASC, c."createdAt" DESC), '[]'::json)
    FROM "AiSkillCategory" c LEFT JOIN items i ON i."categoryId" = c.id"#;
const RECOMMENDATIONS: &str = r#"SELECT COALESCE(json_agg(json_build_object('id', id, 'name', name, 'url', url, 'rating', rating, 'accent', accent,
        'blurb', blurb, 'tags', COALESCE(to_json(tags), '[]'::json)) ORDER BY "displayOrder" ASC, "createdAt" DESC), '[]'::json)
    FROM "AiRecommendation""#;
const CREDITS: &str = r#"SELECT COALESCE(json_agg(json_build_object('id', id, 'name', name, 'offer', offer, 'url', url, 'noCard', "noCard",
        'freeApi', "freeApi", 'note', note) ORDER BY "displayOrder" ASC, "createdAt" DESC), '[]'::json)
    FROM "AiCredit""#;
const PROMPTS: &str = r#"SELECT COALESCE(json_agg(json_build_object('id', id, 'title', title, 'role', role, 'prompt', prompt)
        ORDER BY "displayOrder" ASC, "createdAt" DESC), '[]'::json)
    FROM "AiPrompt""#;

async fn list(db: &PgPool, sql: &str) -> anyhow::Result<Value> {
    Ok(sqlx::query_scalar::<_, Value>(sql).fetch_one(db).await?)
}

/// The render shape of one DB-backed section (`skillsData`, `recommendationsData`, ...), with its list key.
pub async fn section(db: &PgPool, kind: &str) -> anyhow::Result<Value> {
    Ok(match kind {
        "skills" => json!({ "categories": list(db, SKILLS).await? }),
        "recommendations" => json!({ "cards": list(db, RECOMMENDATIONS).await? }),
        "credits" => json!({ "rows": list(db, CREDITS).await? }),
        "prompts" => json!({ "items": list(db, PROMPTS).await? }),
        _ => anyhow::bail!("unknown AI section {kind}"),
    })
}

/// The stored skeleton, or DEFAULT_AI_PAGE when no sections are saved (normalizeAiPageConfig).
pub async fn skeleton(db: &PgPool, defaults: &Value) -> anyhow::Result<Value> {
    let stored = crate::pages::try_singleton(db, "AiPage", true).await?;
    Ok(if stored["sections"].as_array().is_some_and(|s| !s.is_empty()) { stored } else { defaults.clone() })
}

/// `hydrateAiSections(skeleton)`: what `GET /api/ai-page` serves.
pub async fn hydrated(db: &PgPool, defaults: &Value) -> anyhow::Result<Value> {
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
pub async fn page_data(db: &PgPool, defaults: &Value) -> anyhow::Result<(Value, Value)> {
    Ok((hydrated(db, defaults).await?, stats(db).await))
}

/// `computeAiStats`: zeroed on error, like the JS.
async fn stats(db: &PgPool) -> Value {
    let row: Result<(i64, i64, i64, i64, i64, i64), _> = sqlx::query_as(
        r#"SELECT count(*), COALESCE(sum("totalTokens"), 0)::bigint, COALESCE(sum("inputTokens"), 0)::bigint,
                  COALESCE(sum("outputTokens"), 0)::bigint,
                  COALESCE(sum("totalTokens") FILTER (WHERE "createdAt" >= (now() AT TIME ZONE 'UTC') - interval '7 days'), 0)::bigint,
                  count(*) FILTER (WHERE "createdAt" >= (now() AT TIME ZONE 'UTC') - interval '7 days')
           FROM "AiLog""#,
    )
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
