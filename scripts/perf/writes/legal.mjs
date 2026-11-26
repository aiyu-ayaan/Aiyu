// Legal apps and their pages.
import { PAST } from './_shared.mjs';

const models = ['legalApp', 'legalDocument'];
const dates = { createdAt: PAST, updatedAt: PAST };
const app = (p) => p.legalApp.create({ data: { id: 'wp-app', name: 'WP App', slug: 'wp-app', ...dates } });
const doc = (extra = {}) => async (p) => { await app(p); await p.legalDocument.create({ data: { id: 'wp-doc', appId: 'wp-app', kind: 'eula', title: 'EULA', slug: 'eula', displayOrder: 4, ...dates, ...extra } }); };
const other = async (p) => { await doc()(p); await p.legalApp.create({ data: { id: 'wp-app2', name: 'Two', slug: 'wp-two', ...dates } }); await p.legalDocument.create({ data: { id: 'wp-doc2', appId: 'wp-app', title: 'T', slug: 'taken', ...dates } }); };

const cases = [];
const add = (method, path, name, rest = {}) => cases.push({ models, method, path, name, ...rest });

add('POST', '/api/legal/apps', 'create', { body: { name: '  Parity_Product ', packageName: 'com.example.parity', description: 'd', contactEmail: 'a@example.test', deploymentId: '' }, expect: 200 });
add('POST', '/api/legal/apps', 'no name', { body: {}, expect: 400 });
add('POST', '/api/legal/apps', 'not JSON', { body: '{oops', expect: 400 });
add('POST', '/api/legal/apps', 'blank name', { body: { name: '  ' }, expect: 400 });
add('POST', '/api/legal/apps', 'long description', { body: { name: 'x', description: 'a'.repeat(501) }, expect: 400 });
add('POST', '/api/legal/apps', 'reserved slug', { body: { name: 'Blogs' }, expect: 400 });
add('POST', '/api/legal/apps', 'bad slug', { body: { name: '!!!' }, expect: 400 });
add('POST', '/api/legal/apps', 'bad package', { body: { name: 'x', packageName: 'nodots' }, expect: 400 });
add('POST', '/api/legal/apps', 'unknown deployment', { body: { name: 'x', deploymentId: 'wp-none' }, expect: 404 });
add('POST', '/api/legal/apps', 'slug taken', { setup: app, body: { name: 'WP App' }, expect: 409 });
add('POST', '/api/legal/apps', 'anonymous', { auth: 'anon', body: { name: 'x' }, expect: 401 });
add('PUT', '/api/legal/apps/wp-app', 'rename', { setup: doc(), body: { name: 'Renamed', slug: '', packageName: '', description: null }, expect: 200 });
add('PUT', '/api/legal/apps/wp-app', 'empty patch', { setup: doc(), body: {}, expect: 200 });
add('PUT', '/api/legal/apps/wp-app', 'slug taken', { setup: other, body: { slug: 'wp-two' }, expect: 409 });
add('PUT', '/api/legal/apps/wp-missing', 'missing', { body: { name: 'x' }, expect: 404 });
add('DELETE', '/api/legal/apps/wp-app', 'delete with pages', { setup: doc(), expect: 200 });
add('DELETE', '/api/legal/apps/wp-missing', 'missing', { expect: 404 });
add('DELETE', '/api/legal/apps/wp-app', 'anonymous', { auth: 'anon', setup: app, expect: 401 });

const pages = '/api/legal/apps/wp-app/documents';
add('POST', pages, 'preset kind', { setup: app, body: { kind: 'privacy-policy' }, expect: 200 });
add('POST', pages, 'custom, placed first', { setup: doc(), body: { title: 'My Page', format: ' HTML ', content: '<p>x</p>', published: 0, noIndex: 'y' }, expect: 200 });
add('POST', pages, 'explicit order', { setup: doc(), body: { kind: 'disclaimer', displayOrder: '2.5' }, expect: 200 });
add('POST', pages, 'custom without title', { setup: app, body: {}, expect: 400 });
add('POST', pages, 'unknown kind', { setup: app, body: { kind: 'poem' }, expect: 400 });
add('POST', pages, 'bad format', { setup: app, body: { kind: 'eula', format: 'pdf' }, expect: 400 });
add('POST', pages, 'slug taken', { setup: doc(), body: { kind: 'eula' }, expect: 409 });
add('POST', '/api/legal/apps/wp-missing/documents', 'missing app', { body: { kind: 'eula' }, expect: 404 });
add('PUT', '/api/legal/documents/wp-doc', 'edit', { setup: doc(), body: { kind: 'custom', title: 'New', slug: '', content: ' c ', published: false, displayOrder: 7.5 }, expect: 200 });
add('PUT', '/api/legal/documents/wp-doc', 'unreadable order ignored', { setup: doc(), body: { displayOrder: 'x' }, expect: 200 });
add('PUT', '/api/legal/documents/wp-doc', 'slug taken', { setup: other, body: { slug: 'taken' }, expect: 409 });
add('PUT', '/api/legal/documents/wp-doc', 'blank title', { setup: doc(), body: { title: '' }, expect: 400 });
add('PUT', '/api/legal/documents/wp-missing', 'missing', { body: {}, expect: 404 });
add('DELETE', '/api/legal/documents/wp-doc', 'delete', { setup: doc(), expect: 200 });
add('DELETE', '/api/legal/documents/wp-missing', 'missing', { expect: 404 });
add('DELETE', '/api/legal/documents/wp-doc', 'anonymous', { auth: 'anon', setup: doc(), expect: 401 });

export default cases;
