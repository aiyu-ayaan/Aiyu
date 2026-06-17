/**
 * Uptime pinger. Builds the list of monitored endpoints (every Deployment with
 * a hostedUrl, plus any custom UptimeTarget rows), pings them, and records the
 * results to the UptimeCheck history table. Invoked on-demand from the admin
 * dashboard and by the scheduled `uptime_check` system cron.
 */
import { prisma } from '@/lib/prisma';
import { fetchWithTimeout } from '@/lib/upstreamControl';

const PING_TIMEOUT_MS = 8000;

/** A 2xx/3xx response is "up"; everything else (incl. network error) is "down". */
export function classifyStatus(statusCode) {
    return statusCode >= 200 && statusCode < 400 ? 'up' : 'down';
}

/**
 * Ping one URL. Never throws — failures resolve to a down result with the error
 * message. Uses HEAD then falls back to GET for servers that reject HEAD.
 */
export async function pingTarget({ url, label = '', source = 'custom' }) {
    const start = Date.now();
    const base = { target: url, label, source };

    if (!url || !/^https?:\/\//i.test(url)) {
        return { ...base, status: 'down', statusCode: 0, latencyMs: 0, error: 'Invalid URL' };
    }

    try {
        let res = await fetchWithTimeout(url, { method: 'HEAD', redirect: 'follow' }, PING_TIMEOUT_MS);
        // Some hosts return 405/501 for HEAD — retry with GET before judging.
        if (res.status === 405 || res.status === 501) {
            res = await fetchWithTimeout(url, { method: 'GET', redirect: 'follow' }, PING_TIMEOUT_MS);
        }
        return {
            ...base,
            status: classifyStatus(res.status),
            statusCode: res.status,
            latencyMs: Date.now() - start,
            error: res.ok ? '' : `HTTP ${res.status}`,
        };
    } catch (err) {
        return {
            ...base,
            status: 'down',
            statusCode: 0,
            latencyMs: Date.now() - start,
            error: err?.name === 'AbortError' ? 'Timeout' : (err?.message || 'Request failed'),
        };
    }
}

/** Resolve the full set of endpoints to monitor. */
export async function collectTargets() {
    const [deployments, custom] = await Promise.all([
        prisma.deployment.findMany({
            where: { hostedUrl: { not: null } },
            select: { name: true, hostedUrl: true },
        }),
        prisma.uptimeTarget.findMany({ where: { enabled: true } }),
    ]);

    const fromDeployments = deployments
        .filter((d) => d.hostedUrl && d.hostedUrl.trim())
        .map((d) => ({ url: d.hostedUrl.trim(), label: d.name, source: 'deployment' }));

    const fromCustom = custom.map((t) => ({ url: t.url, label: t.label, source: 'custom' }));

    // De-dupe by URL, preferring the deployment label.
    const seen = new Map();
    for (const t of [...fromDeployments, ...fromCustom]) {
        if (!seen.has(t.url)) seen.set(t.url, t);
    }
    return [...seen.values()];
}

/**
 * Ping every target concurrently and persist the results.
 * @returns {Promise<Array>} the ping results (also written to UptimeCheck).
 */
export async function runUptimeChecks() {
    const targets = await collectTargets();
    if (targets.length === 0) return [];

    const results = await Promise.all(targets.map(pingTarget));

    await prisma.uptimeCheck.createMany({
        data: results.map((r) => ({
            target: r.target,
            label: r.label || '',
            source: r.source || 'custom',
            status: r.status,
            statusCode: r.statusCode || 0,
            latencyMs: r.latencyMs || 0,
            error: r.error || '',
        })),
    });

    return results;
}

/**
 * Latest status per monitored target plus recent history, for the dashboard.
 */
export async function getUptimeSummary(historyLimit = 20) {
    const targets = await collectTargets();
    const recent = await prisma.uptimeCheck.findMany({
        orderBy: { checkedAt: 'desc' },
        take: 400,
    });

    const byTarget = new Map();
    for (const check of recent) {
        if (!byTarget.has(check.target)) byTarget.set(check.target, []);
        const list = byTarget.get(check.target);
        if (list.length < historyLimit) list.push(check);
    }

    return targets.map((t) => {
        const history = byTarget.get(t.url) || [];
        const latest = history[0] || null;
        return {
            url: t.url,
            label: t.label,
            source: t.source,
            latest: latest
                ? {
                      status: latest.status,
                      statusCode: latest.statusCode,
                      latencyMs: latest.latencyMs,
                      error: latest.error,
                      checkedAt: latest.checkedAt,
                  }
                : null,
            // Oldest-first so the UI can render a left-to-right history strip.
            history: history
                .slice()
                .reverse()
                .map((h) => ({ status: h.status, latencyMs: h.latencyMs, checkedAt: h.checkedAt })),
        };
    });
}
