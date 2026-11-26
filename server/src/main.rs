use aiyu_server::{AppState, config::Config, router};
use anyhow::Context;
use std::net::SocketAddr;
use axum::serve::ListenerExt;

fn main() -> anyhow::Result<()> {
    // Few threads keep RSS low on a 1 GB VPS: each worker has its own stack and allocator cache.
    let workers = std::env::var("RUST_WORKERS").ok().and_then(|v| v.parse().ok()).unwrap_or(2);
    tokio::runtime::Builder::new_multi_thread()
        .worker_threads(workers)
        .max_blocking_threads(8)
        .enable_all()
        .build()?
        .block_on(async {
            match std::env::args().nth(1).as_deref() {
                None => run().await,
                Some("healthcheck") => healthcheck().await,
                Some("import-postgres") => import_postgres().await,
                Some(other) => anyhow::bail!("unknown command {other}: use none (serve), healthcheck or import-postgres"),
            }
        })
}

/// For Docker: succeeds when the server on this machine answers.
async fn healthcheck() -> anyhow::Result<()> {
    let _ = dotenvy::dotenv();
    let listen = std::env::var("RUST_LISTEN").unwrap_or_else(|_| "0.0.0.0:8080".into());
    let port = listen.parse::<SocketAddr>()?.port();
    let client = reqwest::Client::builder().no_proxy().timeout(std::time::Duration::from_secs(5)).build()?;
    client.get(format!("http://127.0.0.1:{port}/api/health")).send().await?.error_for_status()?;
    Ok(())
}

/// Copies the Postgres database at `DATABASE_URL` into a new file at `DATABASE_PATH`.
async fn import_postgres() -> anyhow::Result<()> {
    let _ = dotenvy::dotenv();
    #[cfg(feature = "pg-import")]
    {
        let source = std::env::var("DATABASE_URL").context("set DATABASE_URL to the Postgres database to copy")?;
        let target = std::path::PathBuf::from(std::env::var("DATABASE_PATH").ok().filter(|v| !v.is_empty()).unwrap_or_else(|| "data/aiyu.db".into()));
        let copied = aiyu_server::import_pg::run(&source, &target).await?;
        for table in &copied {
            println!("{:<20} {:>8} rows  {}", table.table, table.rows, table.hash);
        }
        let rows: usize = copied.iter().map(|t| t.rows).sum();
        println!("Copied and verified {} tables, {rows} rows, into {}", copied.len(), target.display());
        Ok(())
    }
    #[cfg(not(feature = "pg-import"))]
    anyhow::bail!("this build has no Postgres support")
}

async fn run() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .init();

    aiyu_server::api::mark_start();
    let config = Config::from_env()?;
    let listen = config.listen;
    tracing::info!(%listen, "aiyu-server starting");

    open_database(&config).await?;
    let state = AppState::new(config).await?;
    // Without the Vite build no page can be served. Fail loudly instead.
    if state.web.is_none() {
        anyhow::bail!("web app not loaded (WEB_DIR must hold index.html, route-meta.json, ai-defaults.json, admin-routes.json)");
    }
    let mode = aiyu_server::seed::mode(std::env::var("RUN_SEED").ok().as_deref());
    // A failed seed leaves the database as it was; the site still starts.
    if let Err(err) = aiyu_server::seed::run(&state, mode).await {
        tracing::warn!(error = %format!("{err:#}"), "seeding failed");
    }
    if aiyu_server::cron_jobs::enabled() {
        tokio::spawn(aiyu_server::cron_jobs::schedule(state.clone()));
    }
    let app = router(state);
    // Nagle + delayed ACK added ~40 ms to every response on a kept-alive connection.
    let listener = tokio::net::TcpListener::bind(listen).await?.tap_io(|tcp| {
        if let Err(err) = tcp.set_nodelay(true) {
            tracing::warn!(%err, "set TCP_NODELAY");
        }
    });
    axum::serve(listener, app.into_make_service_with_connect_info::<SocketAddr>())
        .with_graceful_shutdown(shutdown_signal())
        .await?;
    Ok(())
}

/// Creates the database when there is none, and applies the migrations.
async fn open_database(config: &Config) -> anyhow::Result<()> {
    let path = &config.database_path;
    if !path.exists() {
        // An upgraded Postgres install must not come up empty, looking as if the content were gone.
        let postgres = std::env::var("DATABASE_URL").is_ok_and(|u| u.starts_with("postgres"));
        anyhow::ensure!(
            !postgres || std::env::var("START_EMPTY").as_deref() == Ok("true"),
            "no database at {}, but DATABASE_URL names a Postgres database. Copy it once with `aiyu-server import-postgres` \
             (see development/docs/SQLITE_CUTOVER.md), or set START_EMPTY=true to start a new, empty site.",
            path.display()
        );
        if let Some(parent) = path.parent().filter(|p| !p.as_os_str().is_empty()) {
            std::fs::create_dir_all(parent)?;
        }
    }
    let db = aiyu_server::db::connect(path, true);
    aiyu_server::db::migrate(&db).await.with_context(|| format!("database {}", path.display()))?;
    db.close().await;
    Ok(())
}

/// Docker and systemd stop with SIGTERM; Ctrl-C sends SIGINT.
async fn shutdown_signal() {
    let mut term = tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate()).expect("SIGTERM handler");
    tokio::select! {
        _ = tokio::signal::ctrl_c() => {}
        _ = term.recv() => {}
    }
}
