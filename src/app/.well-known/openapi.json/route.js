import { NextResponse } from 'next/server';
import { getOpenApiDocument } from '@/lib/agentDiscovery';

export async function GET() {
    return NextResponse.json(getOpenApiDocument(), {
        headers: {
            'Content-Type': 'application/openapi+json; charset=utf-8',
            'Cache-Control': 'public, max-age=300, s-maxage=300',
        },
    });
}

export const dynamic = 'force-dynamic';
