import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL;

if (!global.__redisClient) {
    global.__redisClient = null;

    if (REDIS_URL) {
        try {
            const client = new Redis(REDIS_URL, {
                maxRetriesPerRequest: 1,
                enableReadyCheck: true,
                connectTimeout: 5000,
                retryStrategy: (attempt) => Math.min(attempt * 200, 2000),
            });

            client.on('error', (error) => {
                const message = error?.message || 'Unknown Redis error';
                console.warn(`[cache] Redis error: ${message}`);
            });

            global.__redisClient = client;
        } catch (error) {
            console.warn(`[cache] Failed to initialize Redis client: ${error?.message || 'Unknown error'}`);
        }
    }
}

export function getRedisClient() {
    return global.__redisClient;
}

