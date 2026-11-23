use std::{env, net::SocketAddr, path::PathBuf};

/// Read from the same `.env` the Next app uses, so both servers share secrets during the migration.
#[derive(Clone, Debug)]
pub struct Config {
    pub listen: SocketAddr,
    pub next_upstream: String,
    pub next_dir: PathBuf,
    pub jwt_secret: String,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        let _ = dotenvy::dotenv();
        let jwt_secret = env::var("JWT_SECRET").map_err(|_| anyhow::anyhow!("JWT_SECRET environment variable must be set"))?;
        Ok(Self {
            listen: env::var("RUST_LISTEN").unwrap_or_else(|_| "0.0.0.0:8080".into()).parse()?,
            next_upstream: env::var("NEXT_UPSTREAM").unwrap_or_else(|_| "http://127.0.0.1:3000".into()),
            next_dir: env::var("NEXT_DIR").unwrap_or_else(|_| ".next".into()).into(),
            jwt_secret,
        })
    }
}
