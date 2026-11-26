// Blog posts and the admin side of the contact messages.
import { BEARER_HASH, PAST } from './_shared.mjs';

const models = ['blog'];
const long = 'A real article body that is comfortably long enough to pass review.';
const post = (id, extra = {}) => (p) => p.blog.create({ data: { id, title: `WP ${id}`, slug: `wp-${id}`, content: long, date: 'May 1, 2026', createdAt: PAST, updatedAt: PAST, ...extra } });
const all = (...setups) => async (p) => { for (const s of setups) await s(p); };
const bearerToken = async (p) => {
    const row = await p.config.findFirst();
    await p.config.update({ where: { id: row.id }, data: { blogApiTokenHash: BEARER_HASH, updatedAt: row.updatedAt } });
};

const cases = [];
const add = (method, path, name, rest = {}) => cases.push({ models, method, path, name, ...rest });

add('POST', '/api/blogs', 'draft', { body: { title: '  Quartz Notes: Üñ & more!  ', content: long, tags: 'a, b,,c', keywords: ['k ', null, 2], canonicalUrl: '/blogs/x', published: 'true', evil: 1 }, expect: 201 });
add('POST', '/api/blogs', 'published', { body: { title: 'Quartz Release', content: long, date: 'June 2, 2026', published: true, canonicalUrl: 'https://elsewhere.test/x' }, expect: 201 });
add('POST', '/api/blogs', 'default date', { body: { title: 'Quartz Dated', content: long }, expect: 201 });
add('POST', '/api/blogs', 'flagged stays a draft', { body: { title: 'Test blog', content: 'hello world', published: true, tags: ['demo'] }, expect: 201 });
add('POST', '/api/blogs', 'custom keyword', { models: ['blog', 'config'], setup: async (p) => { const r = await p.config.findFirst(); await p.config.update({ where: { id: r.id }, data: { data: { ...r.data, customTestKeywords: 'zork,\nqux' }, updatedAt: r.updatedAt } }); }, body: { title: 'Quartz zork', content: long }, expect: 201 });
add('POST', '/api/blogs', 'slug is numbered', { setup: post('wp-1', { title: 'Other', slug: 'quartz-twin' }), body: { title: 'Quartz Twin', content: long }, expect: 201 });
add('POST', '/api/blogs', 'title with no letters', { body: { title: '!!!', content: long }, expect: 201 });
add('POST', '/api/blogs', 'title taken, any case', { setup: post('wp-1'), body: { title: 'wp WP-1', content: long }, expect: 409 });
add('POST', '/api/blogs', 'no content', { body: { title: 'x' }, expect: 400 });
add('POST', '/api/blogs', 'not JSON', { body: '{oops', ignore: ['error'], expect: 400 });
add('POST', '/api/blogs', 'bearer token marks it automated', { models: ['blog', 'config'], auth: 'bearer', setup: bearerToken, body: { title: 'Quartz Robot', content: long }, expect: 201 });
add('POST', '/api/blogs', 'anonymous', { auth: 'anon', body: { title: 'x', content: long }, expect: 401 });

add('PUT', '/api/blogs/wp-1', 'rename moves the slug', { setup: post('wp-1'), body: { title: ' Quartz Renamed ', published: true, tags: 'x,y', excerpt: ' e ' }, expect: 200 });
add('PUT', '/api/blogs/wp-1', 'content only keeps the slug', { setup: post('wp-1'), body: { content: `${long} more` }, expect: 200 });
add('PUT', '/api/blogs/wp-1', 'empty slug is filled', { setup: post('wp-1', { slug: '' }), body: { noIndex: 'yes' }, expect: 200 });
add('PUT', '/api/blogs/wp-1', 'review fields', { setup: post('wp-1', { isFlagged: true }), body: { isFlagged: 0, flagReason: '', reviewStatus: 'CLEAN' }, expect: 200 });
add('PUT', '/api/blogs/wp-1', 'whole document sent back', { setup: post('wp-1'), body: async (p) => { const { id, searchVector, ...r } = await p.blog.findUnique({ where: { id: 'wp-1' } }); return { _id: id, ...r, views: 3 }; }, expect: 200 });
add('PUT', '/api/blogs/wp-1', 'title taken', { setup: all(post('wp-1'), post('wp-2')), body: { title: 'WP WP-2' }, expect: 409 });
add('PUT', '/api/blogs/wp-1', 'wrong type', { setup: post('wp-1'), body: { content: 5 }, ignore: ['error'], expect: 400 });
add('PUT', '/api/blogs/wp-missing', 'missing', { body: { title: 'x' }, expect: 404 });
add('PUT', '/api/blogs/wp-1', 'anonymous', { auth: 'anon', setup: post('wp-1'), body: { title: 'x' }, expect: 401 });
add('PUT', '/api/blogs/wp-1', 'bearer token is not enough', { models: ['blog', 'config'], auth: 'bearer', setup: all(bearerToken, post('wp-1')), body: { title: 'x' }, expect: 401 });
add('DELETE', '/api/blogs/wp-1', 'delete', { setup: post('wp-1'), expect: 200 });
add('DELETE', '/api/blogs/wp-missing', 'missing', { expect: 404 });
add('DELETE', '/api/blogs/wp-1', 'anonymous', { auth: 'anon', setup: post('wp-1'), expect: 401 });

const message = (p) => p.contactMessage.create({ data: { id: 'wp-msg', name: 'n', email: 'e@example.test', message: 'm', createdAt: PAST } });
const contact = (method, path, name, rest) => add(method, path, name, { models: ['contactMessage'], setup: message, ...rest });
contact('GET', '/api/contact/message', 'list', { expect: 200 });
contact('GET', '/api/contact/message?limit=1', 'limit', { expect: 200 });
contact('GET', '/api/contact/message?limit=abc', 'bad limit', { expect: 200 });
contact('GET', '/api/contact/message', 'anonymous', { auth: 'anon', expect: 401 });
contact('DELETE', '/api/contact/message?id=wp-msg', 'delete', { expect: 200 });
contact('DELETE', '/api/contact/message?id=wp-none', 'unknown id', { expect: 200 });
contact('DELETE', '/api/contact/message', 'no id', { expect: 400 });
contact('DELETE', '/api/contact/message?id=wp-msg', 'anonymous', { auth: 'anon', expect: 401 });

export default cases;
