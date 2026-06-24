/**
 * Best-effort IP geolocation, resolved lazily at view time for the admin
 * Security dashboard. Nothing is persisted beyond the raw IP — the city/country
 * is fetched on demand and held in a short-lived in-memory cache so repeated
 * dashboard loads don't hammer the upstream (free, rate-limited) service.
 */
import { fetchWithTimeout } from '@/lib/upstreamControl';

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h
const cache = new Map(); // ip -> { value, expiresAt }

function isPrivateOrLocal(ip) {
    if (!ip || ip === 'unknown') return true;
    if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('::ffff:127.')) return true;
    if (ip.startsWith('10.') || ip.startsWith('192.168.')) return true;
    // 172.16.0.0 – 172.31.255.255
    const m = ip.match(/^172\.(\d+)\./);
    if (m) {
        const second = Number(m[1]);
        if (second >= 16 && second <= 31) return true;
    }
    return false;
}

/**
 * @param {string} ip
 * @returns {Promise<{ ip: string, city: string, country: string, countryCode: string, label: string, local: boolean }>}
 */
export async function lookupGeo(ip) {
    const clean = String(ip || '').trim();

    if (isPrivateOrLocal(clean)) {
        return { ip: clean, city: '', country: '', countryCode: '', label: 'Local / private', local: true };
    }

    const cached = cache.get(clean);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.value;
    }

    let value = { ip: clean, city: '', country: '', countryCode: '', label: 'Unknown', local: false };
    try {
        const res = await fetchWithTimeout(
            `https://ipapi.co/${encodeURIComponent(clean)}/json/`,
            { headers: { 'User-Agent': 'Aiyu-Admin-GeoIP' } },
            3000,
        );
        if (res.ok) {
            const data = await res.json();
            if (!data.error) {
                const city = data.city || '';
                const country = data.country_name || data.country || '';
                const countryCode = String(data.country_code || data.country || '').trim().toUpperCase();
                const label = [city, country].filter(Boolean).join(', ') || 'Unknown';
                value = { ip: clean, city, country, countryCode, label, local: false };
            }
        }
    } catch {
        // Network/timeout — fall through to the Unknown placeholder.
    }

    cache.set(clean, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    return value;
}

/**
 * Resolve just the ISO-3166-1 alpha-2 country code for an IP (e.g. "US"),
 * reusing lookupGeo's cache. Returns '' for private/local/unknown IPs. Used by
 * the analytics ingest path as a fallback when no edge country header is set —
 * only the 2-letter code is ever persisted, never the IP.
 */
export async function lookupCountryCode(ip) {
    try {
        const geo = await lookupGeo(ip);
        const cc = String(geo.countryCode || '').trim().toUpperCase();
        return /^[A-Z]{2}$/.test(cc) ? cc : '';
    } catch {
        return '';
    }
}

/**
 * Resolve geo for a list of unique IPs, returning a map ip -> geo. Runs lookups
 * concurrently (cache + timeout keep this cheap).
 */
export async function lookupGeoMany(ips) {
    const unique = [...new Set(ips.filter(Boolean))];
    const results = await Promise.all(unique.map((ip) => lookupGeo(ip)));
    const map = {};
    for (const geo of results) {
        map[geo.ip] = geo;
    }
    return map;
}
