// Projects, deployments and the gallery.
import { PAST } from './_shared.mjs';

const dates = { createdAt: PAST, updatedAt: PAST };
const project = (id, extra = {}) => (p) => p.project.create({ data: { id, name: `WP ${id}`, year: '2026', status: 'Done', projectType: 'Web', description: 'd', techStack: ['a'], displayOrder: 5, ...dates, ...extra } });
const deployment = (id, extra = {}) => (p) => p.deployment.create({ data: { id, name: `WP ${id}`, appType: 'Web', hostingProvider: 'x', description: 'd', displayOrder: 5, ...dates, ...extra } });
const gallery = (id, order) => (p) => p.gallery.create({ data: { id, src: '/u/a.jpg', description: 'd', width: 1, height: 2, order, createdAt: PAST } });
const all = (...setups) => async (p) => { for (const s of setups) await s(p); };

const cases = [];
const add = (models, method, path, name, rest = {}) => cases.push({ models, method, path, name, ...rest });
const newProject = { name: 'WP Created', year: '2024 - 2026', status: 'Done', projectType: 'Web', description: 'd', techStack: ['Rust'], codeLink: null };
const newApp = { name: 'WP App', appType: 'Web', hostingProvider: 'x', description: 'd' };

for (const [kind, plural, model, make, fresh] of [['project', 'projects', 'project', project, newProject], ['deployment', 'deployments', 'deployment', deployment, newApp]]) {
    const models = model === 'deployment' ? ['project', 'deployment'] : ['project'];
    const base = `/api/${plural}`;
    add(models, 'POST', base, 'create, placed first', { body: fresh, expect: 201 });
    add(models, 'POST', base, 'create with an order', { body: { ...fresh, displayOrder: 7.9 }, expect: 201 });
    add(models, 'POST', base, 'string order ignored', { body: { ...fresh, displayOrder: '7' }, expect: 201 });
    add(models, 'POST', base, 'missing fields', { body: { name: 'x' }, expect: 500 });
    add(models, 'POST', base, 'anonymous', { auth: 'anon', body: fresh, expect: 401 });
    add(models, 'PUT', `${base}/wp-1`, 'update', { setup: make('wp-1'), body: { name: 'Renamed', displayOrder: '3', unknown: true }, expect: 200 });
    add(models, 'PUT', `${base}/wp-1`, 'whole document sent back', { setup: make('wp-1'), body: async (p) => { const { id, ...r } = await p[model].findUnique({ where: { id: 'wp-1' } }); return Object.fromEntries(Object.entries({ _id: id, ...r }).filter(([, v]) => v !== null)); }, expect: 200 });
    add(models, 'PUT', `${base}/wp-1`, 'whole document with nulls', { setup: make('wp-1'), body: async (p) => { const { id, ...r } = await p[model].findUnique({ where: { id: 'wp-1' } }); return { _id: id, ...r }; } });
    add(models, 'PUT', `${base}/wp-1`, 'empty patch', { setup: make('wp-1'), body: {}, expect: 200 });
    add(models, 'PUT', `${base}/wp-missing`, 'missing', { body: { name: 'x' }, expect: 404 });
    add(models, 'PUT', `${base}/wp-1`, 'wrong type', { setup: make('wp-1'), body: { name: null }, expect: 500 });
    add(models, 'DELETE', `${base}/wp-1`, 'delete', { setup: make('wp-1'), expect: 200 });
    add(models, 'DELETE', `${base}/wp-missing`, 'missing', { expect: 404 });
    add(models, 'DELETE', `${base}/wp-1`, 'anonymous', { auth: 'anon', setup: make('wp-1'), expect: 401 });
    add(models, 'PATCH', `${base}/reorder`, 'reorder', { setup: all(make('wp-1'), make('wp-2')), body: { orderedIds: ['wp-2', 'wp-1'] }, expect: 200 });
    add(models, 'PATCH', `${base}/reorder`, 'empty', { body: { orderedIds: [] }, expect: 400 });
    add(models, 'PATCH', `${base}/reorder`, 'duplicates', { body: { orderedIds: ['a', 'a'] }, expect: 400 });
    add(models, 'PATCH', `${base}/reorder`, 'not a string', { body: { orderedIds: [1] }, expect: 400 });
    add(models, 'PATCH', `${base}/reorder`, `unknown ${kind}`, { setup: make('wp-1'), body: { orderedIds: ['wp-1', 'wp-missing'] }, expect: 404 });
}
const synced = project('wp-1', { source: 'github', repoFullName: 'wp/parity', pinnedFields: ['year'] });
add(['project'], 'PUT', '/api/projects/wp-1', 'edit pins the changed field', { setup: synced, body: { name: 'Mine', year: '2026', description: 'd' }, expect: 200 });
add(['project'], 'PUT', '/api/projects/wp-1', 'null clears repo data', { setup: project('wp-1', { repoData: { stars: 1 } }), body: { repoData: null } });
add(['project'], 'PUT', '/api/projects/wp-1', 'explicit pins win', { setup: synced, body: { name: 'Mine', pinnedFields: [] }, expect: 200 });
const linked = ['project', 'deployment'];
add(linked, 'POST', '/api/deployments', 'linked project', { setup: project('wp-p'), body: { ...newApp, projectId: ' wp-p ' }, expect: 201 });
add(linked, 'POST', '/api/deployments', 'unknown project', { body: { ...newApp, projectId: 'wp-missing' }, expect: 400 });
add(linked, 'PUT', '/api/deployments/wp-1', 'unlink', { setup: all(project('wp-p'), deployment('wp-1', { projectId: 'wp-p' })), body: { projectId: '' }, expect: 200 });
add(linked, 'PUT', '/api/deployments/wp-1', 'unknown project', { setup: deployment('wp-1'), body: { projectId: 'wp-missing' }, expect: 400 });

