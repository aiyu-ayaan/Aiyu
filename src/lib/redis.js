import { existsSync } from 'node:fs';
import Redis from 'ioredis';

const DEFAULT_DOCKER_REDIS_URL = 'redis://redis-primary:6379/0';

function isRunningInDocker() {
    return process.env.DOCKER_ENV === 'true' || existsSync('/.dockerenv');
}

function resolveRedisUrl() {
    const configuredUrl = process.env.REDIS_URL?.trim() || null;
    if (!configuredUrl) {
        return null;
    }

    try {
        const parsedUrl = new URL(configuredUrl);
        const dockerRedisUrl = process.env.DOCKER_REDIS_URL?.trim() || DEFAULT_DOCKER_REDIS_URL;
        const isLocalhostTarget =
            parsedUrl.hostname === 'localhost' ||
            parsedUrl.hostname === '127.0.0.1' ||
            parsedUrl.hostname === '::1';

        if (isRunningInDocker() && isLocalhostTarget) {
            if (!global.__redisState?.didWarnAboutDockerFallback) {
                console.warn(
                    `[cache] REDIS_URL=${configuredUrl} points to localhost inside a container. Using ${dockerRedisUrl} instead.`
                );
                global.__redisState.didWarnAboutDockerFallback = true;
            }
            return dockerRedisUrl;
        }
    } catch (error) {
        console.warn(`[cache] Invalid REDIS_URL "${configuredUrl}": ${error?.message || 'Unknown error'}`);
    }

    return configuredUrl;
}

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
        didWarnAboutDockerFallback: false,
    };
}

export function getRedisClient() {
    const redisUrl = resolveRedisUrl();

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
    return Boolean(resolveRedisUrl());
}
