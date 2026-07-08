import { handleRead, handleWrite } from '../_shared';
import { recommendationsData, createRecommendation } from '@/lib/aiSections';

// GET /api/ai/recommendations — public. { cards: [{ id, name, url, rating, accent, blurb, tags }] }
export async function GET() {
    return handleRead(() => recommendationsData());
}

// POST /api/ai/recommendations — write. Create a card.
export async function POST(request) {
    return handleWrite(request, async (body) => ({ recommendation: await createRecommendation(body) }));
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
