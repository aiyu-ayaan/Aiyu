import { handleWrite } from '../../../_shared';
import { updateSkill, deleteSkill } from '@/lib/aiSections';

// PUT /api/ai/skills/items/:id — update a skill { categoryId?, name?, description?, url?, displayOrder? }.
export async function PUT(request, { params }) {
    const { id } = await params;
    return handleWrite(request, async (body) => ({ skill: await updateSkill(id, body) }));
}

// DELETE /api/ai/skills/items/:id — delete a skill.
export async function DELETE(request, { params }) {
    const { id } = await params;
    return handleWrite(request, async () => deleteSkill(id));
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
