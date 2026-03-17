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
import Social from "@/models/Social";
import GitHub from "@/models/GitHub";
import ContactMessage from "@/models/ContactMessage";
import Theme from "@/models/Theme";
import AdmZip from "adm-zip";
import { join } from "path";
import { writeFile, mkdir } from "fs/promises";

export async function POST(request) {
    try {
        await dbConnect();
        const session = await getSession();

        if (!session) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const contentType = request.headers.get('content-type') || '';
        let jsonData;
        let imageEntries = [];

        if (contentType.includes('multipart/form-data')) {
            // Handle ZIP or JSON file upload via FormData
            const formData = await request.formData();
            const file = formData.get('file');

            if (!file) {
                return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
            }

            const fileBuffer = Buffer.from(await file.arrayBuffer());
            const fileName = (file.name || '').toLowerCase();
            const isZipBySignature = fileBuffer.length >= 4
                && fileBuffer[0] === 0x50
                && fileBuffer[1] === 0x4b;
            const isZipFile = fileName.endsWith('.zip')
                || file.type === 'application/zip'
                || file.type === 'application/x-zip-compressed'
                || isZipBySignature;

            if (isZipFile) {
                // Process ZIP file
                const zip = new AdmZip(fileBuffer);
                const zipEntries = zip.getEntries();

                // Find and parse data.json
                const dataEntry = zipEntries.find(e => !e.isDirectory && /(^|\/)data\.json$/i.test(e.entryName));
                if (!dataEntry) {
                    return NextResponse.json({ success: false, error: "ZIP does not contain data.json" }, { status: 400 });
                }

                try {
                    jsonData = JSON.parse(dataEntry.getData().toString('utf8'));
                } catch (err) {
                    return NextResponse.json({ success: false, error: "Invalid JSON in data.json" }, { status: 400 });
                }

                // Collect image entries from uploads/ folder
                imageEntries = zipEntries.filter(e =>
                    !e.isDirectory && /(^|\/)uploads\/.+/i.test(e.entryName)
                );
            } else {
                // Legacy JSON file upload
                try {
                    jsonData = JSON.parse(fileBuffer.toString('utf8'));
                } catch (err) {
                    return NextResponse.json({ success: false, error: "INVALID_JSON_STRUCTURE" }, { status: 400 });
                }
            }
        } else {
            // Legacy: direct JSON body (backward compat)
            try {
                jsonData = await request.json();
            } catch (err) {
                return NextResponse.json({ success: false, error: "INVALID_JSON_STRUCTURE" }, { status: 400 });
            }
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
            { model: Social, key: 'socials' },
            { model: GitHub, key: 'github' },
            { model: ContactMessage, key: 'contactMessages' },
            { model: Theme, key: 'themes' },
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

        return NextResponse.json({ success: true, results });
    } catch (error) {
        console.error("Import error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
