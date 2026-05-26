import { readdir, stat, unlink, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import dbConnect from '@/lib/db';
import sharp from 'sharp';
import About from '@/models/About';
import Blog from '@/models/Blog';
import Config from '@/models/Config';
import ContactMessage from '@/models/ContactMessage';
import Deployment from '@/models/Deployment';
import Gallery from '@/models/Gallery';
import GitHub from '@/models/GitHub';
import Header from '@/models/Header';
import Home from '@/models/Home';
import Project from '@/models/Project';
import Social from '@/models/Social';
import Theme from '@/models/Theme';

const UPLOADS_DIRECTORY = join(process.cwd(), 'public', 'uploads');
const UPLOAD_PATH_PATTERNS = [
    /\/api\/uploads\/([^/?#]+)/g,
    /\/uploads\/([^/?#]+)/g,
];

const STORAGE_SECTIONS = [
    { key: 'home', label: 'Home', Model: Home, mode: 'one' },
    { key: 'about', label: 'About', Model: About, mode: 'one' },
    { key: 'blogs', label: 'Blogs', Model: Blog, mode: 'many' },
    { key: 'projects', label: 'Projects', Model: Project, mode: 'many' },
    { key: 'apps', label: 'Apps', Model: Deployment, mode: 'many' },
    { key: 'gallery', label: 'Gallery', Model: Gallery, mode: 'many' },
    { key: 'config', label: 'Config', Model: Config, mode: 'one' },
    { key: 'header', label: 'Header', Model: Header, mode: 'one' },
    { key: 'socials', label: 'Socials', Model: Social, mode: 'many' },
    { key: 'themes', label: 'Themes', Model: Theme, mode: 'many' },
    { key: 'github', label: 'GitHub', Model: GitHub, mode: 'one' },
    { key: 'contactMessages', label: 'Contact Messages', Model: ContactMessage, mode: 'many' },
];

function normalizeFilename(filename) {
    const normalized = String(filename || '').trim();
    if (!normalized || normalized === '.gitkeep') {
        return null;
    }

    if (normalized.includes('..') || normalized.includes('/') || normalized.includes('\\')) {
        return null;
    }

    return normalized;
}

function toArray(value, mode) {
    if (mode === 'one') {
        return value ? [value] : [];
    }

    return Array.isArray(value) ? value : [];
}

function collectUploadReferences(value, accumulator) {
    if (!value) {
        return;
    }

    if (typeof value === 'string') {
        for (const pattern of UPLOAD_PATH_PATTERNS) {
            for (const match of value.matchAll(pattern)) {
                const filename = normalizeFilename(match[1]);
                if (filename) {
                    accumulator.add(filename);
                }
            }
        }
        return;
    }

    if (Array.isArray(value)) {
        value.forEach((entry) => collectUploadReferences(entry, accumulator));
        return;
    }

    if (typeof value === 'object') {
        Object.values(value).forEach((entry) => collectUploadReferences(entry, accumulator));
    }
}

async function readUploadsDirectory() {
    try {
        const filenames = await readdir(UPLOADS_DIRECTORY);
        const fileEntries = await Promise.all(
            filenames.map(async (filename) => {
                const normalized = normalizeFilename(filename);
                if (!normalized) {
                    return null;
                }

                const filePath = join(UPLOADS_DIRECTORY, normalized);
                const fileStats = await stat(filePath);

                if (!fileStats.isFile()) {
                    return null;
                }

                return {
                    filename: normalized,
                    filePath,
                    sizeBytes: fileStats.size,
                    lastModified: fileStats.mtime.toISOString(),
                    isThumbnail: normalized.includes('-thumb.'),
                };
            })
        );

        return fileEntries.filter(Boolean);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
}

async function fetchSectionSnapshot(section) {
    const documents = toArray(
        section.mode === 'one'
            ? await section.Model.findOne().lean()
            : await section.Model.find({}).lean(),
        section.mode
    );

    const references = new Set();
    documents.forEach((document) => collectUploadReferences(document, references));

    return {
        key: section.key,
        label: section.label,
        documents,
        docCount: documents.length,
        approximateBytes: Buffer.byteLength(JSON.stringify(documents), 'utf8'),
        references,
    };
}

function createUploadRecord(file, referencesByFile) {
    const referencingSections = Array.from(referencesByFile.get(file.filename) || []).sort();

    return {
        filename: file.filename,
        sizeBytes: file.sizeBytes,
        lastModified: file.lastModified,
        isThumbnail: file.isThumbnail,
        isReferenced: referencingSections.length > 0,
        references: referencingSections,
    };
}

export async function auditStorageUsage() {
    await dbConnect();

    const [sectionSnapshots, uploadFiles] = await Promise.all([
        Promise.all(STORAGE_SECTIONS.map((section) => fetchSectionSnapshot(section))),
        readUploadsDirectory(),
    ]);

    const referencesByFile = new Map();
    sectionSnapshots.forEach((section) => {
        section.references.forEach((filename) => {
            if (!referencesByFile.has(filename)) {
                referencesByFile.set(filename, new Set());
            }
            referencesByFile.get(filename).add(section.label);
        });
    });

    const uploads = uploadFiles
        .map((file) => createUploadRecord(file, referencesByFile))
        .sort((left, right) => right.sizeBytes - left.sizeBytes);

    const unreferencedUploads = uploads.filter((upload) => !upload.isReferenced);
    const referencedUploads = uploads.filter((upload) => upload.isReferenced);

    const sections = sectionSnapshots.map((section) => {
        const referencedUploadBytes = Array.from(section.references).reduce((total, filename) => {
            const matchedUpload = uploads.find((upload) => upload.filename === filename);
            return total + (matchedUpload?.sizeBytes || 0);
        }, 0);

        return {
            key: section.key,
            label: section.label,
            docCount: section.docCount,
            approximateBytes: section.approximateBytes,
            referencedUploadCount: section.references.size,
            referencedUploadBytes,
        };
    });

    const totalDatabaseBytes = sections.reduce((total, section) => total + section.approximateBytes, 0);
    const totalUploadBytes = uploads.reduce((total, upload) => total + upload.sizeBytes, 0);
    const totalReferencedUploadBytes = referencedUploads.reduce((total, upload) => total + upload.sizeBytes, 0);
    const totalUnreferencedUploadBytes = unreferencedUploads.reduce((total, upload) => total + upload.sizeBytes, 0);
    const totalThumbnailBytes = uploads
        .filter((upload) => upload.isThumbnail)
        .reduce((total, upload) => total + upload.sizeBytes, 0);

    return {
        summary: {
            totalDatabaseBytes,
            totalUploadBytes,
            totalReferencedUploadBytes,
            totalUnreferencedUploadBytes,
            totalThumbnailBytes,
            totalAppBytes: totalDatabaseBytes + totalUploadBytes,
            uploadFileCount: uploads.length,
            referencedUploadCount: referencedUploads.length,
            unreferencedUploadCount: unreferencedUploads.length,
        },
        sections,
        uploads,
        unreferencedUploads,
    };
}

export async function deleteUnreferencedUploads(filenames) {
    const requestedFilenames = Array.from(
        new Set(
            (Array.isArray(filenames) ? filenames : [filenames])
                .map((filename) => normalizeFilename(filename))
                .filter(Boolean)
        )
    );

    if (requestedFilenames.length === 0) {
        return {
            deleted: [],
            skipped: [],
            reclaimedBytes: 0,
        };
    }

    const audit = await auditStorageUsage();
    const unreferencedLookup = new Map(
        audit.unreferencedUploads.map((upload) => [upload.filename, upload])
    );

    const deleted = [];
    const skipped = [];
    let reclaimedBytes = 0;

    for (const filename of requestedFilenames) {
        const upload = unreferencedLookup.get(filename);

        if (!upload) {
            skipped.push({
                filename,
                reason: 'File is referenced or no longer exists.',
            });
            continue;
        }

        try {
            await unlink(join(UPLOADS_DIRECTORY, filename));
            deleted.push(upload);
            reclaimedBytes += upload.sizeBytes;
        } catch (error) {
            if (error.code === 'ENOENT') {
                skipped.push({
                    filename,
                    reason: 'File already removed.',
                });
                continue;
            }

            throw error;
        }
    }

    return {
        deleted,
        skipped,
        reclaimedBytes,
    };
}

/**
 * Automates background cleaning of unreferenced uploads.
 */
export async function executeUnreferencedCleanup() {
    const audit = await auditStorageUsage();
    const filenames = audit.unreferencedUploads.map(upload => upload.filename);
    const result = await deleteUnreferencedUploads(filenames);
    
    const formatBytes = (bytes = 0) => {
        if (bytes <= 0) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / 1024 ** i).toFixed(2)} ${units[i]}`;
    };

    return {
        deletedCount: result.deleted.length,
        skippedCount: result.skipped.length,
        reclaimedBytes: result.reclaimedBytes,
        reclaimedString: formatBytes(result.reclaimedBytes)
    };
}

/**
 * Helper to recursively search and replace in MongoDB objects.
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

/**
 * Automatically converts all legacy uploads to WebP and replaces database occurrences.
 */
export async function executeWebPMigration() {
    const filenames = await readdir(UPLOADS_DIRECTORY);
    const migrateCandidates = filenames.filter(name => {
        const ext = name.split('.').pop()?.toLowerCase();
        const isImage = ['jpg', 'jpeg', 'png', 'heic', 'heif', 'gif'].includes(ext);
        const isWebp = ext === 'webp';
        return isImage && !isWebp && name !== '.gitkeep';
    });

    const details = [];
    let migratedCount = 0;
    let reclaimedBytes = 0;

    const MODELS = STORAGE_SECTIONS.map(s => s.Model);

    for (const oldFilename of migrateCandidates) {
        const oldPath = join(UPLOADS_DIRECTORY, oldFilename);
        const dotIndex = oldFilename.lastIndexOf('.');
        const nameWithoutExt = oldFilename.slice(0, dotIndex);
        const newFilename = `${nameWithoutExt}.webp`;
        const newPath = join(UPLOADS_DIRECTORY, newFilename);

        try {
            const buffer = await readFile(oldPath);
            const originalSize = buffer.length;

            let pipeline = sharp(buffer);
            const metadata = await pipeline.metadata();
            const isThumbnail = oldFilename.includes('-thumb.');
            const quality = isThumbnail ? 80 : 85;

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
            await writeFile(newPath, outputBuffer);

            let referencesUpdated = 0;
            for (const Model of MODELS) {
                const docs = await Model.find({});
                for (const doc of docs) {
                    const plainDoc = doc.toObject();
                    const jsonStr = JSON.stringify(plainDoc);

                    if (jsonStr.includes(oldFilename)) {
                        const updatedPlain = recursiveReplaceUrl(plainDoc, oldFilename, newFilename);
                        delete updatedPlain._id;
                        await Model.updateOne({ _id: doc._id }, { $set: updatedPlain });
                        referencesUpdated++;
                    }
                }
            }

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
            details.push({
                original: oldFilename,
                success: false,
                error: err.message
            });
        }
    }

    const formatBytes = (bytes = 0) => {
        if (bytes <= 0) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / 1024 ** i).toFixed(2)} ${units[i]}`;
    };

    return {
        migratedCount,
        reclaimedBytes,
        reclaimedString: formatBytes(reclaimedBytes),
        details
    };
}
