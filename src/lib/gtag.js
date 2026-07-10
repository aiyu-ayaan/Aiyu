/**
 * Google Analytics (gtag.js) client helpers.
 *
 * Calls push into `window.dataLayer` directly, so they are safe to invoke
 * before the GA library has loaded (gtag.js replays the queue on load).
 * All helpers no-op on the server. This is independent of the self-hosted
 * first-party analytics in `@/lib/analytics` / `@/lib/track`.
 */

function isBrowser() {
    return typeof window !== 'undefined';
}

/** Queue a raw gtag command (preserves the `arguments` object gtag.js expects). */
export function gtag() {
    if (!isBrowser()) return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(arguments);
}

/**
 * Report a page view for the given URL (path + query). Used on every
 * client-side route change; `send_page_view` is disabled in the base
 * config so views are never double counted.
 */
export function pageview(url) {
    if (!isBrowser()) return;
    gtag('event', 'page_view', {
        page_path: url,
        page_location: window.location.origin + url,
        page_title: document.title,
    });
}

/** Report a custom GA event, e.g. `event('outbound_click', { link_url })`. */
export function event(name, params = {}) {
    gtag('event', name, params);
}
