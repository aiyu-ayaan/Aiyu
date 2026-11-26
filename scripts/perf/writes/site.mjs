// Singletons, the active theme, the AI Hub layout, socials and themes.
import { BEARER_HASH, PAST } from './_shared.mjs';

const social = (p) => p.social.create({ data: { id: 'wp-social', name: 'Parity', url: 'https://example.org', iconName: 'FaGithub' } });
const variants = { light: { '--bg-primary': '#fff' }, dark: { '--bg-primary': '#000' } };
const theme = (p) => p.theme.create({ data: { id: 'wp-theme', name: 'WP Theme', slug: 'wp-theme', variants, createdAt: PAST, updatedAt: PAST } });
const config = async (p, patch) => {
    const row = await p.config.findFirst();
    await p.config.update({ where: { id: row.id }, data: { data: { ...row.data, ...patch }, updatedAt: row.updatedAt } });
};
const bearerToken = async (p) => {
    const row = await p.config.findFirst();
    await p.config.update({ where: { id: row.id }, data: { blogApiTokenHash: BEARER_HASH, updatedAt: row.updatedAt } });
};

const cases = [];
const add = (models, method, path, name, rest = {}) => cases.push({ models, method, path, name, ...rest });

for (const [path, model] of [['/api/about', 'about'], ['/api/home', 'home'], ['/api/header', 'header'], ['/api/config', 'config']]) {
    add([model], 'PUT', path, 'merge a patch', { body: { wpString: 'é "quoted"', wpNested: { a: [1, 2.5, null, true] } }, expect: 200 });
    add([model], 'PUT', path, 'ids in the body are ignored', { body: { _id: 'other', id: 'other', __v: 3, wpString: 'x' }, expect: 200 });
    add([model], 'PUT', path, 'whole document sent back', { body: async (p) => { const r = await p[model].findFirst(); return { ...r.data, _id: r.id }; }, expect: 200 });
    add([model], 'PUT', path, 'not JSON', { body: '{oops', expect: 500 });
    add([model], 'PUT', path, 'anonymous', { auth: 'anon', body: { wpString: 'x' }, expect: 401 });
}
add(['config'], 'POST', '/api/config', 'POST works like PUT', { body: { wpString: 'x' }, expect: 200 });
add(['config'], 'PUT', '/api/config', 'secret columns', { body: { blogApiTokenHash: 'abc', encryptedGeminiApiKey: null }, expect: 200 });

add(['config', 'theme'], 'PATCH', '/api/themes/active', 'preset and variant', { body: { themeSlug: 'vs-code-dark', variant: 'light' }, expect: 200 });
add(['config', 'theme'], 'PATCH', '/api/themes/active', 'custom theme', { setup: theme, body: { themeSlug: 'wp-theme' }, expect: 200 });
add(['config'], 'PATCH', '/api/themes/active', 'per-page themes merge', { setup: (p) => config(p, { perPageThemes: { enabled: false, pages: { '/blogs': 'a' } } }), body: { perPageThemes: { enabled: true } }, expect: 200 });
add(['config'], 'PATCH', '/api/themes/active', 'nothing to change', { body: {}, expect: 200 });
add(['config'], 'PATCH', '/api/themes/active', 'unknown theme', { body: { themeSlug: 'wp-missing' }, expect: 404 });
add(['config'], 'PATCH', '/api/themes/active', 'bad variant', { body: { variant: 'sepia' }, expect: 400 });
add(['config'], 'PATCH', '/api/themes/active', 'anonymous', { auth: 'anon', body: {}, expect: 401 });

