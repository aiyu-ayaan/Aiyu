/**
 * SEO crawl audit.
 *
 * Fetches the live sitemap.xml as Googlebot and checks every URL for the
 * problems Google Search Console reports: non-200 status, redirects,
 * canonical mismatches, and `noindex` meta tags. Also measures TTFB so crawl
 * budget regressions (slow dynamic renders) are visible.
 *
 * Usage:
 *   node scripts/seo-audit.mjs                 # audits https://me.aiyu.co.in
 *   node scripts/seo-audit.mjs https://host    # audits another origin
 *   BASE_URL=https://host node scripts/seo-audit.mjs
 *
 * Exits non-zero when any indexable sitemap URL is broken (status/canonical/
 * noindex), so it can gate CI. Slow pages are warnings, not failures.
 */

const BASE_URL = (process.argv[2] || process.env.BASE_URL || 'https://me.aiyu.co.in').replace(/\/+$/, '');
const UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const SLOW_MS = 1500; // TTFB above this throttles crawl budget on low-authority sites.
const TIMEOUT_MS = 20000;
const CONCURRENCY = 6;

function normalize(url) {
    try {
        const u = new URL(url);
        return `${u.origin}${u.pathname.replace(/\/+$/, '') || ''}`;
    } catch {
        return url;
    }
}

async function fetchWithTimeout(url, opts = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        return await fetch(url, { ...opts, signal: controller.signal, headers: { 'User-Agent': UA, ...opts.headers } });
    } finally {
        clearTimeout(timer);
    }
}

async function getSitemapUrls() {
    const res = await fetchWithTimeout(`${BASE_URL}/sitemap.xml`);
    if (!res.ok) throw new Error(`sitemap.xml returned HTTP ${res.status}`);
    const xml = await res.text();
    return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

async function auditUrl(url) {
    const issues = [];
    const start = Date.now();
    let res;
    try {
        res = await fetchWithTimeout(url, { redirect: 'manual' });
    } catch (err) {
        return { url, status: 'ERR', ms: Date.now() - start, issues: [`request failed: ${err.message}`] };
    }
    const ms = Date.now() - start;

    if (res.status >= 300 && res.status < 400) {
        issues.push(`redirects (${res.status}) -> ${res.headers.get('location')}`);
        return { url, status: res.status, ms, issues };
    }
    if (res.status !== 200) {
        issues.push(`status ${res.status}`);
        return { url, status: res.status, ms, issues };
    }

    const html = await res.text();
    const canonical = html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i)?.[1];
    const robots = html.match(/<meta[^>]+name="robots"[^>]+content="([^"]+)"/i)?.[1] || '';

    if (canonical && normalize(canonical) !== normalize(url)) {
        issues.push(`canonical -> ${canonical}`);
    }
    if (/noindex/i.test(robots)) {
        issues.push(`noindex (robots="${robots}")`);
    }
    if (ms > SLOW_MS) {
        issues.push(`SLOW ${ms}ms (warning)`);
    }
    return { url, status: 200, ms, issues };
}

async function runPool(items, worker) {
    const results = [];
    let i = 0;
    const runners = Array.from({ length: CONCURRENCY }, async () => {
        while (i < items.length) {
            const idx = i++;
            results[idx] = await worker(items[idx]);
        }
    });
    await Promise.all(runners);
    return results;
}

async function main() {
    console.log(`SEO audit of ${BASE_URL} (as Googlebot)\n`);
    const urls = await getSitemapUrls();
    console.log(`Sitemap URLs: ${urls.length}\n`);

    const results = await runPool(urls, auditUrl);

    const hardFailures = [];
    let slowCount = 0;
    let totalMs = 0;

    for (const r of results) {
        totalMs += typeof r.ms === 'number' ? r.ms : 0;
        const onlySlow = r.issues.length > 0 && r.issues.every((m) => m.startsWith('SLOW'));
        if (r.issues.length === 0) continue;
        if (r.issues.some((m) => m.startsWith('SLOW'))) slowCount++;
        const tag = onlySlow ? 'WARN' : 'FAIL';
        if (!onlySlow) hardFailures.push(r);
        console.log(`[${tag}] ${r.url}`);
        for (const m of r.issues) console.log(`        - ${m}`);
    }

    const avg = Math.round(totalMs / results.length);
    console.log('\n--- summary ---');
    console.log(`OK (indexable):   ${results.filter((r) => r.issues.length === 0).length}`);
    console.log(`Slow (>${SLOW_MS}ms):    ${slowCount}`);
    console.log(`Hard failures:    ${hardFailures.length}`);
    console.log(`Avg TTFB:         ${avg}ms`);

    if (hardFailures.length > 0) {
        console.error('\nAudit FAILED: indexable URLs have status/canonical/noindex problems.');
        process.exit(1);
    }
    console.log('\nAudit passed: all sitemap URLs are 200, self-canonical, and indexable.');
}

main().catch((err) => {
    console.error('Audit error:', err.message);
    process.exit(2);
});
