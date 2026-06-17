/**
 * Google Indexing API integration.
 *
 * Flow: a Google Cloud service-account JSON key -> sign a short-lived RS256 JWT
 * assertion (jose) -> exchange it at oauth2.googleapis.com for an access token ->
 * POST to indexing.googleapis.com to notify Google a URL was updated/deleted.
 *
 * `fetch` is injected so the parsing/validation helpers stay unit-testable; the
 * network calls are thin and only run server-side with the decrypted key.
 */
import { SignJWT, importPKCS8 } from 'jose';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const PUBLISH_URL = 'https://indexing.googleapis.com/v3/urlNotifications:publish';
const SCOPE = 'https://www.googleapis.com/auth/indexing';

export const INDEXING_TYPES = ['URL_UPDATED', 'URL_DELETED'];

/**
 * Parse + validate a service-account JSON string (or object). Throws a clear
 * error if it isn't a usable key. Returns { client_email, private_key }.
 */
export function parseServiceAccount(input) {
    let sa = input;
    if (typeof input === 'string') {
        try {
            sa = JSON.parse(input);
        } catch {
            throw new Error('Service account is not valid JSON.');
        }
    }
    if (!sa || typeof sa !== 'object') {
        throw new Error('Service account must be a JSON object.');
    }
    if (sa.type && sa.type !== 'service_account') {
        throw new Error(`Expected a service_account key, got "${sa.type}".`);
    }
    if (!sa.client_email || !sa.private_key) {
        throw new Error('Service account is missing client_email or private_key.');
    }
    return { client_email: sa.client_email, private_key: sa.private_key };
}

/** Sign the OAuth2 JWT assertion for the indexing scope. */
export async function signAssertion(sa, { now = Math.floor(Date.now() / 1000) } = {}) {
    const key = await importPKCS8(sa.private_key, 'RS256');
    return new SignJWT({ scope: SCOPE })
        .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
        .setIssuer(sa.client_email)
        .setSubject(sa.client_email)
        .setAudience(TOKEN_URL)
        .setIssuedAt(now)
        .setExpirationTime(now + 3600)
        .sign(key);
}

/** Exchange a signed assertion for an access token. */
export async function getAccessToken(sa, { fetchImpl = fetch } = {}) {
    const assertion = await signAssertion(sa);
    const res = await fetchImpl(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion,
        }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.access_token) {
        throw new Error(data.error_description || data.error || `Token exchange failed (HTTP ${res.status}).`);
    }
    return data.access_token;
}

/** Notify Google about a single URL. Returns the parsed API response. */
export async function publishUrl(accessToken, url, type = 'URL_UPDATED', { fetchImpl = fetch } = {}) {
    const res = await fetchImpl(PUBLISH_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, type }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data.error?.message || `Publish failed (HTTP ${res.status}).`);
    }
    return data;
}

/**
 * High-level: ping a batch of URLs. Gets one access token then publishes each.
 * Returns [{ url, status: 'success'|'error', response }]. Never throws for a
 * single URL failure — partial success is reported per item.
 */
export async function pingUrls(serviceAccount, urls = [], type = 'URL_UPDATED', { fetchImpl = fetch } = {}) {
    const sa = parseServiceAccount(serviceAccount);
    if (!INDEXING_TYPES.includes(type)) {
        throw new Error(`Invalid indexing type "${type}".`);
    }
    const accessToken = await getAccessToken(sa, { fetchImpl });

    const out = [];
    for (const url of urls) {
        try {
            const data = await publishUrl(accessToken, url, type, { fetchImpl });
            const notifyTime = data?.urlNotificationMetadata?.latestUpdate?.notifyTime
                || data?.urlNotificationMetadata?.latestRemove?.notifyTime
                || '';
            out.push({ url, status: 'success', response: notifyTime ? `Notified at ${notifyTime}` : 'Accepted by Google.' });
        } catch (err) {
            out.push({ url, status: 'error', response: err.message });
        }
    }
    return out;
}
