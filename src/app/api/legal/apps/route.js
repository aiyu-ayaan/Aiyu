import { handleAdmin } from '../_shared';
import { listLegalApps, createLegalApp } from '@/lib/legal';

// GET /api/legal/apps — every legal app with its documents (drafts included).
export async function GET(request) {
    return handleAdmin(request, () => listLegalApps());
}

// POST /api/legal/apps — { name, slug?, packageName?, description?, contactEmail?, deploymentId? }
export async function POST(request) {
    return handleAdmin(request, (body) => createLegalApp(body));
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
