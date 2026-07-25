import { prisma } from "@/lib/prisma";
import { getDelegate, fromClient } from "@/lib/serialize";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import cache from "@/lib/cache";
import AdmZip from "adm-zip";
import { join } from "path";
import { writeFile, mkdir } from "fs/promises";

function isZipBuffer(buffer) {
    return buffer.length >= 4
        && buffer[0] === 0x50
        && buffer[1] === 0x4b;
}

const MAX_DECOMPRESSED_BYTES = 500 * 1024 * 1024; // 500MB
const MAX_ZIP_ENTRIES = 10000;

/**
 * Assemble the database dump from a backup ZIP, supporting both layouts:
 *   - legacy: a single top-level `data.json` holding the whole dump.
 *   - split-v2: one `data/<collection>.json` file per collection.
 * Both produce the same flat `{ <collection>: value }` object the import loop
 * consumes, so old and new backups stay mutually compatible.
 */
function assembleJsonData(zipEntries) {
    // Legacy single-file layout wins if present (keeps old backups importable).
    const legacyEntry = zipEntries.find(
        (entry) => !entry.isDirectory && /(^|\/)data\.json$/i.test(entry.entryName)
    );
    if (legacyEntry) {
        try {
            return JSON.parse(legacyEntry.getData().toString('utf8'));
        } catch {
            throw new Error("Invalid JSON in data.json");
        }
    }

    // Split-v2 layout: merge every data/<collection>.json back into one object.
    const collectionEntries = zipEntries.filter(
        (entry) => !entry.isDirectory && /(^|\/)data\/[^/]+\.json$/i.test(entry.entryName)
    );
    if (collectionEntries.length > 0) {
        const jsonData = {};
        for (const entry of collectionEntries) {
            const key = entry.entryName.split('/').pop().replace(/\.json$/i, '');
            if (!key || key === 'manifest') continue;
            try {
                jsonData[key] = JSON.parse(entry.getData().toString('utf8'));
            } catch {
                throw new Error(`Invalid JSON in data/${key}.json`);
            }
        }
        return jsonData;
    }

    throw new Error("ZIP does not contain data.json or a data/ collection folder");
}

function parseZipImport(fileBuffer) {
    const zip = new AdmZip(fileBuffer);
    const zipEntries = zip.getEntries();

    if (zipEntries.length > MAX_ZIP_ENTRIES) {
        throw new Error(`Backup contains too many files (${zipEntries.length} > ${MAX_ZIP_ENTRIES})`);
    }

    const totalUncompressedSize = zipEntries.reduce((sum, entry) => sum + (entry.header?.size || 0), 0);
    if (totalUncompressedSize > MAX_DECOMPRESSED_BYTES) {
        throw new Error("Backup archive's uncompressed size exceeds the 500MB limit");
    }

    const jsonData = assembleJsonData(zipEntries);

    const imageEntries = zipEntries.filter((entry) =>
        !entry.isDirectory && /(^|\/)uploads\/.+/i.test(entry.entryName)
    );

    return { jsonData, imageEntries };
}

function parseJsonImport(fileBuffer) {
    try {
        return JSON.parse(fileBuffer.toString('utf8'));
    } catch {
        throw new Error("INVALID_JSON_STRUCTURE");
    }
}

async function parseImportPayload(request) {
    const contentType = request.headers.get('content-type') || '';
    const headerFileName = (request.headers.get('x-backup-filename') || '').toLowerCase();

    if (contentType.includes('multipart/form-data')) {
        let formData;
        try {
            formData = await request.formData();
        } catch {
            throw new Error("Failed to read multipart upload. Try selecting the backup again.");
        }

        const file = formData.get('file');

        if (!file) {
            throw new Error("No file uploaded");
        }

        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const fileName = (file.name || '').toLowerCase();
        const isZipFile = fileName.endsWith('.zip')
            || file.type === 'application/zip'
            || file.type === 'application/x-zip-compressed'
            || isZipBuffer(fileBuffer);

        if (isZipFile) {
            return parseZipImport(fileBuffer);
        }

        return {
            jsonData: parseJsonImport(fileBuffer),
            imageEntries: [],
        };
    }

    if (contentType.includes('application/json')) {
        return {
            jsonData: await request.json(),
            imageEntries: [],
        };
    }

    const fileBuffer = Buffer.from(await request.arrayBuffer());
    if (!fileBuffer.length) {
        throw new Error("No file uploaded");
    }

    const isZipFile = headerFileName.endsWith('.zip')
        || contentType.includes('application/zip')
        || contentType.includes('application/x-zip-compressed')
        || isZipBuffer(fileBuffer);

    if (isZipFile) {
        return parseZipImport(fileBuffer);
    }

    const isJsonFile = headerFileName.endsWith('.json')
        || contentType.includes('application/octet-stream')
        || contentType.includes('text/json')
        || contentType.includes('application/json')
        || contentType.includes('text/plain');

    if (isJsonFile) {
        return {
            jsonData: parseJsonImport(fileBuffer),
            imageEntries: [],
        };
    }

    throw new Error("Unsupported backup format");
}

