import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Ads from '@/models/Ads';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    try {
        await dbConnect();
        const adsConfig = await Ads.findOne().lean();
        const adsTxt = adsConfig?.adsTxt || '';
        
        return new Response(adsTxt, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'public, max-age=3600, stale-while-revalidate=1800',
            },
        });
    } catch (error) {
        console.error('Failed to generate ads.txt:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}
