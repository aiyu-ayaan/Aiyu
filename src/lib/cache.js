/**
 * Two-level cache for database queries.
 *
 * L1: in-memory cache (fastest, process-local)
 * L2: Redis cache (shared across Node.js processes/containers)
 */

import { getRedisClient, isRedisEnabled } from '@/lib/redis';

const REDIS_KEY_REGISTRY = 'db:cache:keys';
const DEFAULT_REDIS_TTL_SECONDS = Number.parseInt(process.env.REDIS_DEFAULT_TTL_SECONDS || '60', 10);
const SAFE_DEFAULT_REDIS_TTL_SECONDS = Number.isFinite(DEFAULT_REDIS_TTL_SECONDS) && DEFAULT_REDIS_TTL_SECONDS > 0
    ? DEFAULT_REDIS_TTL_SECONDS
    : 60;

class MemoryCache {
    constructor() {
        this.cache = new Map();
        this.pending = new Map();
        this.defaultTTL = SAFE_DEFAULT_REDIS_TTL_SECONDS * 1000;
    }

    setMemoryValue(key, value, ttl = this.defaultTTL) {
        this.cache.set(key, {
            value,
            expiry: Date.now() + ttl,
        });
    }

    /**
     * Get a cached value from memory (L1).
     * @param {string} key
     * @returns {any|null}
     */
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) return null;

        if (Date.now() > entry.expiry) {
            this.cache.delete(key);
            return null;
        }

        return entry.value;
    }

    /**
     * Set value in memory and Redis.
     * @param {string} key
     * @param {any} value
     * @param {number} [ttl]
     */
    set(key, value, ttl = this.defaultTTL) {
        this.setMemoryValue(key, value, ttl);

        const redis = getRedisClient();
        if (redis) {
            void this.setRedisValue(key, value, ttl);
        }
    }

    /**
     * Invalidate one cache key.
     * @param {string} key
     */
    invalidate(key) {
        this.cache.delete(key);
        this.pending.delete(key);

        const redis = getRedisClient();
        if (redis) {
            void this.invalidateRedisKey(key);
        }
    }

    /**
     * Invalidate all keys that begin with a prefix.
     * @param {string} prefix
     */
    invalidatePrefix(prefix) {
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                this.cache.delete(key);
            }
        }

        for (const key of this.pending.keys()) {
            if (key.startsWith(prefix)) {
                this.pending.delete(key);
            }
        }

        const redis = getRedisClient();
        if (redis) {
            void this.invalidateRedisPrefix(prefix);
        }
    }

    /**
     * Invalidate all cache data.
     */
    invalidateAll() {
        this.cache.clear();
        this.pending.clear();

        const redis = getRedisClient();
        if (redis) {
            void this.invalidateRedisAll();
        }
    }

    /**
     * Get-or-set helper with request deduplication and Redis fallback.
     * @param {string} key
     * @param {Function} fn
     * @param {number} [ttl]
     * @returns {Promise<any>}
     */
    async getOrSetWithMeta(key, fn, ttl = this.defaultTTL) {
        const memoryValue = this.get(key);
        if (memoryValue !== null) {
            return {
                value: memoryValue,
                meta: {
                    key,
                    source: 'memory',
                    redisEnabled: isRedisEnabled(),
                },
            };
        }

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
                const redisValue = await this.getRedisValue(key);
                if (redisValue !== null) {
                    this.cache.set(key, {
                        value: redisValue,
                        expiry: Date.now() + ttl,
                    });
                    return {
                        value: redisValue,
                        meta: {
                            key,
                            source: 'redis',
                            redisEnabled: true,
                        },
                    };
                }

                const value = await fn();
                this.setMemoryValue(key, value, ttl);
                await this.setRedisValue(key, value, ttl);
                return {
                    value,
                    meta: {
                        key,
                        source: 'miss',
                        redisEnabled: isRedisEnabled(),
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

    async getOrSet(key, fn, ttl = this.defaultTTL) {
        const result = await this.getOrSetWithMeta(key, fn, ttl);
        return result.value;
    }

    async getRedisValue(key) {
        const redis = getRedisClient();
        if (!redis) return null;

        try {
            const cached = await redis.get(key);
            if (!cached) return null;
            return JSON.parse(cached);
        } catch (error) {
            console.warn(`[cache] Redis GET failed for "${key}": ${error?.message || 'Unknown error'}`);
            return null;
        }
    }

    async setRedisValue(key, value, ttl) {
        const redis = getRedisClient();
        if (!redis) return;

        try {
            const ttlSeconds = Math.max(1, Math.ceil(ttl / 1000));
            const payload = JSON.stringify(value);

            await redis
                .multi()
                .set(key, payload, 'EX', ttlSeconds)
                .sadd(REDIS_KEY_REGISTRY, key)
                .exec();
        } catch (error) {
            console.warn(`[cache] Redis SET failed for "${key}": ${error?.message || 'Unknown error'}`);
        }
    }

    async invalidateRedisKey(key) {
        const redis = getRedisClient();
        if (!redis) return;

        try {
            await redis
                .multi()
                .del(key)
                .srem(REDIS_KEY_REGISTRY, key)
                .exec();
        } catch (error) {
            console.warn(`[cache] Redis invalidate failed for "${key}": ${error?.message || 'Unknown error'}`);
        }
    }

    async invalidateRedisPrefix(prefix) {
        const redis = getRedisClient();
        if (!redis) return;

        try {
            const allKeys = await redis.smembers(REDIS_KEY_REGISTRY);
            const keysToDelete = allKeys.filter((key) => key.startsWith(prefix));

            if (keysToDelete.length === 0) {
                return;
            }

            await redis
                .multi()
                .del(...keysToDelete)
                .srem(REDIS_KEY_REGISTRY, ...keysToDelete)
                .exec();
        } catch (error) {
            console.warn(`[cache] Redis prefix invalidation failed for "${prefix}": ${error?.message || 'Unknown error'}`);
        }
    }

    async invalidateRedisAll() {
        const redis = getRedisClient();
        if (!redis) return;

        try {
            const allKeys = await redis.smembers(REDIS_KEY_REGISTRY);
            const pipeline = redis.multi();

            if (allKeys.length > 0) {
                pipeline.del(...allKeys);
            }

            pipeline.del(REDIS_KEY_REGISTRY);
            await pipeline.exec();
        } catch (error) {
            console.warn(`[cache] Redis full invalidation failed: ${error?.message || 'Unknown error'}`);
        }
    }
}

let cacheInstance;

const hasCompatibleCacheInstance =
    global.__memoryCache &&
    typeof global.__memoryCache.getOrSet === 'function' &&
    typeof global.__memoryCache.getOrSetWithMeta === 'function';

if (!hasCompatibleCacheInstance) {
    global.__memoryCache = new MemoryCache();
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
