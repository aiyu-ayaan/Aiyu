use std::{env, net::SocketAddr, path::PathBuf};

/// Read from the environment, with `.env` in the working directory filling the gaps.
#[derive(Clone, Debug)]
pub struct Config {
    pub listen: SocketAddr,
    pub jwt_secret: String,
    /// Peers allowed to set client-IP headers (nginx, Cloudflare tunnel). Everyone else gets them overwritten.
    pub trusted_proxies: Vec<ipnet::IpNet>,
    pub uploads_dir: PathBuf,
    /// The static files served at the site root (`public/`).
    pub public_dir: PathBuf,
    /// The SQLite database file.
    pub database_path: PathBuf,
    /// Vite build output (`web/dist`): index.html, route-meta.json and the /_app assets.
    pub web_dir: PathBuf,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        let _ = dotenvy::dotenv();
        let jwt_secret = env::var("JWT_SECRET").map_err(|_| anyhow::anyhow!("JWT_SECRET environment variable must be set"))?;
        Ok(Self {
            listen: env::var("RUST_LISTEN").unwrap_or_else(|_| "0.0.0.0:8080".into()).parse()?,
            jwt_secret,
            trusted_proxies: parse_trusted(&env::var("TRUSTED_PROXIES").unwrap_or_default())?,
            uploads_dir: env::var("UPLOADS_DIR").unwrap_or_else(|_| "public/uploads".into()).into(),
            public_dir: env::var("PUBLIC_DIR").unwrap_or_else(|_| "public".into()).into(),
            web_dir: env::var("WEB_DIR").unwrap_or_else(|_| "web/dist".into()).into(),
            database_path: env::var("DATABASE_PATH").ok().filter(|v| !v.is_empty()).unwrap_or_else(|| "data/aiyu.db".into()).into(),
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
