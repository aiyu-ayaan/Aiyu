import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';
import { getSingleton, upsertSingleton } from '@/lib/serialize';

const DEFAULT_NOTIFICATION_CONFIG = {
    enabled: false,
    ntfy: { enabled: false, serverUrl: 'https://ntfy.sh', topic: '', token: '' },
    telegram: { enabled: false, botToken: '', chatId: '' },
    discord: { enabled: false, webhookUrl: '' },
    notifyOnContactMessage: false,
};

// GET: Retrieve Notification Configuration (Admin only)
async function getNotificationConfig(request) {
    try {
        let config = await getSingleton(prisma, 'notificationConfig');
        if (!config) {
            // Seed a default disabled config if none exists
            config = await upsertSingleton(prisma, 'notificationConfig', DEFAULT_NOTIFICATION_CONFIG);
        }
        return NextResponse.json({ success: true, data: config });
    } catch (error) {
        console.error('[API NOTIFICATION GET ERROR]:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// PUT: Update Notification Configuration (Admin only)
async function updateNotificationConfig(request) {
    try {
        const body = await request.json();

        const current = (await getSingleton(prisma, 'notificationConfig')) || DEFAULT_NOTIFICATION_CONFIG;
        const merged = {
            ...current,
            ntfy: { ...DEFAULT_NOTIFICATION_CONFIG.ntfy, ...(current.ntfy || {}) },
            telegram: { ...DEFAULT_NOTIFICATION_CONFIG.telegram, ...(current.telegram || {}) },
            discord: { ...DEFAULT_NOTIFICATION_CONFIG.discord, ...(current.discord || {}) },
        };

        // Deep merge updates
        if (body.enabled !== undefined) merged.enabled = body.enabled;

        if (body.ntfy) {
            if (body.ntfy.enabled !== undefined) merged.ntfy.enabled = body.ntfy.enabled;
            if (body.ntfy.serverUrl !== undefined) merged.ntfy.serverUrl = body.ntfy.serverUrl;
            if (body.ntfy.topic !== undefined) merged.ntfy.topic = body.ntfy.topic;
            if (body.ntfy.token !== undefined) merged.ntfy.token = body.ntfy.token;
        }

        if (body.telegram) {
            if (body.telegram.enabled !== undefined) merged.telegram.enabled = body.telegram.enabled;
            if (body.telegram.botToken !== undefined) merged.telegram.botToken = body.telegram.botToken;
            if (body.telegram.chatId !== undefined) merged.telegram.chatId = body.telegram.chatId;
        }

        if (body.discord) {
            if (body.discord.enabled !== undefined) merged.discord.enabled = body.discord.enabled;
            if (body.discord.webhookUrl !== undefined) merged.discord.webhookUrl = body.discord.webhookUrl;
        }

        if (body.notifyOnContactMessage !== undefined) {
            merged.notifyOnContactMessage = body.notifyOnContactMessage;
        }

        const config = await upsertSingleton(prisma, 'notificationConfig', merged);
        return NextResponse.json({ success: true, data: config });
    } catch (error) {
        console.error('[API NOTIFICATION PUT ERROR]:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export const GET = withAuth(getNotificationConfig);
export const PUT = withAuth(updateNotificationConfig);
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
