import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import dbConnect from '@/lib/db';
import sharp from 'sharp';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { executeWebPMigration } from '@/lib/storageAudit';

// Import all 12 models for comprehensive search-and-replace
import Home from '@/models/Home';
import About from '@/models/About';
import Blog from '@/models/Blog';
import Project from '@/models/Project';
import Deployment from '@/models/Deployment';
import Gallery from '@/models/Gallery';
import Config from '@/models/Config';
import Header from '@/models/Header';
import Social from '@/models/Social';
import Theme from '@/models/Theme';
import GitHub from '@/models/GitHub';
import ContactMessage from '@/models/ContactMessage';

const UPLOADS_DIRECTORY = join(process.cwd(), 'public', 'uploads');
const MODELS = [Home, About, Blog, Project, Deployment, Gallery, Config, Header, Social, Theme, GitHub, ContactMessage];

async function handleMigration(request) {
    await dbConnect();

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
    await dbConnect();

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
            for (const Model of MODELS) {
                const docs = await Model.find({});
                for (const doc of docs) {
                    const plainDoc = doc.toObject();
                    const jsonStr = JSON.stringify(plainDoc);

                    if (jsonStr.includes(filename)) {
                        references.push({
                            model: Model.modelName || 'Unknown',
                            id: doc._id.toString(),
                            label: getDocLabel(Model.modelName, plainDoc)
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
