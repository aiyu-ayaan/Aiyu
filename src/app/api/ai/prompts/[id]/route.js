import { handleWrite } from '../../_shared';
import { updatePrompt, deletePrompt } from '@/lib/aiSections';

// PUT /api/ai/prompts/:id — update a prompt.
export async function PUT(request, { params }) {
    const { id } = await params;
    return handleWrite(request, async (body) => ({ prompt: await updatePrompt(id, body) }));
}

// DELETE /api/ai/prompts/:id — delete a prompt.
export async function DELETE(request, { params }) {
    const { id } = await params;
    return handleWrite(request, async () => deletePrompt(id));
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
