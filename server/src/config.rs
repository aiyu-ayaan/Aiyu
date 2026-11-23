use std::{env, net::SocketAddr, path::PathBuf};

/// Read from the same `.env` the Next app uses, so both servers share secrets during the migration.
#[derive(Clone, Debug)]
pub struct Config {
    pub listen: SocketAddr,
    pub next_upstream: String,
    pub next_dir: PathBuf,
    pub jwt_secret: String,
    /// Peers allowed to set client-IP headers (nginx, Cloudflare tunnel). Everyone else gets them overwritten.
    pub trusted_proxies: Vec<ipnet::IpNet>,
    pub uploads_dir: PathBuf,
    pub database_url: String,
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
            trusted_proxies: parse_trusted(&env::var("TRUSTED_PROXIES").unwrap_or_default())?,
            uploads_dir: env::var("UPLOADS_DIR").unwrap_or_else(|_| "public/uploads".into()).into(),
            database_url: env::var("DATABASE_URL").map_err(|_| anyhow::anyhow!("DATABASE_URL environment variable must be set"))?,
        })
    }
}

/// Comma-separated IPs or CIDRs, e.g. `127.0.0.1,172.16.0.0/12`.
pub fn parse_trusted(list: &str) -> anyhow::Result<Vec<ipnet::IpNet>> {
    list.split(',')
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(|s| {
            s.parse::<ipnet::IpNet>()
                .or_else(|_| s.parse::<std::net::IpAddr>().map(ipnet::IpNet::from))
                .map_err(|_| anyhow::anyhow!("TRUSTED_PROXIES: invalid entry {s:?}"))
        })
        .collect()
}
