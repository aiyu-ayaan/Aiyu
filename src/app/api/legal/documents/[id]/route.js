import { handleAdmin } from '../../_shared';
import { getLegalDocument, updateLegalDocument, deleteLegalDocument } from '@/lib/legal';

export async function GET(request, { params }) {
    const { id } = await params;
    return handleAdmin(request, () => getLegalDocument(id));
}

export async function PUT(request, { params }) {
    const { id } = await params;
    return handleAdmin(request, (body) => updateLegalDocument(id, body));
}

export async function DELETE(request, { params }) {
    const { id } = await params;
    return handleAdmin(request, () => deleteLegalDocument(id));
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
