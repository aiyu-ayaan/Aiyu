export const SITE_VERSION_COOKIE = 'site-version';

/**
 * Public path for a v2 page, honoring the admin default (/admin/version).
 *
 * When `defaultSiteVersion` is 'v2' the proxy (src/proxy.js) serves the v2
 * pages AT the classic URLs, so the public path drops the /v2 prefix — no
 * second URL structure ever reaches metadata, canonicals, or the sitemap.
 * When the default is 'classic', the v2 tree lives under /v2 as usual.
 *
 *   v2PublicPath(config, '/projects') → '/projects' or '/v2/projects'
 *   v2PublicPath(config, '')          → '/'         or '/v2'
 */
export function v2PublicPath(config, path = '') {
    const prefix = config?.defaultSiteVersion === 'v2' ? '' : '/v2';
    return `${prefix}${path}` || '/';
}
