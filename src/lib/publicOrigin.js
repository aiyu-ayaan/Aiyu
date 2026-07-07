import { getSiteUrl } from './siteUrl';

/**
 * The origin the CLIENT used to reach us, for building absolute redirect URLs.
 *
 * In the standalone (Docker) server `request.nextUrl` reflects the server bind
 * address (HOSTNAME=0.0.0.0), NOT the host the client asked for — so any
 * redirect built from `request.nextUrl` sends the browser to 0.0.0.0. The real
 * public host only exists in the forwarded/Host headers set by the reverse
 * proxy. Same root cause as the canonical-host fix in src/proxy.js.
 *
 * Forwarded headers can be comma-separated lists when the request crosses
 * multiple proxies; the first entry is the client-facing one.
 */
function firstHeaderValue(request, name) {
    const raw = request.headers.get(name) || '';
    return raw.split(',')[0].trim();
}

/**
 * Is `hostname` something we can safely hand back to a browser?
 *
 * `localhost`, IPv4/IPv6 literals, and any dotted FQDN (me.aiyu.co.in) are
 * public and fine. A BARE single-label name — `nextjs`, `app`, `web` — is an
 * internal Docker/nginx upstream name, never a real client host. Behind the
 * reverse proxy the Host header can arrive as the upstream block name (e.g.
 * `proxy_pass http://nextjs` without `proxy_set_header Host $host`), and if we
 * echo that into a redirect the browser is bounced to `http://nextjs/…`, which
 * is exactly the production base-path loss reported in issue #243. Reject it so
 * we fall back to the configured public site URL instead.
 */
function isPublicHostname(hostname) {
    if (!hostname) return false;
    const host = hostname.toLowerCase();
    if (host === 'localhost') return true;
    // IPv6 literal (brackets already stripped by the caller)
    if (host.includes(':')) return true;
    // IPv4 literal
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
    // Otherwise a public host is a dotted FQDN; a bare label is internal.
    return host.includes('.');
}

export function getPublicOrigin(request) {
    const proto = firstHeaderValue(request, 'x-forwarded-proto') || 'http';
    const host = firstHeaderValue(request, 'x-forwarded-host') || firstHeaderValue(request, 'host');
    const hostname = host ? host.replace(/^\[/, '').split(']')[0].split(':')[0] : '';

    if (host && isPublicHostname(hostname)) {
        return `${proto}://${host}`;
    }

    // Header host is missing or an internal service name (e.g. "nextjs"): fall
    // back to the configured canonical site URL (SITE_URL / NEXT_PUBLIC_BASE_URL,
    // defaulting to the production origin) so a redirect never leaks the private
    // upstream host to the browser. Only the origin is taken — the caller keeps
    // supplying the path/search.
    try {
        return new URL(getSiteUrl()).origin;
    } catch {
        return request.nextUrl.origin;
    }
}