export async function POST(request) {
    try {
        const session = await getSession();

        if (!session) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        let jsonData;
        let imageEntries = [];

        try {
            const parsedPayload = await parseImportPayload(request);
            jsonData = parsedPayload.jsonData;
            imageEntries = parsedPayload.imageEntries;
        } catch (parseError) {
            return NextResponse.json(
                {
                    success: false,
                    error: parseError.message || "Failed to parse import payload",
                },
                { status: 400 }
            );
        }

        // Basic validation
        if (!jsonData || typeof jsonData !== 'object') {
            return NextResponse.json({ success: false, error: "Invalid data format" }, { status: 400 });
        }

        // Map each backup key to its registry model key.
        const models = [
            { modelKey: 'about', key: 'about' },
            { modelKey: 'blog', key: 'blogs' },
            { modelKey: 'config', key: 'config' },
            { modelKey: 'gallery', key: 'gallery' },
            { modelKey: 'header', key: 'header' },
            { modelKey: 'home', key: 'home' },
            { modelKey: 'aiPage', key: 'aiPage' },
            { modelKey: 'resumeStudio', key: 'resumeStudio' },
            // AI Hub section content. Category MUST precede skill: the per-model
            // deleteMany+createMany loop runs in array order, and aiSkill.categoryId
            // is a FK onto aiSkillCategory.
            { modelKey: 'aiSkillCategory', key: 'aiSkillCategories' },
            { modelKey: 'aiSkill', key: 'aiSkills' },
            { modelKey: 'aiRecommendation', key: 'aiRecommendations' },
            { modelKey: 'aiCredit', key: 'aiCredits' },
            { modelKey: 'aiPrompt', key: 'aiPrompts' },
            { modelKey: 'project', key: 'projects' },
            { modelKey: 'deployment', key: 'deployments' },
            { modelKey: 'social', key: 'socials' },
            { modelKey: 'github', key: 'github' },
            { modelKey: 'contactMessage', key: 'contactMessages' },
            { modelKey: 'theme', key: 'themes' },
            { modelKey: 'cron', key: 'crons' },
            { modelKey: 'ads', key: 'ads' },
            { modelKey: 'notificationConfig', key: 'notificationConfig' },
            { modelKey: 'analyticsEvent', key: 'analyticsEvents' },
            { modelKey: 'analyticsDaily', key: 'analyticsDaily' },
            { modelKey: 'aiLog', key: 'aiLogs' },
        ];

        // Preflight: refuse to restore into a database whose schema is behind the
        // running code. Without this, the transaction below aborts with a cryptic
        // "column does not exist" Prisma error mid-restore. A cheap SELECT of the
        // newest schema columns detects drift before anything is touched.
        try {
            await prisma.blog.findFirst({ select: { id: true, isFlagged: true, reviewStatus: true } });
        } catch (driftError) {
            if (driftError?.code === 'P2022' || driftError?.code === 'P2021') {
                return NextResponse.json({
                    success: false,
                    error: "Database schema is out of date (pending migrations). Run `prisma migrate deploy` (or restart the container with RUN_MIGRATIONS=true) and retry. No data was changed.",
                }, { status: 409 });
            }
            throw driftError;
        }

        // Restore database collections atomically inside a transaction (preserving original ids from the backup).
        const results = {};
        await prisma.$transaction(async (tx) => {
            for (const { modelKey, key } of models) {
                if (jsonData[key] && Array.isArray(jsonData[key])) {
                    const delegate = getDelegate(tx, modelKey);
                    await delegate.deleteMany();
                    if (jsonData[key].length > 0) {
                        const rows = jsonData[key].map((doc) => fromClient(modelKey, doc, { keepId: true }));
                        await delegate.createMany({ data: rows });
                    }
                    results[key] = { count: jsonData[key].length, status: 'imported' };
                } else {
                    results[key] = { status: 'skipped', reason: 'missing_or_invalid' };
                }
            }
        }, {
            timeout: 60000,
        });

        // Restore image files from ZIP
        let imagesRestored = 0;
        if (imageEntries.length > 0) {
            const uploadsDir = join(process.cwd(), 'public', 'uploads');
            try {
                await mkdir(uploadsDir, { recursive: true, mode: 0o755 });
            } catch (e) {
                if (e.code !== 'EEXIST') throw e;
            }

            for (const entry of imageEntries) {
                try {
                    const uploadsIndex = entry.entryName.toLowerCase().lastIndexOf('uploads/');
                    const filename = uploadsIndex >= 0
                        ? entry.entryName.slice(uploadsIndex + 'uploads/'.length)
                        : entry.entryName;
                    // Security: prevent directory traversal
                    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
                        console.warn(`[IMPORT] Skipping suspicious path: ${entry.entryName}`);
                        continue;
                    }
                    const filePath = join(uploadsDir, filename);
                    await writeFile(filePath, entry.getData(), { mode: 0o644 });
                    imagesRestored++;
                } catch (err) {
                    console.warn(`[IMPORT] Failed to restore file: ${entry.entryName}`, err.message);
                }
            }
            results.images = { count: imagesRestored, status: 'restored' };
        }

        // Clear in-memory caches so restored data is visible immediately.
        await cache.invalidateAllAsync();

        return NextResponse.json({ success: true, results });
    } catch (error) {
        console.error("Import error:", error);
        // Schema drift surfaced mid-transaction (e.g. a model the preflight does
        // not cover). The transaction already rolled back — say so explicitly so
        // the admin knows nothing was lost.
        if (error?.code === 'P2022' || error?.code === 'P2021') {
            return NextResponse.json({
                success: false,
                error: "Restore aborted: database schema is out of date (pending migrations). All changes were rolled back — no data was lost. Run `prisma migrate deploy` and retry.",
            }, { status: 409 });
        }
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
