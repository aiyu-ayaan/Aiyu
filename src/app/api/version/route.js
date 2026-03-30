import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
    try {
        const packageJsonPath = path.join(process.cwd(), 'package.json');
        const packageJsonRaw = await fs.readFile(packageJsonPath, 'utf8');
        const packageJson = JSON.parse(packageJsonRaw);

        if (!packageJson?.version) {
            return NextResponse.json({ error: 'PACKAGE_VERSION_NOT_FOUND' }, { status: 404 });
        }

        const version = String(packageJson.version);
        const displayVersion = version.startsWith('v') ? version : `v${version}`;

        return NextResponse.json({
            version,
            displayVersion,
        }, {
            headers: {
                'Cache-Control': 'no-store, max-age=0',
            },
        });
    } catch {
        return NextResponse.json({ error: 'FAILED_TO_READ_PACKAGE_VERSION' }, { status: 500 });
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
