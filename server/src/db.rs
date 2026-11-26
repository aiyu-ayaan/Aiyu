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

/// Prisma fills `@default(cuid())` ids itself, so rows inserted here need one: `c` + time + 16 random
/// base36 characters, the shape of a cuid.
pub fn new_id() -> String {
    use rand::Rng;
    const DIGITS: &[u8; 36] = b"0123456789abcdefghijklmnopqrstuvwxyz";
    let mut ms = chrono::Utc::now().timestamp_millis() as u64;
    let mut time = [b'0'; 8];
    for d in time.iter_mut().rev() {
        *d = DIGITS[(ms % 36) as usize];
        ms /= 36;
    }
    let mut rng = rand::thread_rng();
    let random = (0..16).map(|_| DIGITS[rng.gen_range(0..36)] as char);
    std::iter::once('c').chain(time.map(char::from)).chain(random).collect()
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
    fn new_ids_look_like_cuids_and_differ() {
        let (a, b) = (super::new_id(), super::new_id());
        assert!(a.len() == 25 && a.starts_with('c') && a.chars().all(|c| c.is_ascii_digit() || c.is_ascii_lowercase()), "{a}");
        assert_ne!(a, b);
    }

    #[test]
    fn strips_schema_param() {
        assert_eq!(super::strip_prisma_params("postgresql://u:p@h:5432/db?schema=public"), "postgresql://u:p@h:5432/db");
        assert_eq!(super::strip_prisma_params("postgres://h/db?sslmode=disable&schema=x"), "postgres://h/db?sslmode=disable");
    }
}
