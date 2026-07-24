import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { createPublicCacheHeaders, RESPONSE_CACHE } from '@/lib/httpCache';

// Read-only source browser that powers the VS Code style app on /desktop.
//
// Security: only files on this explicit allowlist are ever readable. There is
// no path traversal surface — a requested `path` must match an allowlist entry
// exactly (byte-for-byte) before we touch the filesystem. Nothing here writes.
//
// The allowlist deliberately points at the desktop feature's own source so the
// editor genuinely shows "the source code of this app".
const ALLOWLIST = [
    'src/app/desktop/page.js',
    'src/app/components/desktop/Desktop.js',
    'src/app/components/desktop/Window.js',
    'src/app/components/desktop/Taskbar.js',
    'src/app/components/desktop/StartMenu.js',
    'src/app/components/desktop/apps/FileExplorer.js',
    'src/app/components/desktop/apps/CodeEditor.js',
    'src/app/components/desktop/apps/Browser.js',
    'src/app/components/desktop/apps/Settings.js',
    'src/app/components/desktop/apps/AboutThisPC.js',
    'src/app/api/desktop/source/route.js',
    'src/app/api/config/route.js',
    'prisma/schema.prisma',
    'package.json',
    'next.config.mjs',
];

const LANG_BY_EXT = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.json': 'json',
    '.prisma': 'prisma',
    '.mjs': 'javascript',
    '.md': 'markdown',
    '.css': 'css',
};

// Build a nested tree { name, path, type, children } for the sidebar.
function buildTree(paths) {
    const root = {};
    for (const rel of paths) {
        const parts = rel.split('/');
        let node = root;
        parts.forEach((part, i) => {
            const isFile = i === parts.length - 1;
            node.children = node.children || {};
            if (!node.children[part]) {
                node.children[part] = isFile
                    ? { name: part, path: rel, type: 'file' }
                    : { name: part, type: 'dir' };
            }
            node = node.children[part];
        });
    }

    const toArray = (node) => {
        if (!node.children) return undefined;
        return Object.values(node.children)
            .map((child) => ({ ...child, children: toArray(child) }))
            .sort((a, b) => {
                if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
                return a.name.localeCompare(b.name);
            });
    };

    return toArray(root) || [];
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const requested = searchParams.get('path');

    // No path → return the file tree only.
    if (!requested) {
        return NextResponse.json(
            { tree: buildTree(ALLOWLIST) },
            { headers: createPublicCacheHeaders(RESPONSE_CACHE.PUBLIC_MEDIUM) }
        );
    }

    // Strict allowlist match — the only accepted input values.
    if (!ALLOWLIST.includes(requested)) {
        return NextResponse.json({ error: 'File not available' }, { status: 404 });
    }

    try {
        const abs = path.join(process.cwd(), requested);
        const content = await fs.readFile(abs, 'utf8');
        const ext = path.extname(requested);
        return NextResponse.json(
            {
                path: requested,
                language: LANG_BY_EXT[ext] || 'text',
                content,
                readOnly: true,
                lines: content.split('\n').length,
            },
            { headers: createPublicCacheHeaders(RESPONSE_CACHE.PUBLIC_MEDIUM) }
        );
    } catch {
        // In a trimmed standalone build the source may not ship; degrade cleanly.
        return NextResponse.json(
            { error: 'Source not available in this build', path: requested, readOnly: true },
            { status: 404 }
        );
    }
}
