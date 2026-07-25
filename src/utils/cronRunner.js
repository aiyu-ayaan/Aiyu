import { prisma } from '@/lib/prisma';
import { getSingleton, toClientList } from '@/lib/serialize';
import { executeUnreferencedCleanup, executeWebPMigration } from '@/lib/storageAudit';
import { runUptimeChecks } from '@/lib/uptime';
import { pruneSessions, SESSION_RETENTION_DAYS } from '@/lib/auth';
import { sendNotification } from './notificationService';
import { decrypt } from '@/lib/encryption';
import { compileTemplate, EXECUTION_ROW_LIMIT } from './cronTemplate';
import { getGDriveConfig, uploadBackupToDrive, cleanOldDriveBackups } from '@/lib/gdrive';
import archiver from 'archiver';
import { join } from 'path';
import { readFile, access, readdir } from 'fs/promises';


// Execution-time template options: bounded row cap, no shared preview cache
// (webhooks must see fresh data, not a sampled/cached snapshot).
const EXEC_TEMPLATE_OPTS = { rowLimit: EXECUTION_ROW_LIMIT, useCache: false };

function parseCronField(field, min, max) {
    if (field === '*') return Array.from({ length: max - min + 1 }, (_, i) => min + i);
    
    const parts = field.split(',');
    const values = [];
    
    for (const part of parts) {
        if (part.includes('/')) {
            const [range, stepStr] = part.split('/');
            const step = parseInt(stepStr, 10);
            let start = min;
            let end = max;
            if (range !== '*') {
                if (range.includes('-')) {
                    const [s, e] = range.split('-');
                    start = parseInt(s, 10);
                    end = parseInt(e, 10);
                } else {
                    start = parseInt(range, 10);
                }
            }
            for (let i = start; i <= end; i += step) {
                values.push(i);
            }
        } else if (part.includes('-')) {
            const [s, e] = part.split('-');
            const start = parseInt(s, 10);
            const end = parseInt(e, 10);
            for (let i = start; i <= end; i++) {
                values.push(i);
            }
        } else {
            values.push(parseInt(part, 10));
        }
    }
    return Array.from(new Set(values));
}

export function getDateTimeParts(date, timeZone) {
    try {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone,
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            weekday: 'short',
            hour12: false
        }).formatToParts(date);

        const map = {};
        for (const p of parts) {
            map[p.type] = p.value;
        }

        const weekdayMap = {
            'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
        };

        return {
            minute: parseInt(map.minute, 10),
            hour: parseInt(map.hour, 10) % 24,
            day: parseInt(map.day, 10),
            month: parseInt(map.month, 10),
            weekday: weekdayMap[map.weekday] ?? date.getDay()
        };
    } catch (e) {
        return {
            minute: date.getMinutes(),
            hour: date.getHours(),
            day: date.getDate(),
            month: date.getMonth() + 1,
            weekday: date.getDay()
        };
    }
}

export function isCronDue(cronExpression, date = new Date(), timeZone) {
    const fields = cronExpression.trim().split(/\s+/);
    if (fields.length !== 5) return false;
    
    const [minExp, hourExp, domExp, monthExp, dowExp] = fields;
    
    const minutes = parseCronField(minExp, 0, 59);
    const hours = parseCronField(hourExp, 0, 23);
    const doms = parseCronField(domExp, 1, 31);
    const months = parseCronField(monthExp, 1, 12);
    const dows = parseCronField(dowExp, 0, 6).map(v => v === 7 ? 0 : v);
    
    let currentMin, currentHour, currentDom, currentMonth, currentDow;
    
    if (timeZone) {
        const parts = getDateTimeParts(date, timeZone);
        currentMin = parts.minute;
        currentHour = parts.hour;
        currentDom = parts.day;
        currentMonth = parts.month;
        currentDow = parts.weekday;
    } else {
        currentMin = date.getMinutes();
        currentHour = date.getHours();
        currentDom = date.getDate();
        currentMonth = date.getMonth() + 1;
        currentDow = date.getDay();
    }
    
    return minutes.includes(currentMin) &&
           hours.includes(currentHour) &&
           doms.includes(currentDom) &&
           months.includes(currentMonth) &&
           dows.includes(currentDow);
}

