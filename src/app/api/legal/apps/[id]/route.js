import { handleAdmin } from '../../_shared';
import { getLegalApp, updateLegalApp, deleteLegalApp } from '@/lib/legal';

export async function GET(request, { params }) {
    const { id } = await params;
    return handleAdmin(request, () => getLegalApp(id));
}

export async function PUT(request, { params }) {
    const { id } = await params;
    return handleAdmin(request, (body) => updateLegalApp(id, body));
}

// Deleting an app cascades to all of its documents.
export async function DELETE(request, { params }) {
    const { id } = await params;
    return handleAdmin(request, () => deleteLegalApp(id));
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
