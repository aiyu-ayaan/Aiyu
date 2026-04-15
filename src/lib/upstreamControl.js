const DEFAULT_BREAKER_FAILURE_THRESHOLD = Number.parseInt(process.env.UPSTREAM_BREAKER_FAILURE_THRESHOLD || '5', 10);
const DEFAULT_BREAKER_RESET_MS = Number.parseInt(process.env.UPSTREAM_BREAKER_RESET_MS || '30000', 10);

function getBreakerStore() {
    if (!global.__upstreamBreakerStore) {
        global.__upstreamBreakerStore = new Map();
    }

    return global.__upstreamBreakerStore;
}

function getBreakerState(name) {
    const store = getBreakerStore();

    if (!store.has(name)) {
        store.set(name, {
            failureCount: 0,
            openedUntil: 0,
            state: 'closed',
        });
    }

    return store.get(name);
}

function shouldTripBreaker(error) {
    return error?.retryable === true
        || error?.code === 'UPSTREAM_TIMEOUT'
        || error?.status === 429
        || error?.status >= 500;
}

export class CircuitBreakerOpenError extends Error {
    constructor(name, openedUntil) {
        super(`Circuit breaker "${name}" is open`);
        this.name = 'CircuitBreakerOpenError';
        this.code = 'CIRCUIT_BREAKER_OPEN';
        this.retryable = true;
        this.openedUntil = openedUntil;
    }
}

export async function runWithCircuitBreaker(name, operation, options = {}) {
    const {
        failureThreshold = DEFAULT_BREAKER_FAILURE_THRESHOLD,
        resetTimeoutMs = DEFAULT_BREAKER_RESET_MS,
    } = options;

    const breaker = getBreakerState(name);
    const now = Date.now();

    if (breaker.openedUntil > now) {
        breaker.state = 'open';
        throw new CircuitBreakerOpenError(name, breaker.openedUntil);
    }

    breaker.state = breaker.openedUntil > 0 ? 'half-open' : 'closed';

    try {
        const result = await operation();
        breaker.failureCount = 0;
        breaker.openedUntil = 0;
        breaker.state = 'closed';
        return result;
    } catch (error) {
        if (shouldTripBreaker(error)) {
            breaker.failureCount += 1;

            if (breaker.failureCount >= failureThreshold) {
                breaker.openedUntil = now + resetTimeoutMs;
                breaker.state = 'open';
            }
        }

        throw error;
    }
}

export function getCircuitBreakerSnapshot(name) {
    const breaker = getBreakerState(name);
    const now = Date.now();

    return {
        state: breaker.openedUntil > now ? 'open' : breaker.state,
        failureCount: breaker.failureCount,
        retryAt: breaker.openedUntil,
    };
}

export async function fetchWithTimeout(resource, init = {}, timeoutMs = 3000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(resource, {
            ...init,
            signal: controller.signal,
        });
    } catch (error) {
        if (error?.name === 'AbortError') {
            const timeoutError = new Error(`Upstream request timed out after ${timeoutMs}ms`);
            timeoutError.code = 'UPSTREAM_TIMEOUT';
            timeoutError.retryable = true;
            throw timeoutError;
        }

        error.retryable = error.retryable ?? true;
        throw error;
    } finally {
        clearTimeout(timeout);
    }
}
