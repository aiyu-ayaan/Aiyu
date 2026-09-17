/**
 * Internet Archive "Save Page Now" (SPN2) integration.
 *
 * Flow: archive.org S3 keys from the environment -> POST the target URL to
 * web.archive.org/save with an `Authorization: LOW <access>:<secret>` header
 * -> the Archive queues a capture and returns a job id.
 *
 * The anonymous `GET /save/<url>` form this replaces is no longer a supported
 * entry point: it only works in a browser, where a logged-in archive.org
 * session cookie rides along, and a server-side fetch gets 429/500 instead.
 *
 * `fetch` is injected so payload/credential handling stays unit-testable
 * without touching the network.
 */
import { getSiteUrl } from '@/lib/siteUrl';

const SAVE_URL = 'https://web.archive.org/save';
const STATUS_URL = 'https://web.archive.org/save/status';

/**
 * Read the archive.org S3 keys from the environment.
 * Throws with setup instructions when either half is missing, so the failure
 * lands in the task log instead of a bare 401 from the Archive.
 */
export function getArchiveCredentials(env = process.env) {
    const accessKey = (env.IA_ACCESS_KEY || '').trim();
    const secretKey = (env.IA_SECRET_KEY || '').trim();

    if (!accessKey || !secretKey) {
        const missing = [!accessKey && 'IA_ACCESS_KEY', !secretKey && 'IA_SECRET_KEY']
            .filter(Boolean)
            .join(' and ');
        throw new Error(
            `Internet Archive credentials are not configured (missing ${missing}). ` +
            'Generate S3 keys at https://archive.org/account/s3.php, then add them either in ' +
            'Manage Global Environment Secrets on /admin/config/crons, or to .env / prod.env.'
        );
    }

    return { accessKey, secretKey };
}

/** `Authorization` header value for SPN2. */
export function buildAuthHeader({ accessKey, secretKey }) {
    return `LOW ${accessKey}:${secretKey}`;
}

/**
 * Form-urlencoded SPN2 request body. `capture_all` archives the page even when
 * it responds with an error status, so an outage still produces a snapshot.
 */
export function buildSavePayload(url, { captureAll = true, captureScreenshot = false } = {}) {
    const params = new URLSearchParams({ url });
    if (captureAll) params.set('capture_all', '1');
    if (captureScreenshot) params.set('capture_screenshot', '1');
    return params.toString();
}

/**
 * Queue a Save Page Now capture. Defaults to the site's own base URL, i.e. the
 * same origin `$site` resolves to in webhook templates.
 *
 * Resolves to { url, jobId, status } on success; throws on a non-OK response
 * with the Archive's own message, which distinguishes a bad key (401) from a
 * concurrency/rate limit (429).
 */
export async function saveToWayback(targetUrl = getSiteUrl(), { fetchImpl = fetch, env = process.env, ...options } = {}) {
    const credentials = getArchiveCredentials(env);
    const body = buildSavePayload(targetUrl, options);

    const res = await fetchImpl(SAVE_URL, {
        method: 'POST',
        headers: {
            Authorization: buildAuthHeader(credentials),
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Aiyu-Task-Scheduler'
        },
        body
    });

    const text = await res.text();
    let payload = null;
    try {
        payload = JSON.parse(text);
    } catch {
        // SPN2 serves an HTML error shell for some failures; keep the raw text.
    }

    if (!res.ok) {
        const detail = payload?.message || payload?.error || text.slice(0, 200) || 'no response body';
        throw new Error(`Save Page Now returned HTTP ${res.status}: ${detail}`);
    }

    if (payload?.message && !payload?.job_id) {
        throw new Error(`Save Page Now rejected the request: ${payload.message}`);
    }

    return {
        url: payload?.url || targetUrl,
        jobId: payload?.job_id || null,
        status: res.status
    };
}

/** Poll a queued capture. Useful for diagnosing a job that never appears. */
export async function getWaybackJobStatus(jobId, { fetchImpl = fetch, env = process.env } = {}) {
    const credentials = getArchiveCredentials(env);
    const res = await fetchImpl(`${STATUS_URL}/${encodeURIComponent(jobId)}`, {
        headers: {
            Authorization: buildAuthHeader(credentials),
            Accept: 'application/json'
        }
    });
    return res.json();
}
