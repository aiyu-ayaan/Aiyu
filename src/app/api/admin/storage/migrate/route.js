import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import dbConnect from '@/lib/db';
import sharp from 'sharp';
import { readdir, readFile, writeFile, unlink } from 'fs/promises';
import { join } from 'path';

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

/**
 * Recursively walks a plain object/array and replaces occurrences of oldVal with newVal in all string values.
 * Explicitly preserves ObjectIds, Dates, and Buffers without corruption.
 */
function recursiveReplaceUrl(obj, oldVal, newVal) {
    if (typeof obj === 'string') {
        return obj.replaceAll(oldVal, newVal);
    }
    if (Array.isArray(obj)) {
        return obj.map(item => recursiveReplaceUrl(item, oldVal, newVal));
    }
    if (obj !== null && typeof obj === 'object') {
        if (obj.constructor && (obj.constructor.name === 'ObjectId' || obj.constructor.name === 'Date')) {
            return obj;
        }
        if (Buffer.isBuffer(obj)) {
            return obj;
        }
        const newObj = {};
        for (const [key, value] of Object.entries(obj)) {
            newObj[key] = recursiveReplaceUrl(value, oldVal, newVal);
        }
        return newObj;
    }
    return obj;
}

async function handleMigration(request) {
    await dbConnect();

    try {
        // Read directory contents
        let filenames = [];
        try {
            filenames = await readdir(UPLOADS_DIRECTORY);
        } catch (err) {
            if (err.code === 'ENOENT') {
                return NextResponse.json({
                    success: true,
                    migratedCount: 0,
                    reclaimedBytes: 0,
                    details: []
                });
            }
            throw err;
        }

        // Identify non-webp image candidates
        const migrateCandidates = filenames.filter(name => {
            const ext = name.split('.').pop()?.toLowerCase();
            const isImage = ['jpg', 'jpeg', 'png', 'heic', 'heif', 'gif'].includes(ext);
            const isWebp = ext === 'webp';
            return isImage && !isWebp && name !== '.gitkeep';
        });

        const details = [];
        let migratedCount = 0;
        let reclaimedBytes = 0;

        for (const oldFilename of migrateCandidates) {
            const oldPath = join(UPLOADS_DIRECTORY, oldFilename);
            const dotIndex = oldFilename.lastIndexOf('.');
            const nameWithoutExt = oldFilename.slice(0, dotIndex);
            const newFilename = `${nameWithoutExt}.webp`;
            const newPath = join(UPLOADS_DIRECTORY, newFilename);

            try {
                // Read legacy file buffer
                const buffer = await readFile(oldPath);
                const originalSize = buffer.length;

                // Configure Sharp conversion
                let pipeline = sharp(buffer);
                const metadata = await pipeline.metadata();
                const isThumbnail = oldFilename.includes('-thumb.');
                const quality = isThumbnail ? 80 : 85;

                // Resize original if huge (> 2500px)
                if (!isThumbnail && (metadata.width > 2500 || metadata.height > 2500)) {
                    pipeline = pipeline.resize(2500, 2500, {
                        fit: 'inside',
                        withoutEnlargement: true
                    });
                }

                const outputBuffer = await pipeline
                    .webp({ quality, effort: 4 })
                    .toBuffer();

                const newSize = outputBuffer.length;

                // Write optimized WebP file
                await writeFile(newPath, outputBuffer);

                // Update database references
                let referencesUpdated = 0;
                for (const Model of MODELS) {
                    const docs = await Model.find({});
                    for (const doc of docs) {
                        const plainDoc = doc.toObject();
                        const jsonStr = JSON.stringify(plainDoc);

                        if (jsonStr.includes(oldFilename)) {
                            const updatedPlain = recursiveReplaceUrl(plainDoc, oldFilename, newFilename);
                            // Avoid modifying _id on update payload
                            delete updatedPlain._id;
                            await Model.updateOne({ _id: doc._id }, { $set: updatedPlain });
                            referencesUpdated++;
                        }
                    }
                }

                // Safely delete original legacy file
                await unlink(oldPath);

                migratedCount++;
                const reclaimed = originalSize - newSize;
                reclaimedBytes += reclaimed > 0 ? reclaimed : 0;

                details.push({
                    original: oldFilename,
                    webp: newFilename,
                    originalSize,
                    newSize,
                    referencesUpdated,
                    success: true
                });

            } catch (err) {
                console.error(`[MIGRATION ERROR] Failed to migrate ${oldFilename}:`, err);
                details.push({
                    original: oldFilename,
                    success: false,
                    error: err.message
                });
            }
        }

        return NextResponse.json({
            success: true,
            migratedCount,
            reclaimedBytes,
            details
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
