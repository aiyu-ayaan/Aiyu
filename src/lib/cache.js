/**
 * Cache system with in-memory TTL cache only.
 *
 * Goals:
 * - Reduce DB/external API load under traffic (k6)
 * - Deduplicate concurrent misses (pending map)
 * - Support invalidation on admin mutations
 */

const DEFAULT_MAX_ENTRIES = Number.parseInt(process.env.APP_CACHE_MAX_ENTRIES || '500', 10);

function nowMs() {
    return Date.now();
}

function isUsableTtl(ttlMs) {
    return Number.isFinite(ttlMs) && ttlMs > 0;
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

    async getOrSetWithMeta(key, fn, ttlMs) {
        // 1) Memory hit
        const memoryValue = this.get(key);
        if (memoryValue !== null && memoryValue !== undefined) {
            return {
                value: memoryValue,
                meta: { key, source: 'memory' },
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
                // Miss -> compute
                const value = await fn();
                this.set(key, value, ttlMs);
                return {
                    value,
                    meta: {
                        key,
                        source: 'miss',
                    },
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
    }

    async invalidatePrefixAsync(prefix) {
        this.invalidatePrefix(prefix);
    }

    async invalidateAllAsync() {
        this.invalidateAll();
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
