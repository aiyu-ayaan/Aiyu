import { handleWrite } from '../../../_shared';
import { updateSkillCategory, deleteSkillCategory } from '@/lib/aiSections';

// PUT /api/ai/skills/categories/:id — update a category { label?, accent?, displayOrder? }.
export async function PUT(request, { params }) {
    const { id } = await params;
    return handleWrite(request, async (body) => ({ category: await updateSkillCategory(id, body) }));
}

// DELETE /api/ai/skills/categories/:id — delete a category (cascades its skills).
export async function DELETE(request, { params }) {
    const { id } = await params;
    return handleWrite(request, async () => deleteSkillCategory(id));
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
