import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import cache from '@/lib/cache';
import { getRedisClient } from '@/lib/redis';

export async function POST(request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Clear in-memory cache
        cache.invalidateAll();

        // Clear Redis cache if available
        const redis = getRedisClient();
        if (redis) {
            try {
                await redis.flushdb();
            } catch (error) {
                console.warn('[Cache Purge] Redis flush failed:', error.message);
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Cache purged successfully',
            redisAvailable: !!redis,
        });
    } catch (error) {
        console.error('[Cache Purge] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to purge cache' },
            { status: 500 }
        );
    }
}
