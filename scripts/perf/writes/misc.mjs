// Resume Studio, uptime targets' checks, cache purge. The uptime check pings only a local address.
import { PAST } from './_shared.mjs';

const cases = [];
const add = (models, method, path, name, rest = {}) => cases.push({ models, method, path, name, ...rest });

add(['resumeStudio'], 'GET', '/api/admin/resume', 'read', { expect: 200 });
add(['resumeStudio'], 'GET', '/api/admin/resume', 'no row', { setup: (p) => p.resumeStudio.deleteMany(), expect: 200 });
add(['resumeStudio'], 'PUT', '/api/admin/resume', 'document', { body: { latex: '\\x é', engine: 'xelatex', templateId: 't', activeVersionId: 7, lastCompiledAt: null, other: 1 }, expect: 200 });
add(['resumeStudio'], 'PUT', '/api/admin/resume', 'snapshots and ideas', { body: { snapshots: [{ id: 's', label: 'L', latex: 'x', createdAt: '2025-01-01T00:00:00.000Z' }], ideas: [{ id: 1, text: 'y'.repeat(2100), done: 'yes', createdAt: 'c' }] }, expect: 200 });
add(['resumeStudio'], 'PUT', '/api/admin/resume', 'too large', { body: { latex: 'a'.repeat(512 * 1024 + 1) }, expect: 413 });
add(['resumeStudio'], 'PUT', '/api/admin/resume', 'null body', { body: 'null', expect: 500 });
add(['resumeStudio'], 'PUT', '/api/admin/resume', 'anonymous', { auth: 'anon', body: {}, expect: 401 });
add(['resumeStudio'], 'POST', '/api/admin/resume/compile', 'no source', { body: {}, expect: 400 });
add(['config', 'resumeStudio'], 'POST', '/api/admin/resume/publish', 'publish', { body: { pdfBase64: Buffer.from('%PDF-1.4 test').toString('base64'), filename: 'cv.pdf' }, expect: 200 });
add(['config', 'resumeStudio'], 'POST', '/api/admin/resume/publish', 'not a PDF', { body: { pdfBase64: Buffer.from('hello world').toString('base64') }, expect: 400 });
add(['config'], 'POST', '/api/admin/resume/publish', 'missing', { body: {}, expect: 400 });
add(['config'], 'POST', '/api/admin/resume/publish', 'empty', { body: { pdfBase64: '!!!' }, expect: 413 });
add(['config'], 'POST', '/api/admin/purge-cache', 'purge', { expect: 200 });
add(['config'], 'POST', '/api/admin/purge-cache', 'anonymous', { auth: 'anon', expect: 401 });

// Only these two targets exist during a case, so nothing outside this machine is pinged.
const local = async (p) => {
    await p.deployment.updateMany({ data: { hostedUrl: null } });
    await p.uptimeTarget.deleteMany();
    await p.uptimeCheck.deleteMany();
    await p.uptimeTarget.create({ data: { id: 'wp-up', label: 'Up', url: 'http://127.0.0.1:3100/api/health', createdAt: PAST } });
    await p.uptimeTarget.create({ data: { id: 'wp-down', label: 'Down', url: 'http://127.0.0.1:1/', createdAt: PAST } });
    await p.uptimeCheck.create({ data: { id: 'wp-old', target: 'http://127.0.0.1:1/', label: 'Down', source: 'custom', status: 'up', statusCode: 200, latencyMs: 5, error: '', checkedAt: PAST } });
};
const uptime = ['deployment', 'uptimeTarget', 'uptimeCheck'];
add(uptime, 'GET', '/api/admin/health/uptime', 'summary', { setup: local, expect: 200 });
add(uptime, 'POST', '/api/admin/health/uptime/check', 'check now', { setup: local, mask: ['latencyMs'], expect: 200 });
add(uptime, 'POST', '/api/admin/health/uptime/check', 'anonymous', { auth: 'anon', setup: local, expect: 401 });

export default cases;
