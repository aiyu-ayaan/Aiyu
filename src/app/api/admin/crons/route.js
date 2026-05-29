import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import dbConnect from '@/lib/db';
import Cron from '@/models/Cron';
import Config from '@/models/Config';
import { getNextCronRun, initCronRunner } from '@/utils/cronRunner';
import { encrypt, decrypt } from '@/lib/encryption';

// Initialize background Task Scheduler singleton exactly once when this isolated admin API loads
if (typeof window === 'undefined') {
    initCronRunner().catch(err => console.error('[CRON SERVICE ERROR] Failed to initialize runner:', err));
}

function hasDynamicTemplate(value) {
    if (Array.isArray(value)) {
        return value.some(item => hasDynamicTemplate(item));
    }
    if (value && typeof value === 'object') {
        return Object.values(value).some(item => hasDynamicTemplate(item));
    }
    return typeof value === 'string' && value.includes('$');
}

function resolveTemplateMode(type, value) {
    return type === 'expression' || hasDynamicTemplate(value) ? 'expression' : 'fixed';
}

// GET: Retrieve all cron jobs (Admin only)
async function getCrons(request) {
    await dbConnect();
    try {
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
        
        const config = await Config.findOne().lean();
        const timeZone = config?.defaultTimezone || 'UTC';

        for (const job of jobsToHeal) {
            job.nextRun = getNextCronRun(job.schedule, now, timeZone);
            await job.save();
        }

        const crons = await Cron.find({}).sort({ type: 1, name: 1 }).lean();
        for (const cron of crons) {
            if (cron.webhookEnv && Array.isArray(cron.webhookEnv)) {
                cron.webhookEnv = cron.webhookEnv.map(env => ({
                    key: env.key,
                    value: env.value ? decrypt(env.value) : ''
                }));
            }
        }

        return NextResponse.json({ success: true, data: crons });
    } catch (error) {
        console.error('[API CRON GET ERROR]:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// POST: Create a custom user-defined cron job (Admin only)
async function createCron(request) {
    await dbConnect();
    try {
        const body = await request.json();
        const { name, schedule, webhookUrl, webhookUrlType = 'fixed', webhookMethod = 'POST', webhookHeaders = [], webhookHeadersType = 'fixed', webhookBody = '', webhookBodyType = 'fixed', webhookEnv = [], notificationEnabled, notificationOn, retryEnabled = false, retryType = 'stable', retryCount = 3, retryDelay = 60 } = body;

        if (!name || !schedule || !webhookUrl) {
            return NextResponse.json({ success: false, error: 'Name, schedule (cron expression), and Webhook URL are required.' }, { status: 400 });
        }

        // Validate cron expression format roughly (needs to be 5 fields)
        const fields = schedule.trim().split(/\s+/);
        if (fields.length !== 5) {
            return NextResponse.json({ success: false, error: 'Invalid cron expression. Must have exactly 5 fields (minute hour day-of-month month day-of-week).' }, { status: 400 });
        }

        const config = await Config.findOne().lean();
        const timeZone = config?.defaultTimezone || 'UTC';
        const nextRun = getNextCronRun(schedule, new Date(), timeZone);

        const encryptedEnv = (webhookEnv || []).map(env => ({
            key: env.key,
            value: env.value ? encrypt(env.value) : ''
        }));
        const cleanHeaders = webhookHeaders || [];

        const newCron = await Cron.create({
            name,
            type: 'user',
            schedule,
            enabled: true,
            action: 'webhook',
            webhookUrl,
            webhookUrlType: resolveTemplateMode(webhookUrlType, webhookUrl),
            webhookMethod,
            webhookHeaders: cleanHeaders,
            webhookHeadersType: resolveTemplateMode(webhookHeadersType, cleanHeaders),
            webhookBody,
            webhookBodyType: resolveTemplateMode(webhookBodyType, webhookBody),
            webhookEnv: encryptedEnv,
            nextRun,
            notificationEnabled: notificationEnabled || false,
            notificationOn: notificationOn || 'always',
            retryEnabled,
            retryType,
            retryCount,
            retryDelay
        });

        // Decrypt values back for direct UI response compatibility
        const responseData = newCron.toObject();
        if (responseData.webhookEnv && Array.isArray(responseData.webhookEnv)) {
            responseData.webhookEnv = responseData.webhookEnv.map(env => ({
                key: env.key,
                value: env.value ? decrypt(env.value) : ''
            }));
        }

        return NextResponse.json({ success: true, data: responseData }, { status: 201 });
    } catch (error) {
        console.error('[API CRON POST ERROR]:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export const GET = withAuth(getCrons);
export const POST = withAuth(createCron);
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
