/**
 * Client-side analytics helpers. Sends small beacons to /api/analytics/track
 * using `navigator.sendBeacon` (survives page unload) with a `fetch keepalive`
 * fallback. Safe to import in client components; all calls no-op on the server.
 */

const ENDPOINT = '/api/analytics/track';
const SESSION_KEY = 'aiyu_sid';

function isBrowser() {
    return typeof window !== 'undefined';
}

/** Stable per-tab session id (sessionStorage). */
export function getSessionId() {
    if (!isBrowser()) return '';
    try {
        let sid = window.sessionStorage.getItem(SESSION_KEY);
        if (!sid) {
            sid = (window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
            window.sessionStorage.setItem(SESSION_KEY, sid);
        }
        return sid;
    } catch {
        return '';
    }
}

function send(payload) {
    if (!isBrowser()) return;
    const body = JSON.stringify({
        sessionId: getSessionId(),
        referrer: document.referrer || '',
        ...payload,
    });

    try {
        if (navigator.sendBeacon) {
            const blob = new Blob([body], { type: 'application/json' });
            if (navigator.sendBeacon(ENDPOINT, blob)) return;
        }
    } catch {
        /* fall through to fetch */
    }

    try {
        fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
            keepalive: true,
        }).catch(() => { });
    } catch {
        /* swallow — tracking must never throw */
    }
}

/** Record a page view for the given path (defaults to current location). */
export function trackPageview(path) {
    send({
        type: 'pageview',
        path: path || (isBrowser() ? window.location.pathname : '/'),
    });
}

/** Record a view of a specific entity (blog/project/app/gallery). */
export function trackEntityView({ entityType, entityId, entitySlug, path } = {}) {
    send({
        type: 'entity_view',
        entityType,
        entityId,
        entitySlug,
        path: path || (isBrowser() ? window.location.pathname : ''),
    });
}

/** Record a generic event (contact_submit, outbound_click, ...). */
export function trackEvent(payload = {}) {
    send(payload);
}
