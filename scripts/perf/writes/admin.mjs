// The admin settings, security and analytics routes under /api/admin. GETs are cases too, so they run on fixtures.
import { createHash } from 'node:crypto';
import { BEARER_HASH, PAST } from './_shared.mjs';

const cases = [];
const add = (models, method, path, name, rest = {}) => cases.push({ models, method, path, name, ...rest });
const anon = (models, method, path) => add(models, method, path, 'anonymous', { auth: 'anon', body: method === 'GET' ? undefined : {}, expect: 401 });
const soon = () => new Date(Date.now() + 86_400_000);
const sha = (s) => createHash('sha256').update(s).digest('hex');

// ── ads ──
add(['ads'], 'GET', '/api/admin/ads', 'read', { expect: 200 });
add(['ads'], 'GET', '/api/admin/ads', 'no row yet', { setup: (p) => p.ads.deleteMany(), expect: 200 });
const placements = { top: { enabled: 1, slotId: '12345', adType: '', adLayoutKey: 'k' }, footer: { enabled: false }, unknown: { enabled: true } };
add(['ads'], 'PUT', '/api/admin/ads', 'ids are encrypted', { body: { adsenseEnabled: 'yes', clientId: 'ca-pub-1', adsTxt: 'line', placements }, expect: 200 });
add(['ads'], 'PUT', '/api/admin/ads', 'cleared client id', { body: { clientId: '', adsTxt: 5 }, expect: 200 });
add(['ads'], 'PUT', '/api/admin/ads', 'empty body', { body: {}, expect: 200 });
add(['ads'], 'PUT', '/api/admin/ads', 'numeric id', { body: { clientId: 5 }, expect: 500 });
add(['ads'], 'PUT', '/api/admin/ads', 'null body', { body: 'null', expect: 500 });
add(['ads'], 'PUT', '/api/admin/ads', 'not JSON', { body: '{oops', expect: 500 });
anon(['ads'], 'GET', '/api/admin/ads');
anon(['ads'], 'PUT', '/api/admin/ads');

// ── social metadata ──
add(['seoConfig'], 'GET', '/api/admin/social', 'read', { expect: 200 });
add(['seoConfig'], 'PUT', '/api/admin/social', 'wrapped', { body: { social: { defaultImage: ' /og.png ', pages: { '/': { title: ' Home ' }, '/nope': { title: 'x' } } } }, expect: 200 });
add(['seoConfig'], 'PUT', '/api/admin/social', 'bare', { body: { defaultImage: '/a.png' }, expect: 200 });
add(['seoConfig'], 'PUT', '/api/admin/social', 'null body', { body: 'null', expect: 200 });
add(['seoConfig'], 'PUT', '/api/admin/social', 'not JSON', { body: '{oops', ignore: ['error'], expect: 400 });
anon(['seoConfig'], 'GET', '/api/admin/social');
anon(['seoConfig'], 'PUT', '/api/admin/social');

// ── SEO config ──
const account = JSON.stringify({ type: 'service_account', client_email: 'bot@example.org', private_key: 'not-a-key' });
const log = (p) => p.indexingLog.create({ data: { id: 'wp-log', url: 'https://example.org', type: 'URL_UPDATED', status: 'success', createdAt: PAST } });
add(['seoConfig', 'indexingLog'], 'GET', '/api/admin/seo/config', 'read', { setup: log, expect: 200 });
add(['seoConfig'], 'PUT', '/api/admin/seo/config', 'sections and key', { body: { robots: { rules: [{ userAgent: '*' }] }, sitemap: { excludePaths: ['/x'] }, indexing: { enabled: true }, serviceAccount: account }, expect: 200 });
add(['seoConfig'], 'PUT', '/api/admin/seo/config', 'clear key', { body: { serviceAccount: '' }, expect: 200 });
add(['seoConfig'], 'PUT', '/api/admin/seo/config', 'null section', { body: { robots: null }, expect: 200 });
add(['seoConfig'], 'PUT', '/api/admin/seo/config', 'bad key JSON', { body: { serviceAccount: '{' }, expect: 400 });
add(['seoConfig'], 'PUT', '/api/admin/seo/config', 'wrong key type', { body: { serviceAccount: { type: 'user' } }, expect: 400 });
add(['seoConfig'], 'PUT', '/api/admin/seo/config', 'incomplete key', { body: { serviceAccount: { client_email: 'a' } }, expect: 400 });
add(['seoConfig'], 'PUT', '/api/admin/seo/config', 'not JSON', { body: '{oops', ignore: ['error'], expect: 400 });
anon(['seoConfig'], 'GET', '/api/admin/seo/config');
anon(['seoConfig'], 'PUT', '/api/admin/seo/config');

