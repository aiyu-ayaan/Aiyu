import { handleWrite } from '../../_shared';
import { createSkill } from '@/lib/aiSections';

// POST /api/ai/skills/items — create a skill { categoryId, name, description?, url?, displayOrder? }.
export async function POST(request) {
    return handleWrite(request, async (body) => ({ skill: await createSkill(body) }));
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
