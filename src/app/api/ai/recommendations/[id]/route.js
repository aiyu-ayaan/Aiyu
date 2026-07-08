import { handleWrite } from '../../_shared';
import { updateRecommendation, deleteRecommendation } from '@/lib/aiSections';

// PUT /api/ai/recommendations/:id — update a card.
export async function PUT(request, { params }) {
    const { id } = await params;
    return handleWrite(request, async (body) => ({ recommendation: await updateRecommendation(id, body) }));
}

// DELETE /api/ai/recommendations/:id — delete a card.
export async function DELETE(request, { params }) {
    const { id } = await params;
    return handleWrite(request, async () => deleteRecommendation(id));
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