// ── notifications ──
add(['notificationConfig'], 'GET', '/api/admin/notifications', 'read', { expect: 200 });
add(['notificationConfig'], 'GET', '/api/admin/notifications', 'seeded', { setup: (p) => p.notificationConfig.deleteMany(), expect: 200 });
add(['notificationConfig'], 'PUT', '/api/admin/notifications', 'merge', { body: { enabled: true, ntfy: { topic: 't', evil: 1 }, telegram: { chatId: '1' }, notifyOnContactMessage: true }, expect: 200 });
add(['notificationConfig'], 'PUT', '/api/admin/notifications', 'first save', { setup: (p) => p.notificationConfig.deleteMany(), body: { discord: { webhookUrl: 'u' } }, expect: 200 });
add(['notificationConfig'], 'PUT', '/api/admin/notifications', 'null body', { body: 'null', ignore: ['error'], expect: 500 });
anon(['notificationConfig'], 'GET', '/api/admin/notifications');
anon(['notificationConfig'], 'PUT', '/api/admin/notifications');

// ── blog API token ──
const blogMask = ['token', 'last4', 'blogApiTokenHash', 'blogApiTokenLast4'];
const blogStored = (body, db) => {
    const to = db.find((c) => c.model === 'config')?.to;
    return to?.blogApiTokenHash === sha(body.data.token) && to.data.blogApiTokenLast4 === body.data.token.slice(-4) && /^blg_[0-9a-f]{64}$/.test(body.data.token);
};
const withBlogToken = async (p) => {
    const row = await p.config.findFirst();
    await p.config.update({ where: { id: row.id }, data: { blogApiTokenHash: BEARER_HASH, data: { ...row.data, blogApiTokenLast4: 'abcd', blogApiTokenCreatedAt: PAST.toISOString() }, updatedAt: row.updatedAt } });
};
add(['config'], 'GET', '/api/admin/blogs/token', 'status', { setup: withBlogToken, expect: 200 });
add(['config'], 'POST', '/api/admin/blogs/token', 'generate', { mask: blogMask, check: blogStored, expect: 200 });
add(['config'], 'DELETE', '/api/admin/blogs/token', 'revoke', { setup: withBlogToken, expect: 200 });
anon(['config'], 'GET', '/api/admin/blogs/token');
anon(['config'], 'POST', '/api/admin/blogs/token');
anon(['config'], 'DELETE', '/api/admin/blogs/token');

// ── MCP token ──
const mcpMask = ['token', 'last4', 'mcpTokenHash', 'mcpTokenLast4', 'ipAddress'];
const mcpStored = (body, db) => {
    const row = db.find((c) => c.model === 'mcpConfig');
    const to = row?.to ?? row?.added;
    return to?.mcpTokenHash === sha(body.data.token) && /^mcp_[0-9a-f]{64}$/.test(body.data.token);
};
const withMcpToken = async (p) => {
    const data = { mcpTokenHash: BEARER_HASH, mcpTokenLast4: 'abcd', mcpTokenUpdatedAt: PAST };
    const row = await p.mcpConfig.findFirst();
    if (row) await p.mcpConfig.update({ where: { id: row.id }, data: { ...data, updatedAt: row.updatedAt } });
    else await p.mcpConfig.create({ data: { id: 'wp-mcp', ...data, createdAt: PAST, updatedAt: PAST } });
};
add(['mcpConfig'], 'GET', '/api/admin/mcp/token', 'status', { setup: withMcpToken, expect: 200 });
add(['mcpConfig'], 'GET', '/api/admin/mcp/token', 'no row', { setup: (p) => p.mcpConfig.deleteMany(), expect: 200 });
add(['mcpConfig', 'auditLog'], 'POST', '/api/admin/mcp/token', 'rotate', { setup: withMcpToken, mask: mcpMask, check: mcpStored, expect: 200 });
add(['mcpConfig', 'auditLog'], 'POST', '/api/admin/mcp/token', 'first token', { setup: (p) => p.mcpConfig.deleteMany(), mask: mcpMask, check: mcpStored, expect: 200 });
add(['mcpConfig', 'auditLog'], 'DELETE', '/api/admin/mcp/token', 'revoke', { setup: withMcpToken, mask: ['ipAddress'], expect: 200 });
add(['mcpConfig', 'auditLog'], 'DELETE', '/api/admin/mcp/token', 'no row', { setup: (p) => p.mcpConfig.deleteMany(), expect: 200 });
anon(['mcpConfig'], 'POST', '/api/admin/mcp/token');
anon(['mcpConfig'], 'DELETE', '/api/admin/mcp/token');

