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

function parseZipImport(fileBuffer) {
    const zip = new AdmZip(fileBuffer);
    const zipEntries = zip.getEntries();

    const dataEntry = zipEntries.find((entry) => !entry.isDirectory && /(^|\/)data\.json$/i.test(entry.entryName));
    if (!dataEntry) {
        throw new Error("ZIP does not contain data.json");
    }

    let jsonData;
    try {
        jsonData = JSON.parse(dataEntry.getData().toString('utf8'));
    } catch {
        throw new Error("Invalid JSON in data.json");
    }

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
            { modelKey: 'project', key: 'projects' },
            { modelKey: 'deployment', key: 'deployments' },
            { modelKey: 'social', key: 'socials' },
            { modelKey: 'github', key: 'github' },
            { modelKey: 'contactMessage', key: 'contactMessages' },
            { modelKey: 'theme', key: 'themes' },
            { modelKey: 'cron', key: 'crons' },
            { modelKey: 'ads', key: 'ads' },
            { modelKey: 'notificationConfig', key: 'notificationConfig' },
        ];

        // Restore database collections (preserving original ids from the backup).
        const results = {};
        for (const { modelKey, key } of models) {
            if (jsonData[key] && Array.isArray(jsonData[key])) {
                const delegate = getDelegate(prisma, modelKey);
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
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
