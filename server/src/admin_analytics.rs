//! `/api/admin/analytics`: the dashboard numbers (totals and the daily series from the `AnalyticsDaily` rollup,
//! top lists from the raw events), and the reset.

use crate::db::{self, Stamp};
use axum::{
    extract::{RawQuery, State},
    http::{HeaderMap, StatusCode},
    response::Response,
};
use chrono::{Days, NaiveDate, NaiveDateTime, NaiveTime, Utc};
use serde_json::{Map, Value, json};
use std::collections::HashMap;

use crate::{
    AppState,
    admin_settings::{failed, unauthorized},
    api::{json_status, query_map, signed_in},
};

/// Totals per event type; uniques are counted for page views only.
#[derive(Default)]
struct Totals {
    views: i64,
    uniques: i64,
    entity_views: i64,
    contacts: i64,
    clicks: i64,
}

impl Totals {
    fn add(&mut self, kind: &str, views: i64, uniques: i64) {
        match kind {
            "pageview" => {
                self.views += views;
                self.uniques += uniques;
            }
            "entity_view" => self.entity_views += views,
            "contact_submit" => self.contacts += views,
            "outbound_click" => self.clicks += views,
            _ => {}
        }
    }

    fn json(&self) -> Map<String, Value> {
        let Value::Object(m) = json!({
            "views": self.views, "uniques": self.uniques, "entityViews": self.entity_views,
            "contacts": self.contacts, "outboundClicks": self.clicks,
        }) else {
            return Map::new();
        };
        m
    }
}

/// Title and description of the fixed pages.
fn static_page(path: &str) -> Option<(&'static str, &'static str)> {
    Some(match path {
        "/" => ("Home Page", "Landing screen featuring profile overview, recent blogs, and featured projects."),
        "/blogs" => ("Blogs Listing Page", "Chronological feed of all published articles and tech writings."),
        "/projects" => ("Projects Portfolio", "Showcase of developer projects, open-source libraries, and contributions."),
        "/apps" | "/live-deployments" => ("Apps & Live Deployments", "Directory of active cloud deployments, live websites, and server environments."),
        "/gallery" => ("Visual Gallery", "Curated collection of photography, design works, and visual assets."),
        "/about-me" => ("About Me", "Summary of professional experience, skills, and certifications."),
        "/contact-us" => ("Contact Info", "Get in touch form and professional email/location details."),
        "/github" => ("GitHub Stats", "Aggregated open-source contribution metrics and repository statistics."),
        _ => return None,
    })
}

/// A content section of the site: path prefix, the table behind it, its title, image and text columns, and what to
/// show when the slug matches nothing.
const SECTIONS: [(&str, &str, [&str; 3], [&str; 2]); 3] = [
    ("/blogs/", "Blog", ["title", "image", "excerpt"], ["Blog Article", "A published article on this site."]),
    ("/projects/", "Project", ["name", "image", "description"], ["Project Details", "A showcase project description."]),
    ("/apps/", "Deployment", ["name", "image", "description"], ["App Details", "Deployment details for a live application."]),
];

