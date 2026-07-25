# Google Drive Automated Cron Backup Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an automated Google Drive Database Backup system cron job (disabled by default) that can be enabled/disabled from both `/admin/config/crons` (`/admin/crown`) and the `/admin/database` page.

**Architecture:** A system cron job (`action: 'gdrive_backup'`, schedule: `0 0 * * *`) is registered in `src/utils/cronRunner.js`. When enabled, `runDueCronJobs()` automatically exports the system database and uploads it to the user's `Aiyu Backups` folder in Google Drive. A dedicated API route (`/api/admin/gdrive/cron`) and UI controls on `/admin/database` and `/admin/config/crons` allow administrators to easily toggle the schedule on/off.

**Global Constraints:**
- Must be disabled by default on initial seeding.
- Must verify Google Drive connection (`getGDriveConfig().isConnected`) before attempting background backup.
- Must be manageable from both `/admin/config/crons` and `/admin/database`.

---

### Task 1: Register and Handle `gdrive_backup` System Cron Job in `src/utils/cronRunner.js`

**Files:**
- Modify: `src/utils/cronRunner.js`

- [ ] **Step 1: Seed `gdrive_backup` system cron job in `initCronRunner()`**

```javascript
const gdriveJob = await prisma.cron.findFirst({ where: { action: 'gdrive_backup' } });
if (!gdriveJob) {
    await prisma.cron.create({ data: {
        name: 'Google Drive Automated Backup',
        type: 'system',
        schedule: '0 0 * * *', // Daily at Midnight
        enabled: false, // Disabled by default
        action: 'gdrive_backup',
        nextRun: getNextCronRun('0 0 * * *', new Date(), timeZone)
    } });
    console.log('[CRON SERVICE] Seeded: Google Drive Automated Backup (disabled by default)');
}
```

- [ ] **Step 2: Add `gdrive_backup` execution block in `executeCronJob(job)`**

```javascript
} else if (job.action === 'gdrive_backup') {
    const config = await getGDriveConfig();
    if (!config.isConnected) {
        throw new Error('Google Drive account is not connected. Connect Google Drive in Database Admin to enable automated backups.');
    }
    
    // Generate system backup export archive
    const collections = [
        'about', 'blogs', 'config', 'gallery', 'header', 'home', 'aiPage',
        'resumeStudio', 'aiSkillCategories', 'aiSkills', 'aiRecommendations',
        'aiCredits', 'aiPrompts', 'projects', 'deployments', 'socials',
        'themes', 'crons', 'ads', 'notificationConfig', 'analyticsEvents',
        'analyticsDaily', 'aiLogs', 'github', 'contactMessages'
    ];

    const data = { exportedAt: new Date().toISOString() };
    for (const key of collections) {
        if (COLLECTION_PRODUCERS[key]) {
            data[key] = await COLLECTION_PRODUCERS[key]();
        }
    }

    const zipBuffer = await createExportZipBuffer(data);
    const dateStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    const filename = `auto_backup_${dateStr}_${timeStr}.zip`;

    const result = await uploadBackupToDrive(zipBuffer, filename);
    attemptLogOutput = `Automated Google Drive Backup successful.\nFile: ${filename} (Drive File ID: ${result.id})`;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/utils/cronRunner.js
git commit -m "feat(cron): add automated google drive backup system cron task"
```

---

### Task 2: Create API Route `/api/admin/gdrive/cron/route.js`

**Files:**
- Create: `src/app/api/admin/gdrive/cron/route.js`

- [ ] **Step 1: Implement GET & POST for `/api/admin/gdrive/cron/route.js`**

```javascript
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getNextCronRun } from "@/utils/cronRunner";
import { getSingleton } from "@/lib/serialize";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const job = await prisma.cron.findFirst({ where: { action: 'gdrive_backup' } });
    return NextResponse.json({
        enabled: job ? job.enabled : false,
        schedule: job ? job.schedule : '0 0 * * *',
        lastRun: job ? job.lastRun : null,
        nextRun: job ? job.nextRun : null,
        cronId: job ? job.id : null,
    });
}

export async function POST(request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const { enabled, schedule } = body;

    let job = await prisma.cron.findFirst({ where: { action: 'gdrive_backup' } });
    const config = await getSingleton(prisma, 'config');
    const timeZone = config?.defaultTimezone || 'UTC';

    const cronSchedule = schedule || job?.schedule || '0 0 * * *';
    const isEnabled = enabled !== undefined ? Boolean(enabled) : (job ? job.enabled : false);
    const nextRun = isEnabled ? getNextCronRun(cronSchedule, new Date(), timeZone) : null;

    if (!job) {
        job = await prisma.cron.create({
            data: {
                name: 'Google Drive Automated Backup',
                type: 'system',
                schedule: cronSchedule,
                enabled: isEnabled,
                action: 'gdrive_backup',
                nextRun,
            },
        });
    } else {
        job = await prisma.cron.update({
            where: { id: job.id },
            data: {
                schedule: cronSchedule,
                enabled: isEnabled,
                nextRun,
            },
        });
    }

    return NextResponse.json({ success: true, enabled: job.enabled, nextRun: job.nextRun });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/admin/gdrive/cron/route.js
git commit -m "feat(gdrive): add API route to control automated backup cron schedule"
```

---

### Task 3: Add Automated Backup Toggle to `/admin/database/page.js`

**Files:**
- Modify: `src/app/admin/database/page.js`

- [ ] **Step 1: Add Cron Toggle UI to Google Drive Card**

- Add state for `gdriveCron` (`enabled`, `schedule`, `loading`).
- Fetch cron state on mount from `/api/admin/gdrive/cron`.
- Render a toggle control: **Daily Auto-Backup (Midnight)** with `ENABLE / DISABLE` toggle button and direct link to `/admin/config/crons`.

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/database/page.js
git commit -m "feat(gdrive): add automated backup cron toggle to database admin page"
```
