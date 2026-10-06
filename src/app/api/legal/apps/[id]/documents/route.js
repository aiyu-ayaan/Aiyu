import { handleAdmin } from '../../../_shared';
import { createLegalDocument } from '@/lib/legal';

// POST /api/legal/apps/:id/documents — { kind, title?, slug?, format, content, … }
export async function POST(request, { params }) {
    const { id } = await params;
    return handleAdmin(request, (body) => createLegalDocument(id, body));
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
