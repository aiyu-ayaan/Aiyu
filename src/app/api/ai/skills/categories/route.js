import { handleRead, handleWrite } from '../../_shared';
import { listSkillCategories, createSkillCategory } from '@/lib/aiSections';

// GET /api/ai/skills/categories — public. Categories with their nested skills.
export async function GET() {
    return handleRead(async () => ({ categories: await listSkillCategories() }));
}

// POST /api/ai/skills/categories — write. Create a category { label, accent?, displayOrder? }.
export async function POST(request) {
    return handleWrite(request, async (body) => ({ category: await createSkillCategory(body) }));
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
