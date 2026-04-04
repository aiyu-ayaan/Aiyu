import Redis from 'ioredis';

function createRedisClient(redisUrl) {
    const client = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        enableReadyCheck: true,
        connectTimeout: 5000,
        retryStrategy: (attempt) => Math.min(attempt * 200, 2000),
    });

    client.on('error', (error) => {
        const message = error?.message || 'Unknown Redis error';
        console.warn(`[cache] Redis error: ${message}`);
    });

    return client;
}

if (!global.__redisState) {
    global.__redisState = {
        client: null,
        url: null,
    };
}

export function getRedisClient() {
    const redisUrl = process.env.REDIS_URL?.trim() || null;

    if (!redisUrl) {
        return null;
    }

    if (global.__redisState.client && global.__redisState.url === redisUrl) {
        return global.__redisState.client;
    }

    if (global.__redisState.client && global.__redisState.url !== redisUrl) {
        global.__redisState.client.disconnect();
        global.__redisState.client = null;
    }

    try {
        global.__redisState.client = createRedisClient(redisUrl);
        global.__redisState.url = redisUrl;
    } catch (error) {
        console.warn(`[cache] Failed to initialize Redis client: ${error?.message || 'Unknown error'}`);
        global.__redisState.client = null;
        global.__redisState.url = null;
    }

    return global.__redisState.client;
}

export function isRedisEnabled() {
    return Boolean(process.env.REDIS_URL?.trim());
}
