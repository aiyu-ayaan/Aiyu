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

    const backupJob = await prisma.cron.findFirst({ where: { action: 'gdrive_backup' } });
    const purgeJob = await prisma.cron.findFirst({ where: { action: 'gdrive_purge' } });

    return NextResponse.json({
      success: true,
      backup: {
        enabled: backupJob ? backupJob.enabled : false,
        schedule: backupJob ? backupJob.schedule : '0 0 * * *',
        lastRun: backupJob ? backupJob.lastRun : null,
        nextRun: backupJob ? backupJob.nextRun : null,
        cronId: backupJob ? backupJob.id : null,
      },
      purge: {
        enabled: purgeJob ? purgeJob.enabled : false,
        schedule: purgeJob ? purgeJob.schedule : '0 3 * * *',
        lastRun: purgeJob ? purgeJob.lastRun : null,
        nextRun: purgeJob ? purgeJob.nextRun : null,
        cronId: purgeJob ? purgeJob.id : null,
      },
      // Legacy compatibility keys for backup
      enabled: backupJob ? backupJob.enabled : false,
      schedule: backupJob ? backupJob.schedule : '0 0 * * *',
      lastRun: backupJob ? backupJob.lastRun : null,
      nextRun: backupJob ? backupJob.nextRun : null,
      cronId: backupJob ? backupJob.id : null,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch Google Drive cron status' },
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
    const { action = 'gdrive_backup', enabled, schedule } = body;
    const targetAction = action === 'gdrive_purge' ? 'gdrive_purge' : 'gdrive_backup';
    const defaultSchedule = targetAction === 'gdrive_purge' ? '0 3 * * *' : '0 0 * * *';
    const defaultName = targetAction === 'gdrive_purge' ? 'Google Drive Auto-Delete Purge' : 'Google Drive Automated Backup';

    let job = await prisma.cron.findFirst({ where: { action: targetAction } });
    const config = await getSingleton(prisma, 'config');
    const timeZone = config?.defaultTimezone || 'UTC';

    const cronSchedule = schedule || job?.schedule || defaultSchedule;
    const isEnabled = enabled !== undefined ? Boolean(enabled) : (job ? job.enabled : false);
    const nextRun = isEnabled ? getNextCronRun(cronSchedule, new Date(), timeZone) : null;

    if (!job) {
      job = await prisma.cron.create({
        data: {
          name: defaultName,
          type: 'system',
          schedule: cronSchedule,
          enabled: isEnabled,
          action: targetAction,
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
      action: targetAction,
      enabled: job.enabled,
      schedule: job.schedule,
      lastRun: job.lastRun,
      nextRun: job.nextRun,
      cronId: job.id,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update Google Drive cron status' },
      { status: 500 }
    );
  }
}
