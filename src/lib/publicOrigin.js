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

export function getPublicOrigin(request) {
    const proto = firstHeaderValue(request, 'x-forwarded-proto') || 'http';
    const host = firstHeaderValue(request, 'x-forwarded-host') || firstHeaderValue(request, 'host');
    if (host) {
        return `${proto}://${host}`;
    }
    return request.nextUrl.origin;
}
