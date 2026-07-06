import { getMcpDocsMarkdown } from '@/lib/agentDiscovery';

export async function GET() {
    return new Response(getMcpDocsMarkdown(), {
        headers: {
            'Content-Type': 'text/markdown; charset=utf-8',
            'Cache-Control': 'public, max-age=300, s-maxage=300',
        },
    });
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
