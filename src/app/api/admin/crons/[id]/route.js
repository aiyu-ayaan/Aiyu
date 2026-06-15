import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';
import { getSingleton, toClient } from '@/lib/serialize';
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
    try {
        const { id } = await params;
        const body = await request.json();
        const { name, schedule, enabled, webhookUrl, webhookUrlType, webhookMethod, webhookHeaders, webhookHeadersType, webhookBody, webhookBodyType, webhookEnv, notificationEnabled, notificationOn, retryEnabled, retryType, retryCount, retryDelay } = body;

        const config = await getSingleton(prisma, 'config');
        const timeZone = config?.defaultTimezone || 'UTC';

        const existing = await prisma.cron.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json({ success: false, error: 'Cron job not found.' }, { status: 404 });
        }

        const data = {};
        let effectiveSchedule = existing.schedule;

        // Validate schedule format if changed
        if (schedule && schedule !== existing.schedule) {
            const fields = schedule.trim().split(/\s+/);
            if (fields.length !== 5) {
                return NextResponse.json({ success: false, error: 'Invalid cron expression. Must have exactly 5 fields.' }, { status: 400 });
            }
            data.schedule = schedule;
            effectiveSchedule = schedule;
            data.nextRun = getNextCronRun(schedule, new Date(), timeZone);
        }

        if (name && existing.type === 'user') {
            data.name = name;
        }

        if (enabled !== undefined) {
            data.enabled = enabled;
            data.nextRun = enabled ? getNextCronRun(effectiveSchedule, new Date(), timeZone) : null;
        }

        if (notificationEnabled !== undefined) data.notificationEnabled = notificationEnabled;
        if (notificationOn !== undefined) data.notificationOn = notificationOn;
        if (retryEnabled !== undefined) data.retryEnabled = retryEnabled;
        if (retryType !== undefined) data.retryType = retryType;
        if (retryCount !== undefined) data.retryCount = retryCount;
        if (retryDelay !== undefined) data.retryDelay = retryDelay;

        if (existing.type === 'user') {
            if (webhookUrl) data.webhookUrl = webhookUrl;
            if (webhookUrlType !== undefined || webhookUrl !== undefined) {
                data.webhookUrlType = resolveTemplateMode(webhookUrlType, webhookUrl ?? existing.webhookUrl);
            }
            if (webhookMethod) data.webhookMethod = webhookMethod;
            if (webhookHeaders !== undefined) data.webhookHeaders = webhookHeaders;
            if (webhookHeadersType !== undefined || webhookHeaders !== undefined) {
                data.webhookHeadersType = resolveTemplateMode(webhookHeadersType, webhookHeaders ?? existing.webhookHeaders);
            }
            if (webhookBody !== undefined) data.webhookBody = webhookBody;
            if (webhookBodyType !== undefined || webhookBody !== undefined) {
                data.webhookBodyType = resolveTemplateMode(webhookBodyType, webhookBody ?? existing.webhookBody);
            }
            if (webhookEnv !== undefined) {
                data.webhookEnv = (webhookEnv || []).map(env => ({
                    key: env.key,
                    value: env.value ? encrypt(env.value) : ''
                }));
            }
        }

        const updated = await prisma.cron.update({ where: { id }, data });
        const responseData = toClient('cron', updated);
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
    try {
        const { id } = await params;
        const cronJob = await prisma.cron.findUnique({ where: { id } });

        if (!cronJob) {
            return NextResponse.json({ success: false, error: 'Cron job not found.' }, { status: 404 });
        }

        if (cronJob.type === 'system') {
            return NextResponse.json({ success: false, error: 'System defined tasks cannot be deleted.' }, { status: 403 });
        }

        await prisma.cron.delete({ where: { id } });
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
