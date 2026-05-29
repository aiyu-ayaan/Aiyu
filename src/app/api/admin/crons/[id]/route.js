import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import dbConnect from '@/lib/db';
import Cron from '@/models/Cron';
import Config from '@/models/Config';
import { getNextCronRun } from '@/utils/cronRunner';
import { encrypt, decrypt } from '@/lib/encryption';

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

// PUT: Update an existing cron job (Admin only)
async function updateCron(request, { params }) {
    await dbConnect();
    try {
        const { id } = await params;
        const body = await request.json();
        const { name, schedule, enabled, webhookUrl, webhookUrlType, webhookMethod, webhookHeaders, webhookHeadersType, webhookBody, webhookBodyType, webhookEnv, notificationEnabled, notificationOn, retryEnabled, retryType, retryCount, retryDelay } = body;

        const config = await Config.findOne().lean();
        const timeZone = config?.defaultTimezone || 'UTC';

        const cronJob = await Cron.findById(id);
        if (!cronJob) {
            return NextResponse.json({ success: false, error: 'Cron job not found.' }, { status: 404 });
        }

        // Validate schedule format if changed
        if (schedule && schedule !== cronJob.schedule) {
            const fields = schedule.trim().split(/\s+/);
            if (fields.length !== 5) {
                return NextResponse.json({ success: false, error: 'Invalid cron expression. Must have exactly 5 fields.' }, { status: 400 });
            }
            cronJob.schedule = schedule;
            cronJob.nextRun = getNextCronRun(schedule, new Date(), timeZone);
        }

        if (name && cronJob.type === 'user') {
            cronJob.name = name;
        }

        if (enabled !== undefined) {
            cronJob.enabled = enabled;
            if (enabled) {
                cronJob.nextRun = getNextCronRun(cronJob.schedule, new Date(), timeZone);
            } else {
                cronJob.nextRun = null;
            }
        }

        if (notificationEnabled !== undefined) {
            cronJob.notificationEnabled = notificationEnabled;
        }

        if (notificationOn !== undefined) {
            cronJob.notificationOn = notificationOn;
        }

        if (retryEnabled !== undefined) {
            cronJob.retryEnabled = retryEnabled;
        }

        if (retryType !== undefined) {
            cronJob.retryType = retryType;
        }

        if (retryCount !== undefined) {
            cronJob.retryCount = retryCount;
        }

        if (retryDelay !== undefined) {
            cronJob.retryDelay = retryDelay;
        }

        if (cronJob.type === 'user') {
            if (webhookUrl) cronJob.webhookUrl = webhookUrl;
            if (webhookUrlType !== undefined || webhookUrl !== undefined) {
                cronJob.webhookUrlType = resolveTemplateMode(webhookUrlType, webhookUrl ?? cronJob.webhookUrl);
            }
            if (webhookMethod) cronJob.webhookMethod = webhookMethod;
            if (webhookHeaders !== undefined) cronJob.webhookHeaders = webhookHeaders;
            if (webhookHeadersType !== undefined || webhookHeaders !== undefined) {
                cronJob.webhookHeadersType = resolveTemplateMode(webhookHeadersType, webhookHeaders ?? cronJob.webhookHeaders);
            }
            if (webhookBody !== undefined) cronJob.webhookBody = webhookBody;
            if (webhookBodyType !== undefined || webhookBody !== undefined) {
                cronJob.webhookBodyType = resolveTemplateMode(webhookBodyType, webhookBody ?? cronJob.webhookBody);
            }
            if (webhookEnv !== undefined) {
                cronJob.webhookEnv = (webhookEnv || []).map(env => ({
                    key: env.key,
                    value: env.value ? encrypt(env.value) : ''
                }));
            }
        }

        await cronJob.save();
        const responseData = cronJob.toObject();
        if (responseData.webhookEnv && Array.isArray(responseData.webhookEnv)) {
            responseData.webhookEnv = responseData.webhookEnv.map(env => ({
                key: env.key,
                value: env.value ? decrypt(env.value) : ''
            }));
        }

        return NextResponse.json({ success: true, data: responseData });
    } catch (error) {
        console.error('[API CRON PUT ERROR]:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// DELETE: Delete a user-defined cron job (Admin only, System jobs are protected)
async function deleteCron(request, { params }) {
    await dbConnect();
    try {
        const { id } = await params;
        const cronJob = await Cron.findById(id);

        if (!cronJob) {
            return NextResponse.json({ success: false, error: 'Cron job not found.' }, { status: 404 });
        }

        if (cronJob.type === 'system') {
            return NextResponse.json({ success: false, error: 'System defined tasks cannot be deleted.' }, { status: 403 });
        }

        await Cron.findByIdAndDelete(id);
        return NextResponse.json({ success: true, message: 'Cron job deleted successfully.' });
    } catch (error) {
        console.error('[API CRON DELETE ERROR]:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export const PUT = withAuth(updateCron);
export const DELETE = withAuth(deleteCron);
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
