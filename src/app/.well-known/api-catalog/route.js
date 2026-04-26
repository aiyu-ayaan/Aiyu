import { NextResponse } from 'next/server';
import { getApiCatalog } from '@/lib/agentDiscovery';

export async function GET() {
    return NextResponse.json(getApiCatalog(), {
        headers: {
            'Content-Type': 'application/linkset+json; charset=utf-8',
            'Cache-Control': 'public, max-age=300, s-maxage=300',
        },
    });
}

export const dynamic = 'force-dynamic';
