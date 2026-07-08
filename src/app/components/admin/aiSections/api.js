"use client";

/**
 * Thin fetch helpers for the AI-section admin managers. Same-origin, so the
 * admin session cookie authorizes writes (requireAiWrite passes on session).
 * Each helper throws on non-2xx with the server's error message.
 */

async function parse(res) {
    let body = null;
    try {
        body = await res.json();
    } catch {
        /* no body */
    }
    if (!res.ok || (body && body.ok === false)) {
        throw new Error(body?.error || `Request failed (${res.status})`);
    }
    return body;
}

export function getJson(url) {
    return fetch(url, { headers: { Accept: 'application/json' } }).then(parse);
}

export function postJson(url, data) {
    return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data || {}),
    }).then(parse);
}

export function putJson(url, data) {
    return fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data || {}),
    }).then(parse);
}

export function del(url) {
    return fetch(url, { method: 'DELETE' }).then(parse);
}
