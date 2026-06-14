import { prisma } from '@/lib/prisma';
import { getSingleton } from '@/lib/serialize';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    try {
        const adsConfig = await getSingleton(prisma, 'ads');
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
