import { handleWrite } from '../../_shared';
import { updateCredit, deleteCredit } from '@/lib/aiSections';

// PUT /api/ai/credits/:id — update a credit row.
export async function PUT(request, { params }) {
    const { id } = await params;
    return handleWrite(request, async (body) => ({ credit: await updateCredit(id, body) }));
}

// DELETE /api/ai/credits/:id — delete a credit row.
export async function DELETE(request, { params }) {
    const { id } = await params;
    return handleWrite(request, async () => deleteCredit(id));
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
