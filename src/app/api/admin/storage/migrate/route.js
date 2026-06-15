import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';
import { getDelegate, toClientList } from '@/lib/serialize';
import { readdir } from 'fs/promises';
import { join } from 'path';
import { executeWebPMigration } from '@/lib/storageAudit';

const UPLOADS_DIRECTORY = join(process.cwd(), 'public', 'uploads');

// All content models scanned for upload references (key -> display name).
const PREVIEW_MODELS = [
    { key: 'home', name: 'Home' },
    { key: 'about', name: 'About' },
    { key: 'blog', name: 'Blog' },
    { key: 'project', name: 'Project' },
    { key: 'deployment', name: 'Deployment' },
    { key: 'gallery', name: 'Gallery' },
    { key: 'config', name: 'Config' },
    { key: 'header', name: 'Header' },
    { key: 'social', name: 'Social' },
    { key: 'theme', name: 'Theme' },
    { key: 'github', name: 'GitHub' },
    { key: 'contactMessage', name: 'ContactMessage' },
];

async function handleMigration(request) {
    try {
        const result = await executeWebPMigration();
        return NextResponse.json({
            success: true,
            migratedCount: result.migratedCount,
            reclaimedBytes: result.reclaimedBytes,
            details: result.details
        });
    } catch (error) {
        console.error('[ERROR] Storage migration failed:', error);
        return NextResponse.json(
            { success: false, error: 'Migration failed. Please review system logs.' },
            { status: 500 }
        );
    }
}

function getDocLabel(modelName, doc) {
    return doc.title || doc.name || doc.label || doc.platform || doc.username || doc.subject || doc.email || doc._id?.toString() || 'Unnamed Document';
}

async function handlePreview(request) {
    try {
        let filenames = [];
        try {
            filenames = await readdir(UPLOADS_DIRECTORY);
        } catch (err) {
            if (err.code === 'ENOENT') {
                return NextResponse.json({
                    success: true,
                    candidates: [],
                    totalCandidates: 0,
                    totalReferences: 0
                });
            }
            throw err;
        }

        const migrateCandidates = filenames.filter(name => {
            const ext = name.split('.').pop()?.toLowerCase();
            const isImage = ['jpg', 'jpeg', 'png', 'heic', 'heif', 'gif'].includes(ext);
            const isWebp = ext === 'webp';
            return isImage && !isWebp && name !== '.gitkeep';
        });

        const candidates = [];
        let totalReferences = 0;

        for (const filename of migrateCandidates) {
            const filePath = join(UPLOADS_DIRECTORY, filename);
            let sizeBytes = 0;
            try {
                const { stat } = await import('fs/promises');
                const fileStats = await stat(filePath);
                sizeBytes = fileStats.size;
            } catch (e) {
                // Ignore
            }

            const references = [];
            for (const { key, name } of PREVIEW_MODELS) {
                const docs = toClientList(key, await getDelegate(prisma, key).findMany());
                for (const doc of docs) {
                    const jsonStr = JSON.stringify(doc);

                    if (jsonStr.includes(filename)) {
                        references.push({
                            model: name,
                            id: String(doc._id),
                            label: getDocLabel(name, doc)
                        });
                        totalReferences++;
                    }
                }
            }

            candidates.push({
                filename,
                sizeBytes,
                references
            });
        }

        return NextResponse.json({
            success: true,
            candidates,
            totalCandidates: candidates.length,
            totalReferences
        });

    } catch (error) {
        console.error('[ERROR] Storage migration preview failed:', error);
        return NextResponse.json(
            { success: false, error: 'Preview failed. Please review system logs.' },
            { status: 500 }
        );
    }
}

export const GET = withAuth(handlePreview);
export const POST = withAuth(handleMigration);
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
