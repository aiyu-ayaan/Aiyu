import { handleRead, handleWrite } from '../_shared';
import { promptsData, createPrompt } from '@/lib/aiSections';

// GET /api/ai/prompts — public. { items: [{ id, title, role, prompt }] }
export async function GET() {
    return handleRead(() => promptsData());
}

// POST /api/ai/prompts — write. Create a prompt.
export async function POST(request) {
    return handleWrite(request, async (body) => ({ prompt: await createPrompt(body) }));
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