// ── MCP config ──
const mcp = {
    enabled: false, server: { name: 'n', extra: 1 }, transports: [{ endpoint: '/api/mcp' }, 5],
    capabilities: { tools: { enabled: true, listChanged: true }, logging: { enabled: true } },
    tools: [{ name: 'x', inputSchema: '{"type":"object"}', annotations: { readOnlyHint: 1 } }, { name: 7, enabled: false, inputSchema: {} }],
    resources: [{ uri: '/r', title: 'R' }], prompts: [{ name: 'p', arguments: [{ name: 'a', required: 'yes' }] }],
    links: [{ name: 'docs', url: '/docs' }], write: { enabled: 'true' },
};
add(['mcpConfig'], 'GET', '/api/admin/mcp/config', 'read', { expect: 200 });
add(['mcpConfig'], 'GET', '/api/admin/mcp/config', 'no row', { setup: (p) => p.mcpConfig.deleteMany(), expect: 200 });
add(['mcpConfig'], 'PUT', '/api/admin/mcp/config', 'normalized', { setup: withMcpToken, body: mcp, expect: 200 });
add(['mcpConfig'], 'PUT', '/api/admin/mcp/config', 'empty', { body: {}, expect: 200 });
add(['mcpConfig'], 'PUT', '/api/admin/mcp/config', 'first save', { setup: (p) => p.mcpConfig.deleteMany(), body: { write: { enabled: true } }, expect: 200 });
add(['mcpConfig'], 'PUT', '/api/admin/mcp/config', 'not JSON', { body: '{oops', ignore: ['error'], expect: 400 });
anon(['mcpConfig'], 'GET', '/api/admin/mcp/config');
anon(['mcpConfig'], 'PUT', '/api/admin/mcp/config');

// ── cron time zone ──
const job = (p) => p.cron.create({ data: { id: 'wp-cron', name: 'WP', action: 'webhook', schedule: '30 4 1 1 *', enabled: true, createdAt: PAST, updatedAt: PAST } });
add(['config'], 'GET', '/api/admin/crons/timezone', 'read', { expect: 200 });
// nextRun lies in the future, so it is compared as the exact value.
add(['config', 'cron'], 'POST', '/api/admin/crons/timezone', 'move the schedules', { setup: job, body: { timezone: 'Asia/Kolkata' }, mask: [], expect: 200 });
add(['config', 'cron'], 'POST', '/api/admin/crons/timezone', 'missing', { body: {}, expect: 400 });
add(['config', 'cron'], 'POST', '/api/admin/crons/timezone', 'unknown zone', { body: { timezone: 'Mars/Base' }, expect: 400 });
anon(['config'], 'GET', '/api/admin/crons/timezone');
anon(['config'], 'POST', '/api/admin/crons/timezone');

// ── uptime targets ──
const target = (p) => p.uptimeTarget.create({ data: { id: 'wp-target', label: 'WP', url: 'https://example.org', createdAt: PAST } });
add(['uptimeTarget'], 'GET', '/api/admin/health/targets', 'list', { setup: target, expect: 200 });
add(['uptimeTarget'], 'POST', '/api/admin/health/targets', 'create', { body: { label: ' L ', url: ' HTTPS://example.org/x ' }, expect: 200 });
add(['uptimeTarget'], 'POST', '/api/admin/health/targets', 'label from url', { body: { url: 'http://example.org' }, expect: 200 });
add(['uptimeTarget'], 'POST', '/api/admin/health/targets', 'bad url', { body: { url: 'ftp://x' }, expect: 400 });
add(['uptimeTarget'], 'DELETE', '/api/admin/health/targets?id=wp-target', 'delete', { setup: target, expect: 200 });
add(['uptimeTarget'], 'DELETE', '/api/admin/health/targets?id=wp-missing', 'missing', { expect: 200 });
add(['uptimeTarget'], 'DELETE', '/api/admin/health/targets', 'no id', { expect: 400 });
anon(['uptimeTarget'], 'GET', '/api/admin/health/targets');
anon(['uptimeTarget'], 'POST', '/api/admin/health/targets');
anon(['uptimeTarget'], 'DELETE', '/api/admin/health/targets?id=x');

