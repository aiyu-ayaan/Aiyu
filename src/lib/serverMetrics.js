/**
 * Live server-health sampling for the admin dashboard. Everything here is
 * sampled on demand — nothing is stored. Works inside the Docker container:
 * host CPU/RAM come from the `os` module, disk from `fs.statfs`, and event-loop
 * lag from a persistent `perf_hooks` histogram.
 */
import os from 'os';
import { statfs } from 'fs/promises';
import { monitorEventLoopDelay } from 'perf_hooks';
import { prisma } from '@/lib/prisma';

// A single, process-wide event-loop delay histogram. Started once on first
// import and read (then reset) on each sample.
const loopDelay = monitorEventLoopDelay({ resolution: 10 });
loopDelay.enable();

const KB = 1024;
const MB = KB * 1024;
const GB = MB * 1024;

export function formatBytes(bytes) {
    if (bytes == null || Number.isNaN(bytes)) return '—';
    if (bytes >= GB) return `${(bytes / GB).toFixed(1)} GB`;
    if (bytes >= MB) return `${(bytes / MB).toFixed(0)} MB`;
    if (bytes >= KB) return `${(bytes / KB).toFixed(0)} KB`;
    return `${bytes} B`;
}

/** Snapshot of aggregate CPU times across all cores. */
function cpuTimes() {
    let idle = 0;
    let total = 0;
    for (const cpu of os.cpus()) {
        for (const t of Object.values(cpu.times)) total += t;
        idle += cpu.times.idle;
    }
    return { idle, total };
}

/**
 * Host CPU utilisation across a sampling window, as a 0–100 percentage.
 * Pure given two snapshots, so it is unit-testable.
 */
export function cpuPercentFromSamples(prev, cur) {
    const idleDelta = cur.idle - prev.idle;
    const totalDelta = cur.total - prev.total;
    if (totalDelta <= 0) return 0;
    const pct = (1 - idleDelta / totalDelta) * 100;
    return Math.max(0, Math.min(100, Math.round(pct * 10) / 10));
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sampleCpu(windowMs = 120) {
    const prev = cpuTimes();
    await delay(windowMs);
    const cur = cpuTimes();
    return cpuPercentFromSamples(prev, cur);
}

async function sampleDisk() {
    try {
        const stats = await statfs(process.cwd());
        const total = stats.blocks * stats.bsize;
        const free = stats.bfree * stats.bsize;
        const available = stats.bavail * stats.bsize;
        const used = total - free;
        return {
            total,
            used,
            free: available,
            usedPercent: total > 0 ? Math.round((used / total) * 1000) / 10 : 0,
        };
    } catch {
        return null;
    }
}

async function pingDatabase() {
    const start = Date.now();
    try {
        await prisma.$queryRaw`SELECT 1`;
        return { status: 'up', latencyMs: Date.now() - start };
    } catch {
        return { status: 'down', latencyMs: Date.now() - start };
    }
}

/**
 * Collect a full metrics snapshot. Resolves in ~120ms (the CPU sampling window).
 */
export async function sampleMetrics() {
    const [cpuPercent, disk, db] = await Promise.all([
        sampleCpu(),
        sampleDisk(),
        pingDatabase(),
    ]);

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const mem = process.memoryUsage();

    // Read then reset the loop-delay histogram so each sample reflects the
    // window since the last read.
    const loopMeanNs = loopDelay.mean;
    const loopMaxNs = loopDelay.max;
    loopDelay.reset();

    return {
        timestamp: new Date().toISOString(),
        cpu: {
            percent: cpuPercent,
            cores: os.cpus().length,
            loadAvg: os.loadavg().map((n) => Math.round(n * 100) / 100),
        },
        memory: {
            total: totalMem,
            used: usedMem,
            free: freeMem,
            usedPercent: Math.round((usedMem / totalMem) * 1000) / 10,
        },
        process: {
            rss: mem.rss,
            heapUsed: mem.heapUsed,
            heapTotal: mem.heapTotal,
            external: mem.external,
            uptimeSeconds: Math.round(process.uptime()),
            pid: process.pid,
            nodeVersion: process.version,
        },
        eventLoop: {
            // Histogram values are in nanoseconds; expose milliseconds.
            lagMeanMs: Number.isFinite(loopMeanNs) ? Math.round((loopMeanNs / 1e6) * 100) / 100 : 0,
            lagMaxMs: Number.isFinite(loopMaxNs) ? Math.round((loopMaxNs / 1e6) * 100) / 100 : 0,
        },
        disk,
        database: db,
        host: {
            platform: os.platform(),
            release: os.release(),
            hostname: os.hostname(),
            uptimeSeconds: Math.round(os.uptime()),
        },
    };
}
