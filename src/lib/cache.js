/**
 * Cache system with in-memory TTL cache + optional Redis.
 *
 * Goals:
 * - Reduce DB/external API load under traffic (k6)
 * - Deduplicate concurrent misses (pending map)
 * - Support invalidation on admin mutations
 */

import { getRedisClient, isRedisEnabled } from '@/lib/redis';

const DEFAULT_MAX_ENTRIES = Number.parseInt(process.env.APP_CACHE_MAX_ENTRIES || '500', 10);
const CACHE_NAMESPACE = (process.env.APP_CACHE_NAMESPACE || 'aiyu').trim();

function nowMs() {
    return Date.now();
}

function isUsableTtl(ttlMs) {
    return Number.isFinite(ttlMs) && ttlMs > 0;
}

function toRedisKey(key) {
    return `${CACHE_NAMESPACE}:${key}`;
}

function safeJsonParse(value) {
    if (!value) return null;
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
}

class TtlMemoryCache {
    constructor({ maxEntries = DEFAULT_MAX_ENTRIES } = {}) {
        this.maxEntries = Number.isFinite(maxEntries) && maxEntries > 0 ? maxEntries : 500;
        this.store = new Map(); // key -> { value, expiresAt }
        this.pending = new Map(); // key -> Promise<{value, meta}>
    }

    _purgeExpired(key, entry, t = nowMs()) {
        if (!entry) return true;
        if (Number.isFinite(entry.expiresAt) && entry.expiresAt <= t) {
            this.store.delete(key);
            return true;
        }
        return false;
    }

    _touch(key, entry) {
        // LRU-ish: Map keeps insertion order; reinsert on access.
        this.store.delete(key);
        this.store.set(key, entry);
    }

    _evictIfNeeded() {
        while (this.store.size > this.maxEntries) {
            const oldestKey = this.store.keys().next().value;
            if (oldestKey === undefined) return;
            this.store.delete(oldestKey);
        }
    }

    get(key) {
        const entry = this.store.get(key);
        if (!entry) return null;
        if (this._purgeExpired(key, entry)) return null;
        this._touch(key, entry);
        return entry.value;
    }

    set(key, value, ttlMs) {
        const expiresAt = isUsableTtl(ttlMs) ? nowMs() + ttlMs : Infinity;
        const entry = { value, expiresAt };
        this.store.set(key, entry);
        this._touch(key, entry);
        this._evictIfNeeded();
    }

    invalidate(key) {
        this.store.delete(key);
        this.pending.delete(key);
    }

    invalidatePrefix(prefix) {
        for (const key of this.store.keys()) {
            if (key.startsWith(prefix)) {
                this.store.delete(key);
            }
        }
        for (const key of this.pending.keys()) {
            if (key.startsWith(prefix)) {
                this.pending.delete(key);
            }
        }
    }

    invalidateAll() {
        this.store.clear();
        this.pending.clear();
    }

    async _redisGet(key) {
        const client = getRedisClient();
        if (!client) return { hit: false, value: null };

        const raw = await client.get(toRedisKey(key));
        const parsed = safeJsonParse(raw);
        if (!parsed) return { hit: false, value: null };

        if (Number.isFinite(parsed.expiresAt) && parsed.expiresAt <= nowMs()) {
            // Best-effort cleanup
            client.del(toRedisKey(key)).catch(() => {});
            return { hit: false, value: null };
        }
        return { hit: true, value: parsed.value };
    }

    async _redisSet(key, value, ttlMs) {
        const client = getRedisClient();
        if (!client) return;

        const expiresAt = isUsableTtl(ttlMs) ? nowMs() + ttlMs : Infinity;
        const payload = JSON.stringify({ value, expiresAt });
        const redisKey = toRedisKey(key);

        if (isUsableTtl(ttlMs)) {
            // PX expects ms
            await client.set(redisKey, payload, 'PX', Math.max(1, ttlMs));
            return;
        }

        await client.set(redisKey, payload);
    }

    async _redisDel(key) {
        const client = getRedisClient();
        if (!client) return;
        await client.del(toRedisKey(key));
    }

