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
import archiver from "archiver";
import { join } from "path";
import { readFile, access, readdir } from "fs/promises";

export async function GET(request) {
    try {
        await dbConnect();
        const session = await getSession();

        if (!session) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const includeGithub = searchParams.get('includeGithub') === 'true';
        const includeContact = searchParams.get('includeContact') === 'true';

        const rawCrons = await Cron.find({}).lean();
        const crons = rawCrons.map(cron => {
            const cleanCron = { ...cron };
            delete cleanCron.webhookEnv;
            delete cleanCron.lastRun;
            delete cleanCron.lastRunStatus;
            delete cleanCron.lastRunLog;
            return cleanCron;
        });

        // Fetch Ads including all select: false fields so they are fully backed up
        const ads = await Ads.find({}).select(
            '+encryptedClientId ' +
            '+placements.top.encryptedSlotId ' +
            '+placements.middle.encryptedSlotId ' +
            '+placements.bottom.encryptedSlotId ' +
            '+placements.sidebar.encryptedSlotId ' +
            '+placements.footer.encryptedSlotId'
        ).lean();

        // Fetch NotificationConfig
        const notificationConfig = await NotificationConfig.find({}).lean();

        // Build the database export data
        const data = {
            about: await About.find({}),
            blogs: await Blog.find({}),
            config: await Config.find({}),
            gallery: await Gallery.find({}),
            header: await Header.find({}),
            home: await Home.find({}),
            projects: await Project.find({}),
            deployments: await Deployment.find({}),
            socials: await Social.find({}),
            themes: await Theme.find({}),
            crons,
            ads,
            notificationConfig,
            exportedAt: new Date().toISOString(),
        };

        if (includeGithub) {
            data.github = await GitHub.find({});
        }

        if (includeContact) {
            data.contactMessages = await ContactMessage.find({});
        }

        // Collect all image filenames from gallery entries
        const imageFiles = new Set();
        if (data.gallery && data.gallery.length > 0) {
            for (const item of data.gallery) {
                // Extract filename from URL like /api/uploads/filename.ext
                if (item.src) {
                    const srcFilename = item.src.split('/').pop();
                    if (srcFilename) imageFiles.add(srcFilename);
                }
                if (item.thumbnail) {
                    const thumbFilename = item.thumbnail.split('/').pop();
                    if (thumbFilename) imageFiles.add(thumbFilename);
                }
            }
        }

        // Create ZIP archive in memory
        const archive = archiver('zip', { zlib: { level: 5 } });

        // Add data.json
        archive.append(JSON.stringify(data, null, 2), { name: 'data.json' });

        // Add image files from public/uploads/
        const uploadsDir = join(process.cwd(), 'public', 'uploads');
        let uploadEntries = [];
        try {
            uploadEntries = await readdir(uploadsDir, { withFileTypes: true });
        } catch {
            uploadEntries = [];
        }

        for (const entry of uploadEntries) {
            if (!entry.isFile()) continue;
            imageFiles.add(entry.name);
        }

        for (const filename of imageFiles) {
            const filePath = join(uploadsDir, filename);
            try {
                await access(filePath);
                const fileBuffer = await readFile(filePath);
                archive.append(fileBuffer, { name: `uploads/${filename}` });
            } catch {
                // File doesn't exist locally, skip it
                console.warn(`[EXPORT] Skipping missing file: ${filename}`);
            }
        }

        // Collect all chunks and wait for stream to fully end
        const zipBuffer = await new Promise((resolve, reject) => {
            const chunks = [];
            archive.on('data', (chunk) => chunks.push(chunk));
            archive.on('end', () => resolve(Buffer.concat(chunks)));
            archive.on('error', (err) => reject(err));
            archive.finalize();
        });

        // Return ZIP as downloadable response
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
        const zipFilename = `backup_${dateStr}_${timeStr}.zip`;

        return new NextResponse(zipBuffer, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${zipFilename}"`,
                'Content-Length': zipBuffer.length.toString(),
            },
        });
    } catch (error) {
        console.error("Export error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
