import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';
import { getSingleton, upsertSingleton } from '@/lib/serialize';
import { getNextCronRun } from '@/utils/cronRunner';

// GET: Fetch current default timezone
async function getCronTimezone(request) {
    try {
        const config = await getSingleton(prisma, 'config');
        return NextResponse.json({ success: true, timezone: config?.defaultTimezone || 'UTC' });
    } catch (error) {
        console.error('[API CRON TIMEZONE GET ERROR]:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// POST: Save new default timezone and recalculate active schedules
async function saveCronTimezone(request) {
    try {
        const body = await request.json();
        const { timezone } = body;

        if (!timezone) {
            return NextResponse.json({ success: false, error: 'Timezone is required.' }, { status: 400 });
        }

        // Validate timezone string validity
        try {
            Intl.DateTimeFormat(undefined, { timeZone: timezone });
        } catch (e) {
            return NextResponse.json({ success: false, error: 'Invalid timezone identifier.' }, { status: 400 });
        }

        await upsertSingleton(prisma, 'config', { defaultTimezone: timezone });

        // Recalculate nextRun for all active enabled cron jobs
        const now = new Date();
        const activeJobs = await prisma.cron.findMany({ where: { enabled: true } });
        for (const job of activeJobs) {
            await prisma.cron.update({
                where: { id: job.id },
                data: { nextRun: getNextCronRun(job.schedule, now, timezone) },
            });
        }

        return NextResponse.json({ success: true, timezone });
    } catch (error) {
        console.error('[API CRON TIMEZONE POST ERROR]:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export const GET = withAuth(getCronTimezone);
export const POST = withAuth(saveCronTimezone);
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