    async _redisDelByPrefix(prefix) {
        const client = getRedisClient();
        if (!client) return;

        // Admin-only usage; best-effort SCAN to avoid blocking Redis.
        const match = toRedisKey(`${prefix}*`);
        let cursor = '0';
        do {
            // COUNT is a hint
            // eslint-disable-next-line no-await-in-loop
            const [nextCursor, keys] = await client.scan(cursor, 'MATCH', match, 'COUNT', 250);
            cursor = nextCursor;
            if (Array.isArray(keys) && keys.length > 0) {
                // eslint-disable-next-line no-await-in-loop
                await client.del(...keys);
            }
        } while (cursor !== '0');
    }

    async getOrSetWithMeta(key, fn, ttlMs) {
        const redisEnabled = isRedisEnabled();

        // 1) Memory hit
        const memoryValue = this.get(key);
        if (memoryValue !== null && memoryValue !== undefined) {
            return {
                value: memoryValue,
                meta: { key, source: 'memory', redisEnabled },
            };
        }

        // 2) Pending request dedupe
        const pending = this.pending.get(key);
        if (pending) {
            const result = await pending;
            return {
                ...result,
                meta: { ...result.meta, source: 'pending' },
            };
        }

        const inflight = (async () => {
            try {
                // 3) Redis hit (if enabled)
                if (redisEnabled) {
                    const redisResult = await this._redisGet(key);
                    if (redisResult.hit) {
                        // Keep a short-lived memory copy for hot keys
                        this.set(key, redisResult.value, Math.min(isUsableTtl(ttlMs) ? ttlMs : 60_000, 60_000));
                        return {
                            value: redisResult.value,
                            meta: { key, source: 'redis', redisEnabled },
                        };
                    }
                }

                // 4) Miss -> compute
                const value = await fn();
                this.set(key, value, ttlMs);
                if (redisEnabled) {
                    await this._redisSet(key, value, ttlMs);
                }
                return {
                    value,
                    meta: { key, source: 'miss', redisEnabled },
                };
            } catch (error) {
                console.error(`[cache] getOrSetWithMeta failed for "${key}"`, error);
                throw error;
            } finally {
                this.pending.delete(key);
            }
        })();

        this.pending.set(key, inflight);
        return inflight;
    }

    async getOrSet(key, fn, ttlMs) {
        const result = await this.getOrSetWithMeta(key, fn, ttlMs);
        return result.value;
    }

    async invalidateAsync(key) {
        this.invalidate(key);
        if (isRedisEnabled()) {
            await this._redisDel(key);
        }
    }

    async invalidatePrefixAsync(prefix) {
        this.invalidatePrefix(prefix);
        if (isRedisEnabled()) {
            await this._redisDelByPrefix(prefix);
        }
    }

    async invalidateAllAsync() {
        this.invalidateAll();
        if (isRedisEnabled()) {
            await this._redisDelByPrefix('');
        }
    }
}

let cacheInstance;

const hasCompatibleCacheInstance =
    global.__memoryCache &&
    typeof global.__memoryCache.getOrSet === 'function' &&
    typeof global.__memoryCache.getOrSetWithMeta === 'function';

if (!hasCompatibleCacheInstance) {
    global.__memoryCache = new TtlMemoryCache();
}
cacheInstance = global.__memoryCache;

export default cacheInstance;

export function createCacheDebugHeaders(meta = {}) {
    return {
        'X-App-Cache': meta?.source || 'none',
        'X-App-Cache-Key': meta?.key || '',
        'X-App-Redis-Enabled': String(Boolean(meta?.redisEnabled)),
    };
}

export const CACHE_KEYS = {
    HOME: 'db:home',
    ABOUT: 'db:about',
    CONFIG: 'db:config',
    HEADER: 'db:header',
    SOCIALS: 'db:socials',
    PROJECTS: 'db:projects',
    DEPLOYMENTS: 'db:deployments',
    BLOGS_PUBLISHED: 'db:blogs:published',
    BLOGS_ALL: 'db:blogs:all',
    BLOGS_RECENT: 'db:blogs:recent',
    THEME: 'db:theme',
    GALLERY: 'db:gallery',
    GITHUB: 'db:github',
};

export const CACHE_TTL = {
    SHORT: 30 * 1000,
    MEDIUM: 60 * 1000,
    LONG: 5 * 60 * 1000,
    VERY_LONG: 15 * 60 * 1000,
};
