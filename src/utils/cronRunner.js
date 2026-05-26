import dbConnect from '@/lib/db';
import Cron from '@/models/Cron';
import { executeUnreferencedCleanup, executeWebPMigration } from '@/lib/storageAudit';

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
                action: 'clean_unreferenced'
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
                action: 'migrate_webp'
            });
            console.log('[CRON SERVICE] Seeded: WebP Image Migration');
        }
    } catch (err) {
        console.error('[CRON SERVICE] Failed to seed system jobs:', err);
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
            const method = job.webhookMethod || 'POST';
            const res = await fetch(job.webhookUrl, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Aiyu-Task-Scheduler'
                },
                body: method === 'POST' ? JSON.stringify({
                    cronName: job.name,
                    triggeredAt: new Date().toISOString()
                }) : undefined
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
    } catch (updateErr) {
        console.error('[CRON SERVICE] Failed to update job run logs:', updateErr);
    }
}
