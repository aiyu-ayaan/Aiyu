/**
 * SEO crawl audit (CLI).
 *
 * Thin wrapper over the shared crawl logic in src/lib/seoCrawl.js (the same code
 * the admin dashboard uses). Fetches the live sitemap.xml as Googlebot and
 * checks every URL for status/redirect/canonical/noindex problems plus TTFB.
 *
 * Usage:
 *   node scripts/seo-audit.mjs                 # audits https://me.aiyu.co.in
 *   node scripts/seo-audit.mjs https://host    # audits another origin
 *   BASE_URL=https://host node scripts/seo-audit.mjs
 *
 * Exits non-zero when any indexable sitemap URL has a hard (error-severity)
 * problem, so it can gate CI. Slow pages / canonical hints are warnings.
 */

import { crawlSitemap } from '../src/lib/seoCrawl.js';

const BASE_URL = (process.argv[2] || process.env.BASE_URL || 'https://me.aiyu.co.in').replace(/\/+$/, '');

async function main() {
    console.log(`SEO audit of ${BASE_URL} (as Googlebot)\n`);
    const { results, summary } = await crawlSitemap(BASE_URL);
    console.log(`Sitemap URLs: ${results.length}\n`);

    const hardFailures = [];
    for (const r of results) {
        if (!r.issues.length) continue;
        const hasError = r.issues.some((i) => i.severity === 'error');
        if (hasError) hardFailures.push(r);
        console.log(`[${hasError ? 'FAIL' : 'WARN'}] ${r.url}`);
        for (const i of r.issues) console.log(`        - ${i.message}`);
    }

    console.log('\n--- summary ---');
    console.log(`OK (indexable):   ${summary.ok}`);
    console.log(`Warnings:         ${summary.warnings}`);
    console.log(`Hard failures:    ${summary.errors}`);
    console.log(`Avg TTFB:         ${summary.avgMs}ms`);

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