export function getNextCronRun(cronExpression, startDate = new Date(), timeZone) {
    const checkDate = new Date(startDate.getTime());
    checkDate.setSeconds(0, 0);
    
    for (let i = 0; i < 14400; i++) { // Max 10 days
        checkDate.setMinutes(checkDate.getMinutes() + 1);
        if (isCronDue(cronExpression, checkDate, timeZone)) {
            return checkDate;
        }
    }
    return null;
}

export async function initCronRunner() {
    if (global.cronIntervalStarted) return;
    global.cronIntervalStarted = true;

    console.log('[CRON SERVICE] Initializing task scheduler...');

    // Fetch global default timezone
    let timeZone = 'UTC';
    try {
        const config = await getSingleton(prisma, 'config');
        if (config && config.defaultTimezone) {
            timeZone = config.defaultTimezone;
        }
    } catch (configErr) {
        console.error('[CRON SERVICE] Failed to load global timezone config:', configErr);
    }

    // Seed system cron jobs
    try {
        const cleanupJob = await prisma.cron.findFirst({ where: { action: 'clean_unreferenced' } });
        if (!cleanupJob) {
            await prisma.cron.create({ data: {
                name: 'Unreferenced Uploads Cleanup',
                type: 'system',
                schedule: '0 2 * * *', // Daily at 2:00 AM
                enabled: true,
                action: 'clean_unreferenced',
                nextRun: getNextCronRun('0 2 * * *', new Date(), timeZone)
            } });
            console.log('[CRON SERVICE] Seeded: Unreferenced Uploads Cleanup');
        }

        const webpJob = await prisma.cron.findFirst({ where: { action: 'migrate_webp' } });
        if (!webpJob) {
            await prisma.cron.create({ data: {
                name: 'WebP Image Migration',
                type: 'system',
                schedule: '0 3 * * *', // Daily at 3:00 AM
                enabled: true,
                action: 'migrate_webp',
                nextRun: getNextCronRun('0 3 * * *', new Date(), timeZone)
            } });
            console.log('[CRON SERVICE] Seeded: WebP Image Migration');
        }

        const uptimeJob = await prisma.cron.findFirst({ where: { action: 'uptime_check' } });
        if (!uptimeJob) {
            await prisma.cron.create({ data: {
                name: 'Endpoint Uptime Check',
                type: 'system',
                schedule: '*/15 * * * *', // Every 15 minutes
                enabled: true,
                action: 'uptime_check',
                nextRun: getNextCronRun('*/15 * * * *', new Date(), timeZone)
            } });
            console.log('[CRON SERVICE] Seeded: Endpoint Uptime Check');
        }

        const pruneSessionsJob = await prisma.cron.findFirst({ where: { action: 'prune_sessions' } });
        if (!pruneSessionsJob) {
            await prisma.cron.create({ data: {
                name: 'Expired Session Cleanup',
                type: 'system',
                schedule: '30 2 * * *', // Daily at 2:30 AM
                enabled: true,
                action: 'prune_sessions',
                nextRun: getNextCronRun('30 2 * * *', new Date(), timeZone)
            } });
            console.log('[CRON SERVICE] Seeded: Expired Session Cleanup');
        }

        const gdriveJob = await prisma.cron.findFirst({ where: { action: 'gdrive_backup' } });
        if (!gdriveJob) {
            await prisma.cron.create({ data: {
                name: 'Google Drive Automated Backup',
                type: 'system',
                schedule: '0 0 * * *', // Daily at midnight
                enabled: false,
                action: 'gdrive_backup',
                nextRun: getNextCronRun('0 0 * * *', new Date(), timeZone)
            } });
            console.log('[CRON SERVICE] Seeded: Google Drive Automated Backup');
        }


        // Self-heal and recalculate missing or outdated nextRun timestamps
        const now = new Date();
        const jobsToHeal = await prisma.cron.findMany({
            where: {
                enabled: true,
                OR: [{ nextRun: null }, { nextRun: { lt: now } }],
            },
        });
        for (const job of jobsToHeal) {
            const nextRun = getNextCronRun(job.schedule, now, timeZone);
            await prisma.cron.update({ where: { id: job.id }, data: { nextRun } });
            console.log(`[CRON SERVICE] Self-healed nextRun for task: ${job.name} -> ${nextRun}`);
        }
    } catch (err) {
        console.error('[CRON SERVICE] Failed to seed or self-heal system jobs:', err);
    }

    // Run due cron jobs check immediately on start, then every 60s
    setTimeout(() => runDueCronJobs(), 5000); // Wait 5s on boot

    setInterval(async () => {
        await runDueCronJobs();
    }, 60000);
}

