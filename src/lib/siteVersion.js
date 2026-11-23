/**
 * Public path for a site page. The proxy (src/proxy.js) serves the /v2 tree at
 * the clean URLs, so public paths never carry a /v2 prefix.
 *
 *   v2PublicPath(config, '/projects') → '/projects'
 *   v2PublicPath(config, '')          → '/'
 *
 * `config` is unused; kept so existing callers need no change.
 */
export function v2PublicPath(_config, path = '') {
    return path || '/';
}
