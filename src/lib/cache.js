/**
 * Cache system with Redis and caching disabled for admin data.
 * Always fetches fresh data to ensure admin panel data is always current.
 */

class NoCache {
    constructor() {
        this.pending = new Map();
    }

    /**
     * No-op: always returns null to force fresh data fetching
     */
    get(key) {
        return null;
    }

    /**
     * No-op: caching disabled
     */
    set(key, value, ttl) {
        // Caching disabled - Redis removed
    }

    /**
     * No-op: invalidation not needed (no cache)
     */
    invalidate(key) {
        this.pending.delete(key);
    }

    /**
     * No-op: invalidation not needed (no cache)
     */
    invalidatePrefix(prefix) {
        // Clear pending requests only
        for (const key of this.pending.keys()) {
            if (key.startsWith(prefix)) {
                this.pending.delete(key);
            }
        }
    }

    /**
     * No-op: invalidation not needed (no cache)
     */
    invalidateAll() {
        this.pending.clear();
    }

    /**
     * Get-or-set helper with request deduplication only (no caching).
     * Always fetches fresh data on cache miss.
     * @param {string} key
     * @param {Function} fn
     * @param {number} [ttl] - Ignored, only used for API compatibility
     * @returns {Promise<any>}
     */
    async getOrSetWithMeta(key, fn, ttl) {
        // Check pending requests (deduplication only)
        const pending = this.pending.get(key);
        if (pending) {
            const result = await pending;
            return {
                ...result,
                meta: {
                    ...result.meta,
                    source: 'pending',
                },
            };
        }

        const inflight = (async () => {
            try {
                // Always fetch fresh data (no cache)
                const value = await fn();
                return {
                    value,
                    meta: {
                        key,
                        source: 'fresh',
                        redisEnabled: false,
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

    async getOrSet(key, fn, ttl) {
        const result = await this.getOrSetWithMeta(key, fn, ttl);
        return result.value;
    }
}

let cacheInstance;

const hasCompatibleCacheInstance =
    global.__memoryCache &&
    typeof global.__memoryCache.getOrSet === 'function' &&
    typeof global.__memoryCache.getOrSetWithMeta === 'function';

if (!hasCompatibleCacheInstance) {
    global.__memoryCache = new NoCache();
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
