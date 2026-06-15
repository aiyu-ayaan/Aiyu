import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getSession } from '@/lib/auth';

// Serves the simple-icons catalog as a lightweight {title, slug} list so the
// admin icon picker no longer has to pull the full `simple-icons/icons`
// package into the client bundle (a ~5MB chunk). The data file already ships
// an explicit slug for every icon, so no derivation is needed here.
let iconsPromise;

async function loadIcons() {
    if (!iconsPromise) {
        iconsPromise = (async () => {
            const dataPath = path.join(
                process.cwd(),
                'node_modules',
                'simple-icons',
                'data',
                'simple-icons.json'
            );
            const raw = await fs.readFile(dataPath, 'utf8');
            const parsed = JSON.parse(raw);
            const list = Array.isArray(parsed) ? parsed : parsed?.icons;
            return (Array.isArray(list) ? list : [])
                .filter((icon) => icon?.title && icon?.slug)
                .map((icon) => ({ title: icon.title, slug: icon.slug }));
        })().catch((error) => {
            // Reset so a transient failure can be retried on the next request.
            iconsPromise = undefined;
            throw error;
        });
    }
    return iconsPromise;
}

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const icons = await loadIcons();

        return NextResponse.json(
            { success: true, icons },
            {
                headers: {
                    // Catalog only changes when the dependency is upgraded.
                    'Cache-Control': 'private, max-age=86400',
                },
            }
        );
    } catch (error) {
        console.error('[admin/icons] failed to load simple-icons catalog', error);
        return NextResponse.json({ success: false, error: 'FAILED_TO_LOAD_ICONS' }, { status: 500 });
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
