const DEFAULT_WINDOW_MS = Number.parseInt(process.env.PUBLIC_ROUTE_WINDOW_MS || '60000', 10);

function getGlobalTrafficState() {
    if (!global.__trafficControlState) {
        global.__trafficControlState = new Map();
    }

    return global.__trafficControlState;
}

function getStateBucket(name) {
    const state = getGlobalTrafficState();

    if (!state.has(name)) {
        state.set(name, {
            requests: new Map(),
            activeRequests: 0,
        });
    }

    return state.get(name);
}

function pruneExpiredRequests(requests, now, windowMs) {
    for (const [key, timestamps] of requests.entries()) {
        const freshTimestamps = timestamps.filter((timestamp) => now - timestamp < windowMs);

        if (freshTimestamps.length === 0) {
            requests.delete(key);
            continue;
        }

        requests.set(key, freshTimestamps);
    }
}

export function getClientIdentifier(request) {
    const forwardedFor = request?.headers?.get?.('x-forwarded-for');
    if (forwardedFor) {
        const [firstIp] = forwardedFor.split(',');
        if (firstIp?.trim()) {
            return firstIp.trim();
        }
    }

    const realIp = request?.headers?.get?.('x-real-ip');
    if (realIp?.trim()) {
        return realIp.trim();
    }

    return 'global';
}

export function reserveRequestSlot(name, clientId, options = {}) {
    const {
        maxRequests = Number.parseInt(process.env.PUBLIC_ROUTE_RATE_LIMIT || '180', 10),
        windowMs = DEFAULT_WINDOW_MS,
        maxConcurrent = Number.parseInt(process.env.PUBLIC_ROUTE_MAX_CONCURRENT || '80', 10),
    } = options;

    const bucket = getStateBucket(name);
    const now = Date.now();
    pruneExpiredRequests(bucket.requests, now, windowMs);

    const requestTimestamps = bucket.requests.get(clientId) || [];
    const retryAfterMs = requestTimestamps.length > 0
        ? Math.max(0, windowMs - (now - requestTimestamps[0]))
        : windowMs;

    if (bucket.activeRequests >= maxConcurrent) {
        return {
            ok: false,
            status: 503,
            retryAfterMs: 1000,
            remaining: Math.max(0, maxRequests - requestTimestamps.length),
            activeRequests: bucket.activeRequests,
        };
    }

    if (requestTimestamps.length >= maxRequests) {
        return {
            ok: false,
            status: 429,
            retryAfterMs,
            remaining: 0,
            activeRequests: bucket.activeRequests,
        };
    }

    requestTimestamps.push(now);
    bucket.requests.set(clientId, requestTimestamps);
    bucket.activeRequests += 1;

    let released = false;

    return {
        ok: true,
        remaining: Math.max(0, maxRequests - requestTimestamps.length),
        activeRequests: bucket.activeRequests,
        release() {
            if (released) {
                return;
            }

            released = true;
            bucket.activeRequests = Math.max(0, bucket.activeRequests - 1);
        },
    };
}

export function createTrafficHeaders(result, options = {}) {
    const windowMs = options.windowMs || DEFAULT_WINDOW_MS;
    const retryAfterMs = result?.retryAfterMs || 0;

    return {
        'Retry-After': retryAfterMs > 0 ? String(Math.max(1, Math.ceil(retryAfterMs / 1000))) : String(Math.ceil(windowMs / 1000)),
        'X-RateLimit-Remaining': String(result?.remaining ?? 0),
        'X-Route-Active-Requests': String(result?.activeRequests ?? 0),
    };
}
