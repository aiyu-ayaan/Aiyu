import { AGENT_SKILL_ARTIFACTS } from '@/lib/agentDiscovery';

export async function GET(_request, { params }) {
    const { skill } = await params;
    const content = AGENT_SKILL_ARTIFACTS[skill];

    if (!content) {
        return new Response('Not found', {
            status: 404,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
            },
        });
    }

    return new Response(content, {
        headers: {
            'Content-Type': 'text/markdown; charset=utf-8',
            'Cache-Control': 'public, max-age=300, s-maxage=300',
        },
    });
}

export const dynamic = 'force-dynamic';