const sections = [{ id: 'wp', type: 'custom', enabled: true, title: 'T' }];
add(['aiPage'], 'PUT', '/api/ai/layout', 'sections', { body: { sections }, expect: 200 });
add(['aiPage'], 'PUT', '/api/ai/layout', 'threshold rounded and clamped', { body: { sections, subPageThreshold: '900.4' }, expect: 200 });
add(['aiPage'], 'PUT', '/api/ai/layout', 'threshold half rounds up', { body: { sections, subPageThreshold: 2.5 }, expect: 200 });
add(['aiPage'], 'PUT', '/api/ai/layout', 'bad threshold', { body: { sections, subPageThreshold: 'many' }, expect: 400 });
add(['aiPage'], 'PUT', '/api/ai/layout', 'no sections', { body: { sections: 'x' }, expect: 400 });
add(['aiPage'], 'PUT', '/api/ai/layout', 'not JSON', { body: '{oops', expect: 500 });
add(['aiPage', 'config'], 'PUT', '/api/ai/layout', 'bearer token', { auth: 'bearer', setup: bearerToken, body: { sections }, expect: 200 });
add(['aiPage'], 'PUT', '/api/ai/layout', 'wrong bearer token', { auth: 'anon', headers: { authorization: 'Bearer nope' }, body: { sections }, expect: 401 });

add(['social'], 'POST', '/api/socials', 'create', { body: { name: 'N', url: 'u', iconName: 'i', extra: 1, _id: 'x' }, expect: 201 });
add(['social'], 'POST', '/api/socials', 'missing fields', { body: { name: 'N' }, expect: 500 });
add(['social'], 'POST', '/api/socials', 'wrong type', { body: { name: 1, url: 'u', iconName: 'i' }, expect: 500 });
add(['social'], 'POST', '/api/socials', 'anonymous', { auth: 'anon', body: {}, expect: 401 });
add(['social'], 'PUT', '/api/socials/wp-social', 'update', { setup: social, body: { _id: 'wp-social', name: 'Renamed', isHidden: true }, expect: 200 });
add(['social'], 'PUT', '/api/socials/wp-social', 'empty patch', { setup: social, body: {}, expect: 200 });
add(['social'], 'PUT', '/api/socials/wp-missing', 'missing', { body: { name: 'x' }, expect: 404 });
add(['social'], 'DELETE', '/api/socials/wp-social', 'delete', { setup: social, expect: 200 });
add(['social'], 'DELETE', '/api/socials/wp-missing', 'missing', { expect: 404 });
add(['social'], 'DELETE', '/api/socials/wp-social', 'anonymous', { auth: 'anon', setup: social, expect: 401 });

add(['theme'], 'POST', '/api/themes', 'create', { body: { name: 'WP New Theme!', variants }, expect: 201 });
add(['theme'], 'POST', '/api/themes', 'no variants', { body: { name: 'x' }, expect: 400 });
add(['theme'], 'POST', '/api/themes', 'preset name', { body: { name: 'VS Code Dark', variants }, expect: 400 });
add(['theme'], 'POST', '/api/themes', 'name taken', { setup: theme, body: { name: 'wp theme', variants }, expect: 400 });
add(['theme'], 'PUT', '/api/themes/wp-theme', 'update by slug', { setup: theme, body: { name: 'Renamed', description: '' }, expect: 200 });
add(['theme'], 'PUT', '/api/themes/wp-theme', 'empty patch', { setup: theme, body: {}, expect: 200 });
add(['theme'], 'PUT', '/api/themes/vs-code-dark', 'preset', { body: { name: 'x' }, expect: 403 });
add(['theme'], 'PUT', '/api/themes/wp-missing', 'missing', { body: { name: 'x' }, expect: 404 });
add(['theme'], 'DELETE', '/api/themes/wp-theme', 'delete', { setup: theme, expect: 200 });
add(['theme', 'config'], 'DELETE', '/api/themes/wp-theme', 'active theme', { setup: async (p) => { await theme(p); await config(p, { activeTheme: 'wp-theme' }); }, expect: 400 });
add(['theme'], 'DELETE', '/api/themes/vs-code-dark', 'preset', { expect: 403 });
add(['theme'], 'DELETE', '/api/themes/wp-missing', 'missing', { expect: 404 });

export default cases;
