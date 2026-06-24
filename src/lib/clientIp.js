/**
 * Resolve the originating client IP for rate-limiting and audit purposes.
 *
 * SECURITY: never trust the *first* `X-Forwarded-For` entry. It is fully
 * client-controlled, so using it as a rate-limit key (as this code previously
 * did via `split(',')[0]`) let an attacker mint unlimited buckets — and thereby
 * bypass login throttling — simply by rotating the header on each request.
 *
 * We only trust values injected by our own edge, in order of specificity:
 *   1. `cf-connecting-ip` — set by Cloudflare to the real client behind the tunnel
 *   2. `x-real-ip`        — set by our nginx to the connecting peer ($remote_addr)
 *   3. the LAST `x-forwarded-for` hop — the entry appended by the nearest proxy
 * falling back to `x-client-ip` and finally `'unknown'`.
 *
 * The origin (nginx) is only reachable through the Cloudflare tunnel, so these
 * proxy-injected headers cannot be forged by an external client. This module is
 * intentionally dependency-free so it is safe to import from the edge proxy.
 *
 * @param {Request} request
 * @returns {string}
 */
export function getClientIP(request) {
    const cfConnectingIp = request.headers.get('cf-connecting-ip');
    if (cfConnectingIp) return cfConnectingIp.trim();

    const realIp = request.headers.get('x-real-ip');
    if (realIp) return realIp.trim();

    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        const hops = forwarded.split(',').map((part) => part.trim()).filter(Boolean);
        if (hops.length > 0) {
            // Last hop is the one our trusted proxy appended; the leading entries
            // are whatever the client (or intermediate proxies) chose to send.
            return hops[hops.length - 1];
        }
    }

    const clientIp = request.headers.get('x-client-ip');
    return clientIp ? clientIp.trim() : 'unknown';
}
