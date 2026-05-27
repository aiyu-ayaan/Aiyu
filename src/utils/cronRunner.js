import dbConnect from '@/lib/db';
import Cron from '@/models/Cron';
import { executeUnreferencedCleanup, executeWebPMigration } from '@/lib/storageAudit';
import { sendNotification } from './notificationService';

// Dynamic variables query models
import Blog from '@/models/Blog';
import Project from '@/models/Project';
import Gallery from '@/models/Gallery';
import Config from '@/models/Config';
import About from '@/models/About';
import Ads from '@/models/Ads';
import Social from '@/models/Social';
import Theme from '@/models/Theme';
import ContactMessage from '@/models/ContactMessage';
import Deployment from '@/models/Deployment';

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

export function isCronDue(cronExpression, date = new Date()) {
    const fields = cronExpression.trim().split(/\s+/);
    if (fields.length !== 5) return false;
    
    const [minExp, hourExp, domExp, monthExp, dowExp] = fields;
    
    const minutes = parseCronField(minExp, 0, 59);
    const hours = parseCronField(hourExp, 0, 23);
    const doms = parseCronField(domExp, 1, 31);
    const months = parseCronField(monthExp, 1, 12);
    const dows = parseCronField(dowExp, 0, 6).map(v => v === 7 ? 0 : v);
    
    const currentMin = date.getMinutes();
    const currentHour = date.getHours();
    const currentDom = date.getDate();
    const currentMonth = date.getMonth() + 1;
    const currentDow = date.getDay();
    
    return minutes.includes(currentMin) &&
           hours.includes(currentHour) &&
           doms.includes(currentDom) &&
           months.includes(currentMonth) &&
           dows.includes(currentDow);
}

export function getNextCronRun(cronExpression, startDate = new Date()) {
    const checkDate = new Date(startDate.getTime());
    checkDate.setSeconds(0, 0);
    
    for (let i = 0; i < 14400; i++) { // Max 10 days
        checkDate.setMinutes(checkDate.getMinutes() + 1);
        if (isCronDue(cronExpression, checkDate)) {
            return checkDate;
        }
    }
    return null;
}

