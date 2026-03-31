/**
 * Simple in-memory cache for database queries.
 * Reduces MongoDB load by caching frequently accessed data.
 * 
 * Default TTL: 60 seconds (configurable per key)
 * Cache is automatically invalidated on write operations.
 */

class MemoryCache {
    constructor() {
        this.cache = new Map();
        this.pending = new Map();
        this.defaultTTL = 60 * 1000; // 60 seconds
    }

    /**
     * Get a cached value
     * @param {string} key - Cache key
     * @returns {any|null} - Cached value or null if expired/missing
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
     * Set a cache value
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {number} [ttl] - Time to live in milliseconds
     */
    set(key, value, ttl = this.defaultTTL) {
        this.cache.set(key, {
            value,
            expiry: Date.now() + ttl,
        });
    }

    /**
     * Invalidate a specific cache key
     * @param {string} key - Cache key to invalidate
     */
    invalidate(key) {
        this.cache.delete(key);
        this.pending.delete(key);
    }

    /**
     * Invalidate all keys matching a prefix
     * @param {string} prefix - Prefix to match
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
    }

    /**
     * Invalidate all cached data
     */
    invalidateAll() {
        this.cache.clear();
        this.pending.clear();
    }

    /**
     * Get or set pattern - fetch from cache or execute fn and cache result
     * @param {string} key - Cache key
     * @param {Function} fn - Async function to execute on cache miss
     * @param {number} [ttl] - Time to live in milliseconds
     * @returns {Promise<any>} - Cached or fresh value
     */
    async getOrSet(key, fn, ttl = this.defaultTTL) {
        const cached = this.get(key);
        if (cached !== null) {
            return cached;
        }

        const pending = this.pending.get(key);
        if (pending) {
            return pending;
        }

        const inflight = (async () => {
            try {
                const value = await fn();
                this.set(key, value, ttl);
                return value;
            } finally {
                this.pending.delete(key);
            }
        })();

        this.pending.set(key, inflight);
        return inflight;
    }
}

// Singleton - persists across requests in the same Node.js process
let cacheInstance;

if (!global.__memoryCache) {
    global.__memoryCache = new MemoryCache();
}
cacheInstance = global.__memoryCache;

export default cacheInstance;

// Cache key constants for consistency
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

// TTL constants (in milliseconds)
export const CACHE_TTL = {
    SHORT: 30 * 1000,      // 30 seconds - for frequently changing data
    MEDIUM: 60 * 1000,     // 60 seconds - default
    LONG: 5 * 60 * 1000,   // 5 minutes - for rarely changing data
    VERY_LONG: 15 * 60 * 1000, // 15 minutes - for static-like data
};
