use aiyu_server::{AppState, config::Config, router};
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
        .block_on(run())
}

async fn run() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .init();

    aiyu_server::api::mark_start();
    let config = Config::from_env()?;
    let listen = config.listen;
    tracing::info!(%listen, upstream = %config.next_upstream, "aiyu-server starting");

    let state = AppState::new(config).await?;
    // Next no longer has any pages: without the Vite build every page would be a 404. Fail loudly instead.
    if state.web.is_none() {
        anyhow::bail!("web app not loaded (WEB_DIR must hold index.html, route-meta.json, ai-defaults.json, admin-routes.json)");
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

/// Docker and systemd stop with SIGTERM; Ctrl-C sends SIGINT.
async fn shutdown_signal() {
    let mut term = tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate()).expect("SIGTERM handler");
    tokio::select! {
        _ = tokio::signal::ctrl_c() => {}
        _ = term.recv() => {}
    }
}