export async function initCronRunner() {
    if (global.cronIntervalStarted) return;
    global.cronIntervalStarted = true;

    console.log('[CRON SERVICE] Initializing task scheduler...');
    await dbConnect();

    // Seed system cron jobs
    try {
        const cleanupJob = await Cron.findOne({ action: 'clean_unreferenced' });
        if (!cleanupJob) {
            await Cron.create({
                name: 'Unreferenced Uploads Cleanup',
                type: 'system',
                schedule: '0 2 * * *', // Daily at 2:00 AM
                enabled: true,
                action: 'clean_unreferenced',
                nextRun: getNextCronRun('0 2 * * *', new Date())
            });
            console.log('[CRON SERVICE] Seeded: Unreferenced Uploads Cleanup');
        }

        const webpJob = await Cron.findOne({ action: 'migrate_webp' });
        if (!webpJob) {
            await Cron.create({
                name: 'WebP Image Migration',
                type: 'system',
                schedule: '0 3 * * *', // Daily at 3:00 AM
                enabled: true,
                action: 'migrate_webp',
                nextRun: getNextCronRun('0 3 * * *', new Date())
            });
            console.log('[CRON SERVICE] Seeded: WebP Image Migration');
        }

        // Self-heal and recalculate missing or outdated nextRun timestamps
        const now = new Date();
        const jobsToHeal = await Cron.find({
            enabled: true,
            $or: [
                { nextRun: null },
                { nextRun: { $exists: false } },
                { nextRun: { $lt: now } }
            ]
        });
        for (const job of jobsToHeal) {
            job.nextRun = getNextCronRun(job.schedule, now);
            await job.save();
            console.log(`[CRON SERVICE] Self-healed nextRun for task: ${job.name} -> ${job.nextRun}`);
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
        await dbConnect();
        const activeJobs = await Cron.find({ enabled: true });
        const now = new Date();

        for (const job of activeJobs) {
            if (isCronDue(job.schedule, now)) {
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

function getValueByPath(obj, path) {
    if (!path) return obj;
    const cleanPath = path
        .replace(/\[['"]?([^'"\]]+)['"]?\]/g, '.$1')
        .replace(/^\./, '');
    
    const parts = cleanPath.split('.');
    let current = obj;
    for (const part of parts) {
        if (current === null || current === undefined) return undefined;
        current = current[part];
    }
    return current;
}

async function resolvePlaceholder(modelName, path, cachedData) {
    const lowerModel = modelName.toLowerCase();
    
    if (lowerModel === 'time' || lowerModel === 'timestamp') {
        return new Date().toISOString();
    }
    if (lowerModel === 'date') {
        return new Date().toLocaleDateString();
    }

    const modelMapping = {
        blogs: { model: Blog, query: () => Blog.find({}).sort({ createdAt: -1 }).lean() },
        blog: { model: Blog, query: () => Blog.find({}).sort({ createdAt: -1 }).lean() },
        projects: { model: Project, query: () => Project.find({}).sort({ order: 1 }).lean() },
        project: { model: Project, query: () => Project.find({}).sort({ order: 1 }).lean() },
        gallery: { model: Gallery, query: () => Gallery.find({}).sort({ order: 1 }).lean() },
        config: { model: Config, query: () => Config.findOne({}).lean() },
        about: { model: About, query: () => About.findOne({}).lean() },
        ads: { model: Ads, query: () => Ads.findOne({}).lean() },
        socials: { model: Social, query: () => Social.find({}).lean() },
        social: { model: Social, query: () => Social.find({}).lean() },
        theme: { model: Theme, query: () => Theme.findOne({}).lean() },
        themes: { model: Theme, query: () => Theme.findOne({}).lean() },
        messages: { model: ContactMessage, query: () => ContactMessage.find({}).sort({ createdAt: -1 }).lean() },
        message: { model: ContactMessage, query: () => ContactMessage.find({}).sort({ createdAt: -1 }).lean() },
        deployments: { model: Deployment, query: () => Deployment.find({}).sort({ order: 1 }).lean() },
        deployment: { model: Deployment, query: () => Deployment.find({}).sort({ order: 1 }).lean() },
        crons: { model: Cron, query: () => Cron.find({}).lean() },
        cron: { model: Cron, query: () => Cron.find({}).lean() }
    };

    if (modelMapping[lowerModel]) {
        if (!cachedData[lowerModel]) {
            try {
                await dbConnect();
                cachedData[lowerModel] = await modelMapping[lowerModel].query();
            } catch (err) {
                console.error(`[CRON TEMPLATE ERROR] Failed to fetch model data for ${lowerModel}:`, err);
                cachedData[lowerModel] = null;
            }
        }
        return getValueByPath(cachedData[lowerModel], path);
    }

    return `$${modelName}${path}`;
}

export async function compileTemplate(templateStr, cachedData) {
    if (typeof templateStr !== 'string') return templateStr;
    if (!templateStr.includes('$')) return templateStr;

    const singlePlaceholderMatch = templateStr.match(/^\$([a-zA-Z0-9_]+)([\.\[\]'"\-a-zA-Z0-9_]*)$/);
    if (singlePlaceholderMatch) {
        return resolvePlaceholder(singlePlaceholderMatch[1], singlePlaceholderMatch[2], cachedData);
    }

    const regex = /\$([a-zA-Z0-9_]+)([\.\[\]'"\-a-zA-Z0-9_]*)/g;
    let match;
    let result = templateStr;
    const matches = [];
    while ((match = regex.exec(templateStr)) !== null) {
        matches.push({
            full: match[0],
            model: match[1],
            path: match[2],
            index: match.index
        });
    }

    for (let i = matches.length - 1; i >= 0; i--) {
        const m = matches[i];
        const val = await resolvePlaceholder(m.model, m.path, cachedData);
        const replacement = typeof val === 'object' ? JSON.stringify(val) : String(val ?? '');
        result = result.slice(0, m.index) + replacement + result.slice(m.index + m.full.length);
    }

    return result;
}

async function compileTemplateObject(obj, cachedData) {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') {
        return compileTemplate(obj, cachedData);
    }
    if (Array.isArray(obj)) {
        const compiledArray = [];
        for (const item of obj) {
            compiledArray.push(await compileTemplateObject(item, cachedData));
        }
        return compiledArray;
    }
    if (typeof obj === 'object') {
        const compiledObj = {};
        for (const key of Object.keys(obj)) {
            compiledObj[key] = await compileTemplateObject(obj[key], cachedData);
        }
        return compiledObj;
    }
    return obj;
}

export async function executeCronJob(job) {
    const startTime = Date.now();
    let status = 'success';
    let logOutput = '';

    try {
        if (job.action === 'clean_unreferenced') {
            const auditResult = await executeUnreferencedCleanup();
            logOutput = `Cleanup completed in ${Date.now() - startTime}ms.\n` +
                        `Deleted ${auditResult.deletedCount} files, reclaiming ${auditResult.reclaimedString}.\n` +
                        `Skipped files: ${auditResult.skippedCount}.`;
        } else if (job.action === 'migrate_webp') {
            const migrationResult = await executeWebPMigration();
            logOutput = `WebP migration completed in ${Date.now() - startTime}ms.\n` +
                        `Migrated: ${migrationResult.migratedCount} images.\n` +
                        `Space saved: ${migrationResult.reclaimedString}.\n` +
                        `Details: ${JSON.stringify(migrationResult.details, null, 2)}`;
        } else if (job.action === 'webhook') {
            const cachedData = {};
            const compiledUrl = await compileTemplate(job.webhookUrl, cachedData);
            const method = job.webhookMethod || 'POST';

            const rawHeaders = {
                'Content-Type': 'application/json',
                'User-Agent': 'Aiyu-Task-Scheduler'
            };

            if (job.webhookHeaders && Array.isArray(job.webhookHeaders)) {
                for (const header of job.webhookHeaders) {
                    if (header.key && header.key.trim()) {
                        const normalKey = Object.keys(rawHeaders).find(
                            k => k.toLowerCase() === header.key.trim().toLowerCase()
                        ) || header.key.trim();
                        rawHeaders[normalKey] = header.value || '';
                    }
                }
            }
            const headers = await compileTemplateObject(rawHeaders, cachedData);

            let bodyContent = undefined;
            if (method === 'POST') {
                if (job.webhookBody !== undefined && job.webhookBody !== null && job.webhookBody.trim() !== '') {
                    if (job.webhookBodyType === 'fixed') {
                        bodyContent = job.webhookBody.trim();
                    } else {
                        const compiledBody = await compileTemplate(job.webhookBody.trim(), cachedData);
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

            const res = await fetch(compiledUrl, {
                method,
                headers,
                body: bodyContent
            });
            const text = await res.text();
            logOutput = `Webhook trigger returned HTTP status ${res.status}.\nResponse (truncated): ${text.slice(0, 500)}`;
            if (!res.ok) {
                status = 'failure';
            }
        } else {
            throw new Error(`Unknown action: ${job.action}`);
        }
    } catch (err) {
        status = 'failure';
        logOutput = `Execution failed after ${Date.now() - startTime}ms.\nError: ${err.message}\nStack: ${err.stack}`;
    }

    // Update Cron document
    try {
        const nextRun = getNextCronRun(job.schedule, new Date());
        await Cron.findByIdAndUpdate(job._id, {
            lastRun: new Date(),
            lastRunStatus: status,
            lastRunLog: logOutput,
            nextRun
        });
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
