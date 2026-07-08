import { handleRead, handleWrite } from '../_shared';
import { creditsData, createCredit } from '@/lib/aiSections';

// GET /api/ai/credits — public. { rows: [{ id, name, offer, url, noCard, freeApi, note }] }
export async function GET() {
    return handleRead(() => creditsData());
}

// POST /api/ai/credits — write. Create a credit row.
export async function POST(request) {
    return handleWrite(request, async (body) => ({ credit: await createCredit(body) }));
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
