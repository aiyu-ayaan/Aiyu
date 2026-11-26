//! The `$model.path` placeholders of cron webhooks (src/utils/cronTemplate.js): `$blogs.0.title`, `$env.TOKEN`,
//! `$time`, `$site`. Collections are fetched only as far as the highest row the template names, never past the limit.

use regex::Regex;
use serde_json::{Map, Value, json};
use std::{collections::HashMap, sync::LazyLock};

use crate::{AppState, pages, web::site_url};

/// `$env` values: the stored secrets when a job runs, placeholders in the editor's preview.
pub enum Env<'a> {
    Secrets(&'a Map<String, Value>),
    Preview,
}

/// Collections: `(placeholder, table, ordering)`.
const LISTS: [(&str, &str, &str); 13] = [
    ("blogs", "Blog", r#"ORDER BY "createdAt" DESC"#),
    ("blog", "Blog", r#"ORDER BY "createdAt" DESC"#),
    ("projects", "Project", r#"ORDER BY "displayOrder" ASC"#),
    ("project", "Project", r#"ORDER BY "displayOrder" ASC"#),
    ("gallery", "Gallery", r#"ORDER BY "order" ASC"#),
    ("socials", "Social", ""),
    ("social", "Social", ""),
    ("messages", "ContactMessage", r#"ORDER BY "createdAt" DESC"#),
    ("message", "ContactMessage", r#"ORDER BY "createdAt" DESC"#),
    ("deployments", "Deployment", r#"ORDER BY "displayOrder" ASC"#),
    ("deployment", "Deployment", r#"ORDER BY "displayOrder" ASC"#),
    ("crons", "Cron", ""),
    ("cron", "Cron", ""),
];

static PLACEHOLDER: LazyLock<Regex> = LazyLock::new(|| Regex::new(r#"\$([a-zA-Z0-9_]+)([.\[\]'"\-a-zA-Z0-9_]*)"#).expect("constant pattern"));
static BRACKET: LazyLock<Regex> = LazyLock::new(|| Regex::new(r#"\[['"]?([^'"\]]+)['"]?\]"#).expect("constant pattern"));

/// `.0.title` and `[0]['title']` as segments.
fn segments(path: &str) -> Vec<String> {
    let dotted = BRACKET.replace_all(path, ".$1");
    let clean = dotted.strip_prefix('.').unwrap_or(&dotted);
    if clean.is_empty() { vec![] } else { clean.split('.').map(str::to_string).collect() }
}

/// JavaScript property access; None is `undefined`.
fn walk(value: Value, path: &str) -> Option<Value> {
    segments(path).iter().try_fold(value, |current, part| match current {
        Value::Object(mut map) => map.remove(part),
        Value::Array(items) if part == "length" => Some(items.len().into()),
        Value::Array(mut items) => part.parse::<usize>().ok().filter(|&i| i < items.len()).map(|i| items.swap_remove(i)),
        Value::String(s) if part == "length" => Some(s.encode_utf16().count().into()),
        Value::String(s) => part.parse::<usize>().ok().and_then(|i| s.chars().nth(i)).map(|c| c.to_string().into()),
        _ => None,
    })
}

/// How many rows a path needs: up to the row it names, otherwise the whole (limited) collection.
fn rows_needed(path: &str, limit: usize) -> usize {
    match segments(path).first().and_then(|s| s.parse::<usize>().ok()) {
        Some(index) => limit.min(index.saturating_add(1)),
        None => limit,
    }
}

pub struct Context<'a> {
    state: &'a AppState,
    env: Env<'a>,
    row_limit: usize,
    /// Collections already fetched, so a template naming one twice reads it once.
    lists: HashMap<&'static str, (usize, Value)>,
    singletons: HashMap<String, Value>,
}

impl<'a> Context<'a> {
    pub fn new(state: &'a AppState, env: Env<'a>, row_limit: usize) -> Self {
        Self { state, env, row_limit, lists: HashMap::new(), singletons: HashMap::new() }
    }

    async fn list(&mut self, table: &'static str, order: &str, path: &str) -> Value {
        let take = rows_needed(path, self.row_limit);
        if let Some((have, value)) = self.lists.get(table) {
            if *have >= take {
                return value.clone();
            }
        }
        // shortcut: whole rows are read (Next selected only the named columns); revisit if templates get heavy.
        let rows = pages::client_rows(&self.state.db, table, &format!("{order} LIMIT {take}")).await.unwrap_or_else(|err| {
            tracing::error!(table, error = %err, "cron template: fetch failed");
            vec![]
        });
        let rows: Vec<Value> = rows
            .into_iter()
            .map(|mut r| {
                if let Some(fields) = r.as_object_mut() {
                    fields.shift_remove("searchVector");
                }
                r
            })
            .collect();
        let value = Value::Array(rows);
        self.lists.insert(table, (take, value.clone()));
        value
    }

    async fn singleton(&mut self, name: &str) -> Option<Value> {
        let (table, timestamps) = match name {
            "config" => ("Config", false),
            "about" => ("About", false),
            "ads" => ("Ads", true),
            "theme" | "themes" => ("Theme", false),
            _ => return None,
        };
        if !self.singletons.contains_key(name) {
            let value = if table == "Theme" {
                pages::client_rows(&self.state.db, table, "LIMIT 1").await.ok().and_then(|r| r.into_iter().next()).unwrap_or(Value::Null)
            } else {
                pages::singleton(&self.state.db, table, timestamps).await
            };
            self.singletons.insert(name.to_string(), value);
        }
        self.singletons.get(name).cloned()
    }

    /// The value of one placeholder; None is `undefined`.
    async fn resolve(&mut self, model: &str, path: &str) -> Option<Value> {
        let lower = model.to_lowercase();
        match lower.as_str() {
            "time" | "timestamp" => return Some(crate::admin_settings::now_iso().into()),
            "date" => return Some(chrono::Local::now().format("%-m/%-d/%Y").to_string().into()),
            "env" => {
                return match &self.env {
                    Env::Secrets(secrets) => walk(Value::Object((*secrets).clone()), path),
                    // Any key reads as a placeholder; the whole object shows empty.
                    Env::Preview => match segments(path).split_first() {
                        None => Some(json!({})),
                        Some((key, rest)) => walk(format!("[SECRET: {key}]").into(), &rest.join(".")),
                    },
                };
            }
            "site" => {
                let url = site_url();
                return walk(json!({ "url": url }), path).filter(crate::api::truthy).or(Some(url.into()));
            }
            "device" => {
                let release = std::fs::read_to_string("/proc/sys/kernel/osrelease").unwrap_or_default();
                let arch = match std::env::consts::ARCH {
                    "x86_64" => "x64",
                    "aarch64" => "arm64",
                    other => other,
                };
                let info = json!({
                    "platform": std::env::consts::OS, "os": format!("Linux {}", release.trim()), "arch": arch,
                    "nodeVersion": concat!("Rust (aiyu-server ", env!("CARGO_PKG_VERSION"), ")"),
                    "environment": std::env::var("NODE_ENV").ok().filter(|v| !v.is_empty()).unwrap_or_else(|| "development".into()),
                });
                return walk(info.clone(), path).filter(|v| !v.is_null()).or(Some(info));
            }
            _ => {}
        }
        if let Some(&(_, table, order)) = LISTS.iter().find(|l| l.0 == lower) {
            let rows = self.list(table, order, path).await;
            return walk(rows, path);
        }
        match self.singleton(&lower).await {
            Some(value) => walk(value, path),
            // Not a model: the text stays as written.
            None => Some(format!("${model}{path}").into()),
        }
    }

    /// `compileTemplate`: a lone placeholder keeps its type, others are written into the text.
    pub async fn compile(&mut self, template: &str) -> Option<Value> {
        if !template.contains('$') {
            return Some(template.into());
        }
        let found: Vec<(usize, usize, String, String)> = PLACEHOLDER
            .captures_iter(template)
            .map(|c| {
                let all = c.get(0).map_or((0, 0), |m| (m.start(), m.end()));
                (all.0, all.1, c[1].to_string(), c[2].to_string())
            })
            .collect();
        if let [(0, end, model, path)] = &found[..] {
            if *end == template.len() {
                return self.resolve(model, path).await;
            }
        }
        let mut out = String::new();
        let mut from = 0;
        for (start, end, model, path) in found {
            out.push_str(&template[from..start]);
            out.push_str(&match self.resolve(&model, &path).await {
                Some(v @ (Value::Object(_) | Value::Array(_) | Value::Null)) => v.to_string(),
                Some(Value::String(s)) => s,
                Some(v) => v.to_string(),
                None => String::new(),
            });
            from = end;
        }
        out.push_str(&template[from..]);
        Some(out.into())
    }

    /// `compileTemplateObject`: every string inside `value`.
    pub async fn compile_value(&mut self, value: &Value) -> Value {
        match value {
            Value::String(s) => self.compile(s).await.unwrap_or(Value::Null),
            Value::Array(items) => {
                let mut out = Vec::new();
                for item in items {
                    out.push(Box::pin(self.compile_value(item)).await);
                }
                Value::Array(out)
            }
            Value::Object(map) => {
                let mut out = Map::new();
                for (key, item) in map {
                    out.insert(key.clone(), Box::pin(self.compile_value(item)).await);
                }
                Value::Object(out)
            }
            other => other.clone(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn paths_follow_javascript() {
        let v = json!({ "a": [ { "t": "xy" } ] });
        assert_eq!(walk(v.clone(), ".a.0.t"), Some(json!("xy")));
        assert_eq!(walk(v.clone(), "['a'][0][\"t\"].length"), Some(json!(2)));
        assert_eq!(walk(v.clone(), ".a.length"), Some(json!(1)));
        assert_eq!(walk(v.clone(), ".a.5"), None);
        assert_eq!(walk(v.clone(), ""), Some(v));
        assert_eq!(rows_needed(".0.title", 500), 1);
        assert_eq!(rows_needed(".length", 500), 500);
        assert_eq!(rows_needed(".900", 500), 500);
    }

    #[tokio::test]
    async fn text_without_models_is_filled_from_env_and_site() {
        let state = AppState::new(crate::config::Config {
            listen: "127.0.0.1:0".parse().unwrap(),
            next_upstream: String::new(),
            next_dir: ".next".into(),
            jwt_secret: "s".into(),
            trusted_proxies: vec![],
            uploads_dir: "u".into(),
            web_dir: "missing".into(),
            database_url: "postgres://localhost:1/x".into(),
        })
        .await
        .unwrap();
        let secrets = Map::from_iter([("K".to_string(), json!("v"))]);
        let mut run = Context::new(&state, Env::Secrets(&secrets), 5);
        assert_eq!(run.compile("a $env.K b $env.NO c $unknown.x").await, Some(json!("a v b  c $unknown.x")));
        assert_eq!(run.compile("$env").await, Some(json!({ "K": "v" })));
        assert_eq!(run.compile("plain").await, Some(json!("plain")));
        let mut preview = Context::new(&state, Env::Preview, 5);
        assert_eq!(preview.compile_value(&json!({ "h": ["$env.TOKEN", 1], "e": "$env" })).await, json!({ "h": ["[SECRET: TOKEN]", 1], "e": {} }));
    }
}
