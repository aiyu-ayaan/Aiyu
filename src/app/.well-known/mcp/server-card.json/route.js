import { NextResponse } from 'next/server';
import { getMcpServerCard } from '@/lib/mcpConfig';

export async function GET() {
    const card = await getMcpServerCard();
    return NextResponse.json(card, {
        headers: {
            'Cache-Control': 'public, max-age=300, s-maxage=300',
        },
    });
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