// ── security ──
const audits = async (p) => {
    for (const [n, category, action] of [[1, 'wpcat', 'WP_ONE'], [2, 'wpcat', 'WP_TWO'], [3, 'wpcat', 'WP_100%']]) {
        await p.auditLog.create({ data: { id: `wp-audit-${n}`, category, action, createdAt: new Date(PAST.getTime() + n * 1000) } });
    }
};
// The login of this run is itself audited, so the unfiltered counts are the same for both servers.
add(['auditLog'], 'GET', '/api/admin/security/audit?category=wpcat', 'category', { setup: audits, expect: 200 });
add(['auditLog'], 'GET', '/api/admin/security/audit?category=wpcat&limit=2', 'first page', { setup: audits, expect: 200 });
add(['auditLog'], 'GET', '/api/admin/security/audit?category=wpcat&limit=2&cursor=wp-audit-2', 'next page', { setup: audits, expect: 200 });
add(['auditLog'], 'GET', '/api/admin/security/audit?action=wp_t', 'action, any case', { setup: audits, expect: 200 });
add(['auditLog'], 'GET', '/api/admin/security/audit?action=100%25', 'literal percent', { setup: audits, expect: 200 });
const device = (data) => (p) => p.session.create({ data: { id: 'wp-session', jti: 'wp-jti', ipAddress: '10.0.0.1', userAgent: 'wp', lastSeenAt: PAST, createdAt: PAST, expiresAt: soon(), ...data } });
add(['session', 'auditLog'], 'POST', '/api/admin/security/sessions/wp-session/revoke', 'revoke', { setup: device({}), mask: ['ipAddress', 'expiresAt'], expect: 200 });
add(['session', 'auditLog'], 'POST', '/api/admin/security/sessions/wp-session/revoke', 'already revoked', { setup: device({ revokedAt: PAST }), mask: ['expiresAt'], expect: 404 });
add(['session'], 'POST', '/api/admin/security/sessions/wp-missing/revoke', 'missing', { expect: 404 });
anon(['auditLog'], 'GET', '/api/admin/security/audit');
anon(['session'], 'GET', '/api/admin/security/sessions');
anon(['session'], 'POST', '/api/admin/security/sessions/x/revoke');

// ── analytics ──
const traffic = async (p) => {
    const now = new Date();
    const day = (back) => new Date(now.getTime() - back * 86_400_000).toISOString().slice(0, 10);
    await p.analyticsEvent.deleteMany();
    await p.analyticsDaily.deleteMany();
    await p.blog.create({ data: { id: 'wp-blog', title: 'WP analytics post', slug: 'wp-analytics-post', content: 'c', excerpt: 'e', image: '/i.png', date: '2025-01-02', createdAt: PAST, updatedAt: PAST } });
    await p.gallery.create({ data: { id: 'wp-photo', src: '/s.png', description: 'A description that is longer than thirty characters', width: 1, height: 1, createdAt: PAST } });
    let n = 0;
    const event = (data) => p.analyticsEvent.create({ data: { id: `wp-event-${n++}`, type: 'pageview', createdAt: now, ...data } });
    // Distinct counts, so the order of every list is fixed.
    const paths = ['/', '/blogs/wp-analytics-post', '/blogs/gone', '/apps/gone', '/about-me', '/custom'];
    for (const [i, path] of paths.entries()) for (let k = 0; k < paths.length - i; k++) await event({ path, referrerType: i < 1 ? 'search' : 'direct', device: i < 2 ? 'mobile' : 'desktop', country: i < 1 ? ' in' : i < 3 ? 'US' : i < 4 ? 'XYZ' : null });
    await event({ path: '/', isBot: true });
    for (let k = 0; k < 2; k++) await event({ type: 'entity_view', entityType: 'blog', entityId: 'wp-blog', entitySlug: 'wp-analytics-post' });
    await event({ type: 'entity_view', entityType: 'blog', entityId: 'wp-gone', entitySlug: '' });
    await event({ type: 'entity_view', entityType: 'gallery', entityId: 'wp-photo' });
    for (const [back, type, views, uniques] of [[0, 'pageview', 5, 3], [1, 'pageview', 2, 1], [0, 'contact_submit', 1, 1], [8, 'pageview', 7, 6], [40, 'entity_view', 9, 9], [200, 'pageview', 50, 50]]) {
        await p.analyticsDaily.create({ data: { id: `wp-daily-${back}-${type}`, day: day(back), type, views, uniques, createdAt: PAST, updatedAt: PAST } });
    }
};
const analytics = ['analyticsEvent', 'analyticsDaily', 'blog', 'gallery'];
for (const query of ['', '?range=7d', '?range=90d', '?range=nope']) add(analytics, 'GET', `/api/admin/analytics${query}`, 'dashboard', { setup: traffic, expect: 200 });
add(analytics, 'DELETE', '/api/admin/analytics', 'reset', { setup: traffic, expect: 200 });
anon(['analyticsEvent'], 'GET', '/api/admin/analytics');
anon(['analyticsEvent'], 'DELETE', '/api/admin/analytics');

export default cases;
