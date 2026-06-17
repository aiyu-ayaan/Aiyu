/**
 * Live crawl audit — shared by the admin API route and scripts/seo-audit.mjs.
 *
 * Fetches URLs as Googlebot and reports the problems Search Console surfaces:
 * non-200 status, redirects, canonical mismatches, and `noindex`. Also measures
 * TTFB so crawl-budget regressions are visible. `fetch` is injected so the pure
 * parsing/normalization logic is unit-testable without the network.
 */

export const GOOGLEBOT_UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
export const DEFAULT_SLOW_MS = 1500;
const DEFAULT_TIMEOUT_MS = 20000;
const DEFAULT_CONCURRENCY = 6;

/** Canonicalize to `origin + pathname` (drops query, trailing slash). */
export function normalizeUrl(url) {
    try {
        const u = new URL(url);
        return `${u.origin}${u.pathname.replace(/\/+$/, '') || ''}`;
    } catch {
        return String(url || '');
    }
}

/** Extract the rel=canonical href from an HTML string, or '' if absent. */
export function extractCanonical(html = '') {
    return html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1] || '';
}

/** Extract the robots meta content from an HTML string, or '' if absent. */
export function extractRobotsMeta(html = '') {
    return html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i)?.[1] || '';
}

/**
 * Turn a fetched response's status/headers/body into an issue list.
 * Pure — given the response parts, returns { status, issues }.
 */
export function evaluateResponse(url, { status, location, html, ms, slowMs = DEFAULT_SLOW_MS }) {
    const issues = [];
    if (status >= 300 && status < 400) {
        issues.push({ severity: 'error', message: `Redirects (${status}) -> ${location || '?'}` });
        return { issues };
    }
    if (status !== 200) {
        issues.push({ severity: 'error', message: `Status ${status}` });
        return { issues };
    }
    const canonical = extractCanonical(html);
    const robots = extractRobotsMeta(html);
    if (canonical && normalizeUrl(canonical) !== normalizeUrl(url)) {
        issues.push({ severity: 'warning', message: `Canonical points elsewhere -> ${canonical}` });
    }
    if (/noindex/i.test(robots)) {
        issues.push({ severity: 'error', message: `noindex (robots="${robots}")` });
    }
    if (typeof ms === 'number' && ms > slowMs) {
        issues.push({ severity: 'warning', message: `Slow TTFB ${ms}ms (>${slowMs}ms)` });
    }
    return { issues };
}

async function fetchWithTimeout(fetchImpl, url, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetchImpl(url, {
            redirect: 'manual',
            signal: controller.signal,
            headers: { 'User-Agent': GOOGLEBOT_UA },
        });
    } finally {
        clearTimeout(timer);
    }
}

/** Crawl one URL and return { url, status, ms, issues }. Never throws. */
export async function crawlUrl(url, { fetchImpl = fetch, timeoutMs, slowMs } = {}) {
    const start = Date.now();
    let res;
    try {
        res = await fetchWithTimeout(fetchImpl, url, { timeoutMs });
    } catch (err) {
        return { url, status: 'ERR', ms: Date.now() - start, issues: [{ severity: 'error', message: `Request failed: ${err.message}` }] };
    }
    const ms = Date.now() - start;
    const status = res.status;
    let html = '';
    if (status === 200) {
        try { html = await res.text(); } catch { html = ''; }
    }
    const { issues } = evaluateResponse(url, {
        status,
        location: res.headers?.get?.('location'),
        html,
        ms,
        slowMs,
    });
    return { url, status, ms, issues };
}

/** Run an async worker over items with bounded concurrency. */
export async function runPool(items, worker, concurrency = DEFAULT_CONCURRENCY) {
    const results = [];
    let i = 0;
    const runners = Array.from({ length: Math.min(concurrency, items.length || 1) }, async () => {
        while (i < items.length) {
            const idx = i++;
            results[idx] = await worker(items[idx]);
        }
    });
    await Promise.all(runners);
    return results;
}

/** Parse <loc> entries out of a sitemap.xml body. */
export function parseSitemapUrls(xml = '') {
    return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

/**
 * Crawl every URL in the site's sitemap.xml. Returns { urls, results, summary }.
 * Bounded by `limit` to protect crawl budget / response time.
 */
export async function crawlSitemap(baseUrl, { fetchImpl = fetch, concurrency = DEFAULT_CONCURRENCY, slowMs = DEFAULT_SLOW_MS, limit = 200 } = {}) {
    const origin = String(baseUrl || '').replace(/\/+$/, '');
    const res = await fetchImpl(`${origin}/sitemap.xml`, { headers: { 'User-Agent': GOOGLEBOT_UA } });
    if (!res.ok) throw new Error(`sitemap.xml returned HTTP ${res.status}`);
    const xml = await res.text();
    const urls = parseSitemapUrls(xml).slice(0, limit);
    const results = await runPool(urls, (u) => crawlUrl(u, { fetchImpl, slowMs }), concurrency);
    return { urls, results, summary: summarizeCrawl(results) };
}

/** Aggregate crawl results into KPI counts. */
export function summarizeCrawl(results = []) {
    let ok = 0;
    let errors = 0;
    let warnings = 0;
    let totalMs = 0;
    let timed = 0;
    for (const r of results) {
        if (typeof r.ms === 'number') { totalMs += r.ms; timed += 1; }
        if (!r.issues || r.issues.length === 0) { ok += 1; continue; }
        if (r.issues.some((i) => i.severity === 'error')) errors += 1;
        else warnings += 1;
    }
    return {
        total: results.length,
        ok,
        errors,
        warnings,
        avgMs: timed ? Math.round(totalMs / timed) : 0,
    };
}