async function runDueCronJobs() {
    try {
        const activeJobs = await prisma.cron.findMany({ where: { enabled: true } });
        const now = new Date();

        let timeZone = 'UTC';
        try {
            const config = await getSingleton(prisma, 'config');
            if (config && config.defaultTimezone) {
                timeZone = config.defaultTimezone;
            }
        } catch (configErr) {
            console.error('[CRON SERVICE] Failed to load global timezone config in run loop:', configErr);
        }

        for (const job of activeJobs) {
            if (isCronDue(job.schedule, now, timeZone)) {
                console.log(`[CRON SERVICE] Triggering job: ${job.name}`);
                executeCronJob(job).catch(err => {
                    console.error(`[CRON SERVICE] Failed executing job ${job.name}:`, err);
                });
            }
        }
    } catch (err) {
        console.error('[CRON SERVICE] Error in task scheduler loop:', err);
    }
}

function hasTemplateValue(value) {
    return typeof value === 'string' && value.includes('$');
}

function valueToRequestString(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') {
        if (typeof value.url === 'string') return value.url;
        return JSON.stringify(value);
    }
    return String(value);
}

function redactEnvSecrets(value, env = {}) {
    let output = typeof value === 'string' ? value : JSON.stringify(value, null, 2);

    for (const [key, secret] of Object.entries(env)) {
        if (!secret) continue;
        output = output.split(String(secret)).join(`[SECRET: ${key}]`);
    }

    return output;
}

function safeLogJson(value, env = {}) {
    return redactEnvSecrets(JSON.stringify(value, null, 2), env);
}

const COLLECTION_PRODUCERS = {
    about: async () => toClientList('about', await prisma.about.findMany()),
    blogs: async () => toClientList('blog', await prisma.blog.findMany()),
    config: async () => toClientList('config', await prisma.config.findMany()),
    gallery: async () => toClientList('gallery', await prisma.gallery.findMany()),
    header: async () => toClientList('header', await prisma.header.findMany()),
    home: async () => toClientList('home', await prisma.home.findMany()),
    aiPage: async () => toClientList('aiPage', await prisma.aiPage.findMany()),
    resumeStudio: async () => toClientList('resumeStudio', await prisma.resumeStudio.findMany()),
    aiSkillCategories: async () => toClientList('aiSkillCategory', await prisma.aiSkillCategory.findMany()),
    aiSkills: async () => toClientList('aiSkill', await prisma.aiSkill.findMany()),
    aiRecommendations: async () => toClientList('aiRecommendation', await prisma.aiRecommendation.findMany()),
    aiCredits: async () => toClientList('aiCredit', await prisma.aiCredit.findMany()),
    aiPrompts: async () => toClientList('aiPrompt', await prisma.aiPrompt.findMany()),
    projects: async () => toClientList('project', await prisma.project.findMany()),
    deployments: async () => toClientList('deployment', await prisma.deployment.findMany()),
    socials: async () => toClientList('social', await prisma.social.findMany()),
    themes: async () => toClientList('theme', await prisma.theme.findMany()),
    crons: async () => toClientList('cron', await prisma.cron.findMany()).then((crons) => crons.map((cron) => {
        const cleanCron = { ...cron };
        delete cleanCron.webhookEnv;
        delete cleanCron.lastRun;
        delete cleanCron.lastRunStatus;
        delete cleanCron.lastRunLog;
        return cleanCron;
    })),
    ads: async () => toClientList('ads', await prisma.ads.findMany()),
    notificationConfig: async () => toClientList('notificationConfig', await prisma.notificationConfig.findMany()),
    analyticsEvents: async () => toClientList('analyticsEvent', await prisma.analyticsEvent.findMany()),
    analyticsDaily: async () => toClientList('analyticsDaily', await prisma.analyticsDaily.findMany()),
    aiLogs: async () => toClientList('aiLog', await prisma.aiLog.findMany()),
    github: async () => toClientList('github', await prisma.gitHub.findMany()),
    contactMessages: async () => toClientList('contactMessage', await prisma.contactMessage.findMany()),
};

