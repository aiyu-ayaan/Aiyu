#!/usr/bin/env node
// `pnpm dev`: the whole site in development. Browser -> Vite (:3000, hot reload) -> aiyu-server (debug build, :8080)
// -> next dev (:3001, the routes not ported yet). Vite and Next reload on save; restart after changing Rust.
// Ports: PORT, RUST_PORT, NEXT_PORT.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const web = process.env.PORT || '3000';
const rust = process.env.RUST_PORT || '8080';
const next = process.env.NEXT_PORT || '3001';

function once(command, args) {
    const { status } = spawnSync(command, args, { stdio: 'inherit' });
    if (status !== 0) process.exit(status ?? 1);
}
once('cargo', ['build', '--manifest-path', 'server/Cargo.toml']);
// The server reads files the web build exports (themes, discovery documents, route lists).
if (!existsSync('web/dist/discovery.json')) once(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--config', 'web/vite.config.mts']);

// One scheduler only: aiyu-server runs the cron jobs, so Next leaves its own off.
const shared = { ...process.env, CRON_RUNNER: 'rust' };
const children = [
    spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '-p', next], {
        stdio: 'inherit',
        env: { ...shared, PORT: next, AIYU_SERVER_URL: `http://127.0.0.1:${rust}` },
    }),
    spawn('server/target/debug/aiyu-server', [], {
        stdio: 'inherit',
        env: {
            ...shared,
            NODE_ENV: 'development',
            RUST_LISTEN: `127.0.0.1:${rust}`,
            NEXT_UPSTREAM: `http://127.0.0.1:${next}`,
            // Vite is the only peer; it passes the browser's address on.
            TRUSTED_PROXIES: '127.0.0.1',
        },
    }),
    spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--config', 'web/vite.config.mts'], {
        stdio: 'inherit',
        env: { ...shared, PORT: web, AIYU_SERVER_URL: `http://127.0.0.1:${rust}` },
    }),
];

let stopping = false;
function stop(code) {
    if (stopping) return;
    stopping = true;
    process.exitCode = code;
    for (const child of children) child.kill('SIGTERM');
}
for (const child of children) {
    child.on('exit', (code) => stop(code ?? 0));
    child.on('error', (error) => {
        console.error(error.message);
        stop(1);
    });
}
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
