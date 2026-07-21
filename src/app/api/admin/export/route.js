import { prisma } from "@/lib/prisma";
import { toClientList } from "@/lib/serialize";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import archiver from "archiver";
import { join } from "path";
import { readFile, access, readdir } from "fs/promises";

// One producer per backup collection. Each is only awaited when the collection
// is selected, so deselected collections cost zero queries. Insertion order
// here is the order collections appear in the archive/manifest.
const COLLECTION_PRODUCERS = {
    about: async () => toClientList('about', await prisma.about.findMany()),
    blogs: async () => toClientList('blog', await prisma.blog.findMany()),
    config: async () => toClientList('config', await prisma.config.findMany()),
    gallery: async () => toClientList('gallery', await prisma.gallery.findMany()),
    header: async () => toClientList('header', await prisma.header.findMany()),
    home: async () => toClientList('home', await prisma.home.findMany()),
    aiPage: async () => toClientList('aiPage', await prisma.aiPage.findMany()),
    // Resume Studio singleton: LaTeX source, snapshots, ideas, settings.
    resumeStudio: async () => toClientList('resumeStudio', await prisma.resumeStudio.findMany()),
    // The AI Hub's section content (skills / recommendations / credits /
    // prompts) lives in these relational tables, not the aiPage json blob
    // — they must be backed up too or the /ai page restores empty.
    aiSkillCategories: async () => toClientList('aiSkillCategory', await prisma.aiSkillCategory.findMany()),
    aiSkills: async () => toClientList('aiSkill', await prisma.aiSkill.findMany()),
    aiRecommendations: async () => toClientList('aiRecommendation', await prisma.aiRecommendation.findMany()),
    aiCredits: async () => toClientList('aiCredit', await prisma.aiCredit.findMany()),
    aiPrompts: async () => toClientList('aiPrompt', await prisma.aiPrompt.findMany()),
    projects: async () => toClientList('project', await prisma.project.findMany()),
    deployments: async () => toClientList('deployment', await prisma.deployment.findMany()),
    socials: async () => toClientList('social', await prisma.social.findMany()),
    themes: async () => toClientList('theme', await prisma.theme.findMany()),
    crons: async () => toClientList('cron', await prisma.cron.findMany()).map(cron => {
        const cleanCron = { ...cron };
        delete cleanCron.webhookEnv;
        delete cleanCron.lastRun;
        delete cleanCron.lastRunStatus;
        delete cleanCron.lastRunLog;
        return cleanCron;
    }),
    // Ads secrets live inside the json data blob, so they are fully backed up.
    ads: async () => toClientList('ads', await prisma.ads.findMany()),
    notificationConfig: async () => toClientList('notificationConfig', await prisma.notificationConfig.findMany()),
    analyticsEvents: async () => toClientList('analyticsEvent', await prisma.analyticsEvent.findMany()),
    analyticsDaily: async () => toClientList('analyticsDaily', await prisma.analyticsDaily.findMany()),
    // AI usage history: every provider call logged with prompt/response/tokens.
    aiLogs: async () => toClientList('aiLog', await prisma.aiLog.findMany()),
    github: async () => toClientList('github', await prisma.gitHub.findMany()),
    contactMessages: async () => toClientList('contactMessage', await prisma.contactMessage.findMany()),
};

// Legacy no-`collections` callers keep the old opt-in behavior for sensitive
// collections: excluded unless their flag is set.
const LEGACY_FLAGS = {
    github: 'includeGithub',
    contactMessages: 'includeContact',
    aiLogs: 'includeAiUsage',
};

export async function GET(request) {
    try {
        const session = await getSession();

        if (!session) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const includeImages = searchParams.get('includeImages') !== 'false';

        // `collections=a,b,c` is the authoritative allow-list when present.
        // Without it, fall back to legacy behavior (all except flag-gated ones).
        const rawCollections = searchParams.get('collections');
        const selected = rawCollections
            ? new Set(rawCollections.split(',').map(s => s.trim()).filter(Boolean))
            : null;

        const isSelected = (key) => {
            if (selected) return selected.has(key);
            const flag = LEGACY_FLAGS[key];
            if (flag) return searchParams.get(flag) === 'true';
            return true;
        };

        // Build the database export data (only selected collections are queried).
        const data = { exportedAt: new Date().toISOString() };
        for (const [key, produce] of Object.entries(COLLECTION_PRODUCERS)) {
            if (!isSelected(key)) continue;
            data[key] = await produce();
        }

        // Collect all image filenames from gallery entries
        const imageFiles = new Set();
        if (includeImages && data.gallery && data.gallery.length > 0) {
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
        if (includeImages) {
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
