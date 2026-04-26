import { NextResponse } from 'next/server';
import { getJwks } from '@/lib/agentDiscovery';

export async function GET() {
    return NextResponse.json(getJwks(), {
        headers: {
            'Cache-Control': 'public, max-age=300, s-maxage=300',
        },
    });
}

export const dynamic = 'force-dynamic';
