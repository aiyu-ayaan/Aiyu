import { NextResponse } from 'next/server';
import { getOAuthIssuerMetadata } from '@/lib/agentDiscovery';

export async function GET() {
    return NextResponse.json(getOAuthIssuerMetadata(), {
        headers: {
            'Cache-Control': 'public, max-age=300, s-maxage=300',
        },
    });
}

export const dynamic = 'force-dynamic';
