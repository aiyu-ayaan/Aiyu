import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import cache from '@/lib/cache';

export async function POST(_request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Clear in-memory cache
        cache.invalidateAll();

        return NextResponse.json({
            success: true,
            message: 'Cache purged successfully',
        });
    } catch (error) {
        console.error('[Cache Purge] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to purge cache' },
            { status: 500 }
        );
    }
}
