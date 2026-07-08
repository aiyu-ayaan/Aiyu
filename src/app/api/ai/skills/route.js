import { handleRead } from '../_shared';
import { skillsData } from '@/lib/aiSections';

// GET /api/ai/skills — public. The full skills section:
// { categories: [{ id, label, accent, items: [{ id, name, description, url? }] }] }
export async function GET() {
    return handleRead(() => skillsData());
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