async fn top_page(state: &AppState, path: String, views: i64) -> anyhow::Result<Value> {
    let (title, image, description) = if let Some((title, description)) = static_page(&path) {
        (json!(title), json!(""), json!(description))
    } else if let Some((slug, (_, table, [name, image, text], fallback))) =
        SECTIONS.iter().find_map(|s| path.strip_prefix(s.0).map(|slug| (slug, *s)))
    {
        let sql = format!(r#"SELECT "{name}", "{image}", "{text}" FROM "{table}" WHERE slug = $1 LIMIT 1"#);
        let row: Option<(Option<String>, Option<String>, Option<String>)> = sqlx::query_as(&sql).bind(slug).fetch_optional(&state.db).await?;
        match row {
            Some((a, b, c)) => (json!(a), json!(b), json!(c)),
            None => (json!(fallback[0]), json!(""), json!(fallback[1])),
        }
    } else {
        (json!(format!("Page: {path}")), json!(""), json!("A public page on this website."))
    };
    Ok(json!({ "path": path, "views": views, "title": title, "image": image, "description": description }))
}

/// The preview text of each referrer kind.
fn referrer_preview(kind: &str) -> (String, &'static str) {
    let (title, description) = match kind {
        "direct" => ("Direct Traffic", "Visitors who typed the URL directly, opened a bookmark, or clicked a link in offline applications (e.g. email, chat apps, PDFs)."),
        "internal" => ("Internal Navigation", "Transitions and page navigations occurring within this website."),
        "search" => ("Search Engines", "Traffic originating from search engine results (Google, Bing, Yahoo, DuckDuckGo, Baidu, Yandex, etc.)."),
        "social" => ("Social Media & Dev Platforms", "Traffic originating from social media feeds, profile links, or developer networks (GitHub, LinkedIn, Twitter/X, Instagram, YouTube, Reddit, Medium, Hacker News)."),
        "external" => ("External Websites", "Referrals from other independent domains that do not fall under search engines or social media networks."),
        other => return (other.to_string(), "Traffic originating from this referrer source."),
    };
    (title.to_string(), description)
}

/// Adds title, image and description to the listed entities that still exist.
async fn name_entities(state: &AppState, kind: &str, items: &mut [Value]) -> anyhow::Result<()> {
    let columns = match kind {
        "blog" => ("Blog", "title", "image", "excerpt"),
        "project" => ("Project", "name", "image", "description"),
        "app" => ("Deployment", "name", "image", "description"),
        // A gallery item's title and picture are derived below.
        "gallery" => ("Gallery", "description", "COALESCE(NULLIF(thumbnail, ''), src)", "description"),
        _ => return Ok(()),
    };
    let (table, title, image, text) = columns;
    let ids: Vec<String> = items.iter().filter_map(|i| i["id"].as_str().filter(|s| !s.is_empty()).map(str::to_string)).collect();
    let sql = format!(r#"SELECT id, {title}, {image}, {text} FROM "{table}" WHERE id IN (SELECT value FROM json_each($1))"#);
    let rows: Vec<(String, Option<String>, Option<String>, Option<String>)> = sqlx::query_as(&sql).bind(db::json_list(&ids)).fetch_all(&state.db).await?;
    for item in items {
        let Some((_, title, image, text)) = rows.iter().find(|r| item["id"] == r.0.as_str()) else { continue };
        item["title"] = if kind == "gallery" { json!(gallery_title(title.as_deref())) } else { json!(title) };
        item["image"] = json!(image);
        item["description"] = json!(text);
    }
    Ok(())
}

/// The first 30 UTF-16 units of the description, as `slice(0, 30)` takes them.
fn gallery_title(description: Option<&str>) -> String {
    match description.filter(|d| !d.is_empty()) {
        Some(d) => String::from_utf16_lossy(&d.encode_utf16().take(30).collect::<Vec<_>>()),
        None => "Gallery Item".into(),
    }
}

/// Human page views since `since`, counted per value of `column`, largest first.
async fn breakdown(state: &AppState, column: &str, since: NaiveDateTime) -> anyhow::Result<Vec<(String, i64)>> {
    let sql = format!(
        r#"SELECT "{column}", count(*) FROM "AnalyticsEvent"
           WHERE "createdAt" >= $1 AND NOT "isBot" AND type = 'pageview' AND "{column}" IS NOT NULL
           GROUP BY "{column}" ORDER BY count(*) DESC"#
    );
    Ok(sqlx::query_as(&sql).bind(Stamp(since)).fetch_all(&state.db).await?)
}

async fn dashboard(state: &AppState, range: &str, days: u64) -> anyhow::Result<Value> {
    let first: NaiveDate = Utc::now().date_naive() - Days::new(days - 1);
    let start = first.and_time(NaiveTime::MIN);
    let previous = (first - Days::new(days)).to_string();

    let rows: Vec<(String, String, i32, i32)> =
        sqlx::query_as(r#"SELECT day, type, views, uniques FROM "AnalyticsDaily" WHERE day >= $1 AND "entityType" = ''"#)
            .bind(&previous)
            .fetch_all(&state.db)
            .await?;
    let start_day = first.to_string();
    let (mut totals, mut before) = (Totals::default(), Totals::default());
    let mut by_day: HashMap<String, (i64, i64)> = HashMap::new();
    for (day, kind, views, uniques) in rows {
        if day < start_day {
            before.add(&kind, views.into(), uniques.into());
            continue;
        }
        totals.add(&kind, views.into(), uniques.into());
        if kind == "pageview" {
            let entry = by_day.entry(day).or_default();
            entry.0 += i64::from(views);
            entry.1 += i64::from(uniques);
        }
    }
    let series: Vec<Value> = first
        .iter_days()
        .take(days as usize)
        .map(|d| {
            let day = d.to_string();
            let (views, uniques) = by_day.get(&day).copied().unwrap_or_default();
            json!({ "day": day, "views": views, "uniques": uniques })
        })
        .collect();

    let mut top_pages = Vec::new();
    for (path, views) in breakdown(state, "path", start).await?.into_iter().take(8) {
        top_pages.push(top_page(state, path, views).await?);
    }

    let entities: Vec<(String, Option<String>, Option<String>, i64)> = sqlx::query_as(
        r#"SELECT "entityType", "entityId", "entitySlug", count(*) FROM "AnalyticsEvent"
           WHERE "createdAt" >= $1 AND NOT "isBot" AND type = 'entity_view' AND "entityType" <> ''
           GROUP BY "entityType", "entityId", "entitySlug" ORDER BY count(*) DESC"#,
    )
    .bind(Stamp(start))
    .fetch_all(&state.db)
    .await?;
    let mut grouped: Vec<(String, Vec<Value>)> = Vec::new();
    for (kind, id, slug, views) in entities {
        let item = json!({ "id": id, "slug": slug.filter(|s| !s.is_empty()).or(id.clone()), "views": views });
        match grouped.iter_mut().find(|g| g.0 == kind) {
            Some((_, items)) if items.len() < 6 => items.push(item),
            Some(_) => {}
            None => grouped.push((kind, vec![item])),
        }
    }
    let mut top_entities = Map::new();
    for (kind, mut items) in grouped {
        name_entities(state, &kind, &mut items).await?;
        top_entities.insert(kind, items.into());
    }

    let referrers: Vec<Value> = breakdown(state, "referrerType", start)
        .await?
        .into_iter()
        .map(|(kind, views)| {
            let (title, description) = referrer_preview(&kind);
            json!({ "type": kind, "views": views, "title": title, "description": description })
        })
        .collect();
    let devices: Vec<Value> = breakdown(state, "device", start).await?.into_iter().map(|(kind, views)| json!({ "type": kind, "views": views })).collect();
    let countries: Vec<Value> = breakdown(state, "country", start)
        .await?
        .into_iter()
        .map(|(code, views)| (code.trim().to_uppercase(), views))
        .filter(|(code, _)| code.encode_utf16().count() == 2)
        .map(|(code, views)| json!({ "code": code, "views": views }))
        .collect();
    let bots: i64 = sqlx::query_scalar(r#"SELECT count(*) FROM "AnalyticsEvent" WHERE "createdAt" >= $1 AND "isBot" AND type = 'pageview'"#)
        .bind(Stamp(start))
        .fetch_one(&state.db)
        .await?;

    let mut kpis = totals.json();
    kpis.insert("botViews".into(), bots.into());
    Ok(json!({
        "success": true, "range": range, "kpis": kpis, "prevKpis": before.json(), "series": series, "topPages": top_pages,
        "topEntities": top_entities, "referrers": referrers, "devices": devices, "countries": countries,
    }))
}

/// `GET /api/admin/analytics?range=7d|30d|90d`
pub async fn analytics(State(state): State<AppState>, RawQuery(q): RawQuery, headers: HeaderMap) -> Response {
    if !signed_in(&state, &headers).await {
        return unauthorized();
    }
    let (range, days) = match query_map(&q).get("range").map(String::as_str) {
        Some("7d") => ("7d", 7),
        Some("90d") => ("90d", 90),
        _ => ("30d", 30),
    };
    dashboard(&state, range, days)
        .await
        .map(|v| json_status(StatusCode::OK, v))
        .unwrap_or_else(|err| failed("/api/admin/analytics", StatusCode::INTERNAL_SERVER_ERROR, err))
}

/// `DELETE /api/admin/analytics`: remove every analytics row.
pub async fn reset(State(state): State<AppState>, headers: HeaderMap) -> Response {
    if !signed_in(&state, &headers).await {
        return unauthorized();
    }
    let result: anyhow::Result<Value> = async {
        let events = sqlx::query(r#"DELETE FROM "AnalyticsEvent""#).execute(&state.db).await?.rows_affected();
        let daily = sqlx::query(r#"DELETE FROM "AnalyticsDaily""#).execute(&state.db).await?.rows_affected();
        Ok(json!({ "success": true, "deleted": { "events": events, "daily": daily } }))
    }
    .await;
    result.map(|v| json_status(StatusCode::OK, v)).unwrap_or_else(|err| failed("/api/admin/analytics", StatusCode::INTERNAL_SERVER_ERROR, err))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn totals_count_uniques_for_page_views_only() {
        let mut t = Totals::default();
        for (kind, v, u) in [("pageview", 3, 2), ("entity_view", 4, 9), ("contact_submit", 1, 1), ("other", 7, 7)] {
            t.add(kind, v, u);
        }
        assert_eq!(Value::Object(t.json()), json!({ "views": 3, "uniques": 2, "entityViews": 4, "contacts": 1, "outboundClicks": 0 }));
    }

    #[test]
    fn gallery_titles_are_cut_like_javascript() {
        assert_eq!(gallery_title(Some(&"é".repeat(40))), "é".repeat(30));
        assert_eq!(gallery_title(Some("")), "Gallery Item");
    }
}
