import dbConnect from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import About from "@/models/About";
import Blog from "@/models/Blog";
import Config from "@/models/Config";
import Gallery from "@/models/Gallery";
import Header from "@/models/Header";
import Home from "@/models/Home";
import Project from "@/models/Project";
import Deployment from "@/models/Deployment";
import Social from "@/models/Social";
import GitHub from "@/models/GitHub";
import ContactMessage from "@/models/ContactMessage";
import Theme from "@/models/Theme";
import Cron from "@/models/Cron";
import Ads from "@/models/Ads";
import NotificationConfig from "@/models/NotificationConfig";
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
        await dbConnect();
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

        // List of models and their keys in the JSON
        const models = [
            { model: About, key: 'about' },
            { model: Blog, key: 'blogs' },
            { model: Config, key: 'config' },
            { model: Gallery, key: 'gallery' },
            { model: Header, key: 'header' },
            { model: Home, key: 'home' },
            { model: Project, key: 'projects' },
            { model: Deployment, key: 'deployments' },
            { model: Social, key: 'socials' },
            { model: GitHub, key: 'github' },
            { model: ContactMessage, key: 'contactMessages' },
            { model: Theme, key: 'themes' },
            { model: Cron, key: 'crons' },
            { model: Ads, key: 'ads' },
            { model: NotificationConfig, key: 'notificationConfig' },
        ];

        // Restore database collections
        const results = {};
        for (const { model, key } of models) {
            if (jsonData[key] && Array.isArray(jsonData[key])) {
                await model.deleteMany({});
                if (jsonData[key].length > 0) {
                    await model.insertMany(jsonData[key]);
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