async function createExportZipBuffer() {
    const data = { exportedAt: new Date().toISOString() };
    for (const [key, produce] of Object.entries(COLLECTION_PRODUCERS)) {
        data[key] = await produce();
    }

    const archive = archiver('zip', { zlib: { level: 5 } });
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

    const imageFiles = new Set();
    if (data.gallery && data.gallery.length > 0) {
        for (const item of data.gallery) {
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

    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    let uploadEntries = [];
    try {
        uploadEntries = await readdir(uploadsDir, { withFileTypes: true });
    } catch {
        // uploads directory missing or unreadable
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
            // Skip missing file
        }
    }

    return new Promise((resolve, reject) => {
        const chunks = [];
        archive.on('data', (chunk) => chunks.push(chunk));
        archive.on('end', () => resolve(Buffer.concat(chunks)));
        archive.on('error', (err) => reject(err));
        archive.finalize();
    });
}

export async function executeCronJob(job) {
    const startTime = Date.now();
    let status = 'success';
    let logOutput = '';
    let requestMethod = '';
    let requestUrl = '';
    let requestUrlForLog = '';

    const maxAttempts = job.retryEnabled ? (job.retryCount ?? 3) + 1 : 1;
    const baseDelay = job.retryDelay ?? 60;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const attemptStartTime = Date.now();
        let attemptStatus = 'success';
        let attemptLogOutput;

        try {
            if (job.action === 'clean_unreferenced') {
                const auditResult = await executeUnreferencedCleanup();
                attemptLogOutput = `Cleanup completed in ${Date.now() - attemptStartTime}ms.\n` +
                            `Deleted ${auditResult.deletedCount} files, reclaiming ${auditResult.reclaimedString}.\n` +
                            `Skipped files: ${auditResult.skippedCount}.`;
            } else if (job.action === 'migrate_webp') {
                const migrationResult = await executeWebPMigration();
                attemptLogOutput = `WebP migration completed in ${Date.now() - attemptStartTime}ms.\n` +
                            `Migrated: ${migrationResult.migratedCount} images.\n` +
                            `Space saved: ${migrationResult.reclaimedString}.\n` +
                            `Details: ${JSON.stringify(migrationResult.details, null, 2)}`;
            } else if (job.action === 'uptime_check') {
                const results = await runUptimeChecks();
                const down = results.filter((r) => r.status === 'down');
                attemptLogOutput = `Uptime check completed in ${Date.now() - attemptStartTime}ms.\n` +
                            `Pinged ${results.length} endpoint(s); ${down.length} down.\n` +
                            (down.length
                                ? `Down:\n${down.map((d) => `  - ${d.label || d.target}: ${d.error || `HTTP ${d.statusCode}`}`).join('\n')}`
                                : 'All endpoints healthy.');
                if (down.length > 0) {
                    attemptStatus = 'failure';
                }
            } else if (job.action === 'prune_sessions') {
                const deleted = await pruneSessions();
                attemptLogOutput = `Session cleanup completed in ${Date.now() - attemptStartTime}ms.\n` +
                            `Deleted ${deleted} inactive session(s) older than ${SESSION_RETENTION_DAYS} day(s).`;
            } else if (job.action === 'gdrive_backup') {
                const config = await getGDriveConfig();
                const isConnected = Boolean(config.isConnected || config.refreshToken || config.accessToken);
                if (!isConnected) {
                    throw new Error('Google Drive account is not connected. Connect Google Drive in Database Admin to enable automated backups.');
                }
                const zipBuffer = await createExportZipBuffer();
                const now = new Date();
                const dateStr = now.toISOString().split('T')[0];
                const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
                const filename = `auto_backup_${dateStr}_${timeStr}.zip`;
                const uploadRes = await uploadBackupToDrive(zipBuffer, filename);
                const cleanResult = await cleanOldDriveBackups(config.retentionMonths || 1);
                attemptLogOutput = `Google Drive automated backup completed successfully. File: ${filename} (ID: ${uploadRes.id}). Cleaned ${cleanResult.deletedCount} old backup(s).`;
            } else if (job.action === 'webhook') {
                const cachedData = {};
                cachedData.env = {};
                
                // Load global environment variables
                try {
                    const globalEnvDoc = await getSingleton(prisma, 'cronEnv');
                    if (globalEnvDoc && Array.isArray(globalEnvDoc.env)) {
                        for (const env of globalEnvDoc.env) {
                            if (env.key && env.key.trim()) {
                                cachedData.env[env.key.trim()] = env.value ? decrypt(env.value) : '';
                            }
                        }
                    }
                } catch (envErr) {
                    console.error('[CRON SERVICE] Failed to load global environment variables:', envErr);
                }

                const shouldCompileUrl = job.webhookUrlType === 'expression' || hasTemplateValue(job.webhookUrl);
                const compiledUrlValue = shouldCompileUrl
                    ? await compileTemplate(job.webhookUrl, cachedData, EXEC_TEMPLATE_OPTS)
                    : job.webhookUrl;
                const compiledUrl = valueToRequestString(compiledUrlValue);
                const method = job.webhookMethod || 'POST';
                requestMethod = method;
                requestUrl = compiledUrl;
                requestUrlForLog = redactEnvSecrets(compiledUrl, cachedData.env);

                const rawHeaders = {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Aiyu-Task-Scheduler'
                };

                if (job.webhookHeaders && Array.isArray(job.webhookHeaders)) {
                    for (const header of job.webhookHeaders) {
                        if (header.key && header.key.trim()) {
                            const headerKey = job.webhookHeadersType === 'expression' || hasTemplateValue(header.key)
                                ? valueToRequestString(await compileTemplate(header.key.trim(), cachedData, EXEC_TEMPLATE_OPTS)).trim()
                                : header.key.trim();

                            if (!headerKey) continue;

                            const normalKey = Object.keys(rawHeaders).find(
                                k => k.toLowerCase() === headerKey.toLowerCase()
                            ) || headerKey;

                            rawHeaders[normalKey] = job.webhookHeadersType === 'expression' || hasTemplateValue(header.value)
                                ? valueToRequestString(await compileTemplate(header.value || '', cachedData, EXEC_TEMPLATE_OPTS))
                                : header.value || '';
                        }
                    }
                }
                const headers = Object.fromEntries(
                    Object.entries(rawHeaders).map(([key, value]) => [key, valueToRequestString(value)])
                );

                let bodyContent = undefined;
                if (method === 'POST') {
                    if (job.webhookBody !== undefined && job.webhookBody !== null && job.webhookBody.trim() !== '') {
                        if (job.webhookBodyType === 'fixed' && !hasTemplateValue(job.webhookBody)) {
                            bodyContent = job.webhookBody.trim();
                        } else {
                            const compiledBody = await compileTemplate(job.webhookBody.trim(), cachedData, EXEC_TEMPLATE_OPTS);
                            bodyContent = typeof compiledBody === 'object' ? JSON.stringify(compiledBody) : String(compiledBody);
                            
                            if (typeof compiledBody === 'object' && !Object.keys(headers).some(k => k.toLowerCase() === 'content-type')) {
                                headers['Content-Type'] = 'application/json';
                            }
                        }
                    } else {
                        bodyContent = JSON.stringify({
                            cronName: job.name,
                            triggeredAt: new Date().toISOString()
                        });
                    }
                }

                const requestLog = [
                    `Request Method: ${method}`,
                    `Request URL: ${redactEnvSecrets(compiledUrl, cachedData.env)}`,
                    shouldCompileUrl ? `Raw URL Template: ${redactEnvSecrets(job.webhookUrl, cachedData.env)}` : null,
                    `Request Headers:\n${safeLogJson(headers, cachedData.env)}`,
                    method === 'POST'
                        ? `Request Body:\n${redactEnvSecrets(bodyContent || '', cachedData.env)}`
                        : null
                ].filter(Boolean).join('\n\n');

                const res = await fetch(compiledUrl, {
                    method,
                    headers,
                    body: bodyContent
                });
                const text = await res.text();
                attemptLogOutput = `${requestLog}\n\nWebhook trigger returned HTTP status ${res.status}.\nResponse:\n${text}`;
                if (!res.ok) {
                    attemptStatus = 'failure';
                }
            } else {
                throw new Error(`Unknown action: ${job.action}`);
            }
        } catch (err) {
            attemptStatus = 'failure';
            attemptLogOutput = `Execution failed after ${Date.now() - attemptStartTime}ms.\nError: ${err.message}\nStack: ${err.stack}`;
        }

        // Add to main logOutput
        if (maxAttempts > 1) {
            logOutput += `--- Attempt ${attempt} of ${maxAttempts} ---\n${attemptLogOutput}\n\n`;
        } else {
            logOutput = attemptLogOutput;
        }

        status = attemptStatus;

        if (status === 'success') {
            break;
        }

        if (attempt < maxAttempts) {
            let nextDelay = baseDelay;
            if (job.retryType === 'exponential') {
                nextDelay = baseDelay * Math.pow(2, attempt - 1);
            }
            logOutput += `[Attempt ${attempt} failed. Retrying in ${nextDelay}s (${job.retryType} delay)...]\n\n`;
            await new Promise(resolve => setTimeout(resolve, nextDelay * 1000));
        }
    }

    // Update Cron document
    try {
        const ranAt = new Date();
        const durationMs = Date.now() - startTime;
        
        let timeZone = 'UTC';
        try {
            const config = await getSingleton(prisma, 'config');
            if (config && config.defaultTimezone) {
                timeZone = config.defaultTimezone;
            }
        } catch (configErr) {
            console.error('[CRON SERVICE] Failed to load global timezone config in execute job:', configErr);
        }

        const nextRun = getNextCronRun(job.schedule, ranAt, timeZone);
        await prisma.cron.update({
            where: { id: job.id },
            data: {
                lastRun: ranAt,
                lastRunStatus: status,
                lastRunLog: logOutput,
                nextRun
            }
        });
        await prisma.cronLog.create({ data: {
            cronId: job.id,
            cronName: job.name,
            action: job.action,
            status,
            method: requestMethod,
            url: requestUrlForLog || requestUrl,
            log: logOutput,
            durationMs,
            ranAt
        } });
        console.log(`[CRON SERVICE] Finished job: ${job.name} (${status})`);

        // Send Notification if linked & enabled
        if (job.notificationEnabled) {
            const shouldNotify = 
                job.notificationOn === 'always' ||
                (job.notificationOn === 'success' && status === 'success') ||
                (job.notificationOn === 'failure' && status === 'failure');
                
            if (shouldNotify) {
                const emoji = status === 'success' ? '✅' : '❌';
                const tag = status === 'success' ? 'white_check_mark,success' : 'x,failure';
                sendNotification({
                    title: `${emoji} Cron Job ${status.toUpperCase()}: ${job.name}`,
                    message: `Task: ${job.name}\nStatus: ${status.toUpperCase()}\n\nLogs:\n${logOutput.slice(0, 1000)}`,
                    priority: status === 'success' ? '3' : '4',
                    tags: tag
                }).catch(notifyErr => {
                    console.error('[CRON SERVICE] Failed to dispatch cron notification:', notifyErr);
                });
            }
        }
    } catch (updateErr) {
        console.error('[CRON SERVICE] Failed to update job run logs:', updateErr);
    }
}
