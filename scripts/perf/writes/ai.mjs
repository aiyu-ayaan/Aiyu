// The AI Hub tables.
import { BEARER_HASH, PAST } from './_shared.mjs';

const dates = { createdAt: PAST, updatedAt: PAST };
const category = (p) => p.aiSkillCategory.create({ data: { id: 'wp-cat', label: 'C', displayOrder: -50, ...dates } });
const cases = [];

const kinds = [
    { path: 'skills/categories', model: 'aiSkillCategory', models: ['aiSkillCategory'], fresh: { label: 'New' }, base: { label: 'L' }, patch: { label: 'Renamed', accent: null, displayOrder: '' }, bad: { label: ' ' } },
    { path: 'skills/items', model: 'aiSkill', models: ['aiSkillCategory', 'aiSkill'], before: category, fresh: { categoryId: 'wp-cat', name: 'S', url: '' }, base: { categoryId: 'wp-cat', name: 'S' }, patch: { name: 'R', description: null, url: 'https://example.org' }, bad: { categoryId: 'wp-cat' } },
    { path: 'recommendations', model: 'aiRecommendation', models: ['aiRecommendation'], fresh: { name: 'R', rating: '9', tags: ['a', 3, ''] }, base: { name: 'R' }, patch: { rating: 1.6, tags: null }, bad: { name: 'x', tags: 'a' } },
    { path: 'credits', model: 'aiCredit', models: ['aiCredit'], fresh: { name: 'C', noCard: 'false', freeApi: 0 }, base: { name: 'C' }, patch: { noCard: false, note: 'n' }, bad: { name: 'x', note: 'n'.repeat(501) } },
    { path: 'prompts', model: 'aiPrompt', models: ['aiPrompt'], fresh: { title: 'T', prompt: 'P', displayOrder: 3.4 }, base: { title: 'T', prompt: 'P' }, patch: { role: 'r', displayOrder: '12' }, bad: { title: 'x' } },
];

for (const k of kinds) {
    const base = `/api/ai/${k.path}`;
    const one = async (p) => { await k.before?.(p); await p[k.model].create({ data: { id: 'wp-1', ...k.base, ...dates } }); };
    const add = (method, path, name, rest = {}) => cases.push({ models: k.models, method, path, name, ...rest });
    add('POST', base, 'create', { setup: k.before, body: k.fresh, expect: 200 });
    add('POST', base, 'empty body', { body: '', expect: 400 });
    add('POST', base, 'invalid field', { setup: k.before, body: k.bad, expect: 400 });
    add('POST', base, 'bad order', { setup: k.before, body: { ...k.fresh, displayOrder: 'x' }, expect: 400 });
    add('POST', base, 'bearer token', { models: [...k.models, 'config'], auth: 'bearer', setup: async (p) => { await k.before?.(p); const r = await p.config.findFirst(); await p.config.update({ where: { id: r.id }, data: { blogApiTokenHash: BEARER_HASH, updatedAt: r.updatedAt } }); }, body: k.fresh, expect: 200 });
    add('POST', base, 'anonymous', { auth: 'anon', body: k.fresh, expect: 401 });
    add('PUT', `${base}/wp-1`, 'update', { setup: one, body: k.patch, expect: 200 });
    add('PUT', `${base}/wp-1`, 'nothing to update', { setup: one, body: { unknown: 1 }, expect: 400 });
    add('PUT', `${base}/wp-missing`, 'missing', { body: k.patch, expect: 404 });
    add('DELETE', `${base}/wp-1`, 'delete', { setup: one, expect: 200 });
    add('DELETE', `${base}/wp-missing`, 'missing', { expect: 404 });
    add('DELETE', `${base}/wp-1`, 'anonymous', { auth: 'anon', setup: one, expect: 401 });
}
cases.push({ models: ['aiSkillCategory', 'aiSkill'], method: 'POST', path: '/api/ai/skills/items', name: 'unknown category', body: { categoryId: 'wp-none', name: 'x' }, expect: 404 });
cases.push({ models: ['aiSkillCategory', 'aiSkill'], method: 'PUT', path: '/api/ai/skills/items/wp-1', name: 'move to an unknown category', setup: async (p) => { await category(p); await p.aiSkill.create({ data: { id: 'wp-1', categoryId: 'wp-cat', name: 'S', ...dates } }); }, body: { categoryId: 'wp-none' }, expect: 404 });

const tables = ['aiSkillCategory', 'aiSkill', 'aiRecommendation', 'aiCredit', 'aiPrompt'];
cases.push({ models: tables, method: 'POST', path: '/api/ai/seed', name: 'nothing to seed', expect: 200 });
cases.push({ models: tables, method: 'POST', path: '/api/ai/seed', name: 'empty tables', setup: async (p) => { for (const t of [...tables].reverse()) await p[t].deleteMany(); }, expect: 200 });
cases.push({ models: tables, method: 'POST', path: '/api/ai/seed', name: 'anonymous', auth: 'anon', expect: 401 });

export default cases;
