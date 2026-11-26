//! The SEO settings of src/lib/seoConfig.js and the per-page social metadata of src/lib/socialMeta.js. Both live
//! on the `SeoConfig` document.

use serde_json::{Map, Value, json};

use crate::api::truthy;

/// Mirrors DEFAULT_DISALLOW.
const DISALLOW: [&str; 9] =
    ["/admin", "/api/admin", "/api/auth/login", "/api/auth/logout", "/api/config", "/*.json$", "/*?", "/blog/", "/deployments/"];

/// SOCIAL_PAGES keys.
const SOCIAL_PAGES: [&str; 8] = ["/", "/about-me", "/projects", "/apps", "/gallery", "/github", "/contact-us", "/ai"];

fn object(v: &Value) -> Map<String, Value> {
    v.as_object().cloned().unwrap_or_default()
}

fn list(v: &Value) -> Value {
    if v.is_array() { v.clone() } else { json!([]) }
}

/// `mergeSeoConfig(stored)`: the defaults, overridden section by section.
pub fn merge_seo_config(stored: &Value) -> Value {
    let rule = |agent: &str, delay: u8| json!({ "userAgent": agent, "allow": ["/"], "disallow": DISALLOW, "crawlDelay": delay });
    let default_rules = json!([rule("*", 1), rule("Googlebot", 0)]);

    let mut robots = object(&json!({ "rules": default_rules, "extraSitemaps": [] }));
    robots.extend(object(&stored["robots"]));
    let rules = &stored["robots"]["rules"];
    let rules = if rules.as_array().is_some_and(|r| !r.is_empty()) { rules.clone() } else { default_rules };
    robots.insert("rules".into(), rules);
    robots.insert("extraSitemaps".into(), list(&stored["robots"]["extraSitemaps"]));

    let mut sitemap = object(&json!({ "extraUrls": [], "excludePaths": [], "defaultPriorities": {} }));
    sitemap.extend(object(&stored["sitemap"]));
    sitemap.insert("extraUrls".into(), list(&stored["sitemap"]["extraUrls"]));
    sitemap.insert("excludePaths".into(), list(&stored["sitemap"]["excludePaths"]));
    let priorities = &stored["sitemap"]["defaultPriorities"];
    let priorities = if priorities.is_object() || priorities.is_array() { priorities.clone() } else { json!({}) };
    sitemap.insert("defaultPriorities".into(), priorities);

    let mut indexing = object(&json!({ "enabled": false, "autoPing": false }));
    indexing.extend(object(&stored["indexing"]));

    json!({ "robots": robots, "sitemap": sitemap, "indexing": indexing })
}

/// `mergeSocialMeta(input)`: `{ defaultImage, pages }` with every known page present and every text trimmed.
pub fn merge_social_meta(input: &Value) -> Value {
    let text = |v: &Value| v.as_str().map(str::trim).unwrap_or("").to_string();
    let pages: Map<String, Value> = SOCIAL_PAGES
        .iter()
        .map(|&key| {
            let e = &input["pages"][key];
            (key.to_string(), json!({ "title": text(&e["title"]), "description": text(&e["description"]), "image": text(&e["image"]) }))
        })
        .collect();
    json!({ "defaultImage": text(&input["defaultImage"]), "pages": pages })
}

/// `parseServiceAccount`: the client email, or the message the admin sees.
pub fn service_account_email(input: &Value) -> Result<String, String> {
    let parsed;
    let account = match input {
        Value::String(text) => {
            parsed = serde_json::from_str::<Value>(text).map_err(|_| "Service account is not valid JSON.")?;
            &parsed
        }
        other => other,
    };
    if !(account.is_object() || account.is_array()) {
        return Err("Service account must be a JSON object.".into());
    }
    let kind = &account["type"];
    if truthy(kind) && kind != "service_account" {
        return Err(format!("Expected a service_account key, got \"{}\".", crate::site_api::js_string(kind)));
    }
    if !truthy(&account["client_email"]) || !truthy(&account["private_key"]) {
        return Err("Service account is missing client_email or private_key.".into());
    }
    Ok(crate::site_api::js_string(&account["client_email"]))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_stored_data_gives_the_defaults() {
        let c = merge_seo_config(&Value::Null);
        assert_eq!(c["robots"]["rules"][1]["userAgent"], "Googlebot");
        assert_eq!(c["indexing"], json!({ "enabled": false, "autoPing": false }));
        let c = merge_seo_config(&json!({ "robots": { "rules": [], "x": 1 }, "sitemap": { "extraUrls": "no" } }));
        assert_eq!(c["robots"]["rules"].as_array().unwrap().len(), 2);
        assert_eq!((c["robots"]["x"].clone(), c["sitemap"]["extraUrls"].clone()), (json!(1), json!([])));
    }

    #[test]
    fn social_meta_drops_unknown_pages_and_trims() {
        let m = merge_social_meta(&json!({ "defaultImage": " /a.png ", "pages": { "/": { "title": " T ", "image": 5 }, "/nope": {} } }));
        assert_eq!(m["defaultImage"], "/a.png");
        assert_eq!(m["pages"]["/"], json!({ "title": "T", "description": "", "image": "" }));
        assert!(m["pages"].get("/nope").is_none());
    }

    #[test]
    fn service_accounts_are_checked() {
        assert_eq!(service_account_email(&json!("{\"client_email\":\"a@b\",\"private_key\":\"k\"}")).as_deref(), Ok("a@b"));
        for bad in [json!("{"), json!(5), json!({ "type": "user" }), json!({ "client_email": "a@b" })] {
            assert!(service_account_email(&bad).is_err(), "{bad}");
        }
    }
}
