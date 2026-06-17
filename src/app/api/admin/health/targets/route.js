/**
 * Custom uptime targets (extra endpoints monitored besides Deployments).
 *   GET    /api/admin/health/targets        -> list custom targets
 *   POST   /api/admin/health/targets        -> create { label, url }
 *   DELETE /api/admin/health/targets?id=...  -> remove one
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { toClientList } from '@/lib/serialize';

export async function GET() {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const rows = await prisma.uptimeTarget.findMany({ orderBy: { createdAt: 'desc' } });
        return NextResponse.json({ success: true, targets: toClientList('uptimeTarget', rows) });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const body = await request.json();
        const label = String(body.label || '').trim();
        const url = String(body.url || '').trim();

        if (!url || !/^https?:\/\//i.test(url)) {
            return NextResponse.json(
                { success: false, error: 'A valid http(s) URL is required.' },
                { status: 400 },
            );
        }

        const row = await prisma.uptimeTarget.create({
            data: { label: label || url, url, enabled: true },
        });
        return NextResponse.json({ success: true, target: toClientList('uptimeTarget', [row])[0] });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) {
            return NextResponse.json({ success: false, error: 'Missing target id.' }, { status: 400 });
        }
        await prisma.uptimeTarget.delete({ where: { id } }).catch(() => {});
        return NextResponse.json({ success: true, deleted: id });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
