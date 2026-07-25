import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSingleton } from '@/lib/serialize';
import { getNextCronRun } from '@/utils/cronRunner';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const job = await prisma.cron.findFirst({ where: { action: 'gdrive_backup' } });

    return NextResponse.json({
      success: true,
      enabled: job ? job.enabled : false,
      schedule: job ? job.schedule : '0 0 * * *',
      lastRun: job ? job.lastRun : null,
      nextRun: job ? job.nextRun : null,
      cronId: job ? job.id : null,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch Google Drive backup cron status' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

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

    return NextResponse.json({
      success: true,
      enabled: job.enabled,
      schedule: job.schedule,
      lastRun: job.lastRun,
      nextRun: job.nextRun,
      cronId: job.id,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update Google Drive backup cron status' },
      { status: 500 }
    );
  }
}
