//! Public legal pages data (src/lib/legal.js): `/<app>` and `/<app>/<doc>`.

use serde_json::{Value, json};
use sqlx::PgPool;

use crate::pages::{entity_slug, to_client_row};

/// `RESERVED_LEGAL_SLUGS`: first path segments a legal app can never take.
const RESERVED: &[&str] = &[
    "admin", "api", "v1", "v2", "docs", "games", "desktop", "workers", "apps", "projects", "blogs", "gallery", "github", "ai",
    "about-me", "contact-us", "sitemap", "work-in-progress", "live-deployments", "about", "contact", "blog", "app", "project",
    "deployments", "uploads", "images", "public", "doom", "hf", "screenshots", "legal", "resume", "search", "login", "auth",
];

/// `SLUG_PATTERN` (`^[a-z0-9]+(?:-[a-z0-9]+)*$`) and not reserved. Checked before any database read, so the
/// catch-all routes cost nothing for paths that can never be legal pages (files, /api/..., ...).
pub fn candidate(slug: &str) -> Option<String> {
    let s = slug.trim().to_lowercase();
    let valid = !s.is_empty()
        && s.split('-').all(|part| !part.is_empty() && part.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit()));
    (valid && !RESERVED.contains(&s.as_str())).then_some(s)
}

/// `getPublicLegalApp`: the app with only its published documents.
pub async fn public_app(db: &PgPool, slug: &str) -> anyhow::Result<Option<Value>> {
    let row: Option<String> = sqlx::query_scalar(r#"SELECT row_to_json(t)::text FROM "LegalApp" t WHERE slug = $1"#).bind(slug).fetch_optional(db).await?;
    let Some(raw) = row else { return Ok(None) };
    let mut app = to_client_row(serde_json::from_str(&raw)?);
    let id = app["_id"].as_str().unwrap_or_default().to_string();
    // `id` is a cuid from the row above; bound, never interpolated as text from the request.
    let docs = sqlx::query_scalar::<_, String>(
        r#"SELECT row_to_json(t)::text FROM "LegalDocument" t WHERE "appId" = $1 AND published ORDER BY "displayOrder" ASC, "createdAt" DESC"#,
    )
    .bind(&id)
    .fetch_all(db)
    .await?;
    let docs: Vec<Value> = docs.iter().filter_map(|d| serde_json::from_str(d).ok()).map(to_client_row).collect();
    app["documents"] = Value::Array(docs);
    Ok(Some(app))
}

/// `getLegalAppShowcase`: `{ app, project }` cards for the linked /apps entry and its project.
pub async fn showcase(db: &PgPool, app: &Value) -> anyhow::Result<Value> {
    let Some(dep_id) = app["deploymentId"].as_str().filter(|d| !d.is_empty()) else { return Ok(json!({ "app": null, "project": null })) };
    let Some(d) = by_id(db, "Deployment", dep_id).await? else {
        return Ok(json!({ "app": null, "project": null }));
    };
    let s = |v: &Value, k: &str| v[k].as_str().unwrap_or_default().to_string();
    let card = json!({
        "name": d["name"], "description": s(&d, "description"), "image": s(&d, "image"), "status": s(&d, "status"),
        "type": s(&d, "appType"), "techStack": d["techStack"].as_array().cloned().unwrap_or_default(),
        "externalUrl": s(&d, "hostedUrl"), "href": format!("/apps/{}", entity_slug(&d, "app")),
    });
    let project = match d["projectId"].as_str().filter(|p| !p.is_empty()) {
        Some(pid) => by_id(db, "Project", pid).await?,
        None => None,
    };
    let project = project.map(|p| {
        let kind: Vec<&str> = [p["projectType"].as_str(), p["year"].as_str()].into_iter().flatten().filter(|v| !v.is_empty()).collect();
        json!({
            "name": p["name"], "description": s(&p, "description"), "image": s(&p, "image"), "status": s(&p, "status"),
            "type": kind.join(" · "), "techStack": p["techStack"].as_array().cloned().unwrap_or_default(),
            "externalUrl": s(&p, "codeLink"), "language": s(&p["repoData"], "language"),
            "stars": p["repoData"]["stars"].as_f64().unwrap_or(0.0), "href": format!("/projects/{}", entity_slug(&p, "project")),
        })
    });
    Ok(json!({ "app": card, "project": project }))
}

/// `getLinkedDeployment`: `{ name, href, hostedUrl }` of the /apps entry a legal app points at.
pub async fn linked_deployment(db: &PgPool, app: &Value) -> anyhow::Result<Value> {
    let Some(dep_id) = app["deploymentId"].as_str().filter(|d| !d.is_empty()) else { return Ok(Value::Null) };
    Ok(match by_id(db, "Deployment", dep_id).await? {
        Some(d) => json!({ "name": d["name"], "href": format!("/apps/{}", entity_slug(&d, "app")), "hostedUrl": d["hostedUrl"].as_str().unwrap_or_default() }),
        None => Value::Null,
    })
}

/// One row by id, client-shaped. `table` is a constant from this module.
async fn by_id(db: &PgPool, table: &str, id: &str) -> anyhow::Result<Option<Value>> {
    let sql = format!(r#"SELECT row_to_json(t)::text FROM "{table}" t WHERE id = $1"#);
    let raw: Option<String> = sqlx::query_scalar(&sql).bind(id).fetch_optional(db).await?;
    Ok(match raw {
        Some(r) => Some(to_client_row(serde_json::from_str(&r)?)),
        None => None,
    })
}

#[cfg(test)]
mod tests {
    use super::candidate;

    #[test]
    fn only_plain_unreserved_slugs() {
        assert_eq!(candidate("Rewire").as_deref(), Some("rewire"));
        assert!(candidate("robots.txt").is_none() && candidate("api").is_none() && candidate("a--b").is_none());
        assert!(candidate("-a").is_none() && candidate("").is_none() && candidate("favicon.ico").is_none());
    }
}
