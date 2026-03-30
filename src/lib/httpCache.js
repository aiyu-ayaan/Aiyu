export const RESPONSE_CACHE = {
    PUBLIC_SHORT: 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
    PUBLIC_MEDIUM: 'public, max-age=0, s-maxage=300, stale-while-revalidate=900',
    PUBLIC_LONG: 'public, max-age=0, s-maxage=900, stale-while-revalidate=3600',
    NO_STORE: 'no-store, max-age=0',
};

export function createPublicCacheHeaders(cacheControl = RESPONSE_CACHE.PUBLIC_SHORT) {
    return {
        'Cache-Control': cacheControl,
        'CDN-Cache-Control': cacheControl,
        'Vercel-CDN-Cache-Control': cacheControl,
    };
}
