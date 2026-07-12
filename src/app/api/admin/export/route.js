import { prisma } from "@/lib/prisma";
import { toClientList } from "@/lib/serialize";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import archiver from "archiver";
import { join } from "path";
import { readFile, access, readdir } from "fs/promises";

export async function GET(request) {
    try {
        const session = await getSession();

        if (!session) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const includeGithub = searchParams.get('includeGithub') === 'true';
        const includeContact = searchParams.get('includeContact') === 'true';

        const crons = toClientList('cron', await prisma.cron.findMany()).map(cron => {
            const cleanCron = { ...cron };
            delete cleanCron.webhookEnv;
            delete cleanCron.lastRun;
            delete cleanCron.lastRunStatus;
            delete cleanCron.lastRunLog;
            return cleanCron;
        });

        // Ads secrets live inside the json data blob, so they are fully backed up.
        const ads = toClientList('ads', await prisma.ads.findMany());

        // Fetch NotificationConfig
        const notificationConfig = toClientList('notificationConfig', await prisma.notificationConfig.findMany());

        // Build the database export data
        const data = {
            about: toClientList('about', await prisma.about.findMany()),
            blogs: toClientList('blog', await prisma.blog.findMany()),
            config: toClientList('config', await prisma.config.findMany()),
            gallery: toClientList('gallery', await prisma.gallery.findMany()),
            header: toClientList('header', await prisma.header.findMany()),
            home: toClientList('home', await prisma.home.findMany()),
            aiPage: toClientList('aiPage', await prisma.aiPage.findMany()),
            // Resume Studio singleton: LaTeX source, snapshots, ideas, settings.
            resumeStudio: toClientList('resumeStudio', await prisma.resumeStudio.findMany()),
            // The AI Hub's section content (skills / recommendations / credits /
            // prompts) lives in these relational tables, not the aiPage json blob
            // — they must be backed up too or the /ai page restores empty.
            aiSkillCategories: toClientList('aiSkillCategory', await prisma.aiSkillCategory.findMany()),
            aiSkills: toClientList('aiSkill', await prisma.aiSkill.findMany()),
            aiRecommendations: toClientList('aiRecommendation', await prisma.aiRecommendation.findMany()),
            aiCredits: toClientList('aiCredit', await prisma.aiCredit.findMany()),
            aiPrompts: toClientList('aiPrompt', await prisma.aiPrompt.findMany()),
            projects: toClientList('project', await prisma.project.findMany()),
            deployments: toClientList('deployment', await prisma.deployment.findMany()),
            socials: toClientList('social', await prisma.social.findMany()),
            themes: toClientList('theme', await prisma.theme.findMany()),
            crons,
            ads,
            notificationConfig,
            analyticsEvents: toClientList('analyticsEvent', await prisma.analyticsEvent.findMany()),
            analyticsDaily: toClientList('analyticsDaily', await prisma.analyticsDaily.findMany()),
            exportedAt: new Date().toISOString(),
        };

        if (includeGithub) {
            data.github = toClientList('github', await prisma.gitHub.findMany());
        }

        if (includeContact) {
            data.contactMessages = toClientList('contactMessage', await prisma.contactMessage.findMany());
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

        // Split the database dump into one JSON file per collection under data/
        // instead of a single monolithic data.json. High-churn collections
        // (analytics) then grow in their own file while the content collections
        // stay small and stable, and the archive diffs cleanly between backups.
        // A manifest records the format + per-collection counts. The import
        // route reads BOTH this split layout and the legacy single data.json.
        const { exportedAt, ...collections } = data;

        const manifest = {
            format: 'split-v2',
            exportedAt,
            collections: Object.keys(collections),
            counts: Object.fromEntries(
                Object.entries(collections).map(([key, value]) => [
                    key,
                    Array.isArray(value) ? value.length : 1,
                ])
            ),
        };
        archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });

        for (const [key, value] of Object.entries(collections)) {
            archive.append(JSON.stringify(value, null, 2), { name: `data/${key}.json` });
        }

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
