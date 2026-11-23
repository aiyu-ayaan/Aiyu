//! Postgres access. While Next and Rust both run, Rust talks to the same Postgres so there is one source of
//! truth (see development/TODO.md, Decisions). Queries live here so the swap to SQLite at cutover is one module.

use sqlx::postgres::{PgConnectOptions, PgPoolOptions};
use sqlx::{ConnectOptions, PgPool};
use std::str::FromStr;

/// Small pool: each Postgres connection costs server memory too, and admin traffic is light.
pub async fn connect(database_url: &str) -> anyhow::Result<PgPool> {
    let opts = PgConnectOptions::from_str(&strip_prisma_params(database_url))?.disable_statement_logging();
    Ok(PgPoolOptions::new().max_connections(3).min_connections(0).connect_lazy_with(opts))
}

/// Prisma's `?schema=public` is not a libpq parameter; drop it (public is the default search_path).
fn strip_prisma_params(url: &str) -> String {
    let Some((base, query)) = url.split_once('?') else { return url.to_string() };
    let kept: Vec<&str> = query.split('&').filter(|p| !p.starts_with("schema=") && !p.is_empty()).collect();
    if kept.is_empty() { base.to_string() } else { format!("{base}?{}", kept.join("&")) }
}

#[cfg(test)]
mod tests {
    #[test]
    fn strips_schema_param() {
        assert_eq!(super::strip_prisma_params("postgresql://u:p@h:5432/db?schema=public"), "postgresql://u:p@h:5432/db");
        assert_eq!(super::strip_prisma_params("postgres://h/db?sslmode=disable&schema=x"), "postgres://h/db?sslmode=disable");
    }
}