const item = { src: '/api/uploads/a.jpg', description: 'd', width: '640', height: 480.7 };
add(['gallery'], 'POST', '/api/gallery', 'create, placed first', { body: item, expect: 201 });
add(['gallery'], 'POST', '/api/gallery', 'missing fields', { body: { src: 'x' }, ignore: ['error'], expect: 400 });
add(['gallery'], 'POST', '/api/gallery', 'anonymous', { auth: 'anon', body: item, expect: 401 });
add(['gallery'], 'PUT', '/api/gallery', 'pin', { setup: gallery('wp-1', 3), body: { id: 'wp-1', update: { isPinned: true } }, expect: 200 });
add(['gallery'], 'PUT', '/api/gallery', 'nothing to update', { setup: gallery('wp-1', 3), body: { id: 'wp-1' }, expect: 200 });
add(['gallery'], 'PUT', '/api/gallery', 'reorder', { setup: all(gallery('wp-1', 3), gallery('wp-2', 4)), body: { items: [{ id: 'wp-1', order: 9 }, { id: 'wp-2', order: '8' }] }, expect: 200 });
add(['gallery'], 'PUT', '/api/gallery', 'reorder is all or nothing', { setup: gallery('wp-1', 3), body: { items: [{ id: 'wp-1', order: 9 }, { id: 'wp-missing', order: 1 }] }, ignore: ['error'], expect: 400 });
add(['gallery'], 'PUT', '/api/gallery', 'missing item', { body: { id: 'wp-missing', update: { isPinned: true } }, expect: 404 });
add(['gallery'], 'PUT', '/api/gallery', 'no target', { body: {}, expect: 400 });
add(['gallery'], 'DELETE', '/api/gallery?id=wp-1', 'delete', { setup: gallery('wp-1', 3), expect: 200 });
add(['gallery'], 'DELETE', '/api/gallery', 'no id', { expect: 400 });
add(['gallery'], 'DELETE', '/api/gallery?id=wp-missing', 'missing', { expect: 404 });
add(['gallery'], 'DELETE', '/api/gallery?id=wp-1', 'anonymous', { auth: 'anon', setup: gallery('wp-1', 3), expect: 401 });

export default cases;
