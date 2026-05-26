import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import dbConnect from '@/lib/db';
import NotificationConfig from '@/models/NotificationConfig';

// GET: Retrieve Notification Configuration (Admin only)
async function getNotificationConfig(request) {
    await dbConnect();
    try {
        let config = await NotificationConfig.findOne({});
        if (!config) {
            // Seed a default disabled config if none exists
            config = await NotificationConfig.create({
                enabled: false,
                ntfy: { enabled: false, serverUrl: 'https://ntfy.sh', topic: '', token: '' },
                telegram: { enabled: false, botToken: '', chatId: '' },
                discord: { enabled: false, webhookUrl: '' },
                notifyOnContactMessage: false
            });
        }
        return NextResponse.json({ success: true, data: config });
    } catch (error) {
        console.error('[API NOTIFICATION GET ERROR]:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// PUT: Update Notification Configuration (Admin only)
async function updateNotificationConfig(request) {
    await dbConnect();
    try {
        const body = await request.json();
        
        let config = await NotificationConfig.findOne({});
        if (!config) {
            config = new NotificationConfig();
        }

        // Deep merge updates
        if (body.enabled !== undefined) config.enabled = body.enabled;
        
        if (body.ntfy) {
            if (body.ntfy.enabled !== undefined) config.ntfy.enabled = body.ntfy.enabled;
            if (body.ntfy.serverUrl !== undefined) config.ntfy.serverUrl = body.ntfy.serverUrl;
            if (body.ntfy.topic !== undefined) config.ntfy.topic = body.ntfy.topic;
            if (body.ntfy.token !== undefined) config.ntfy.token = body.ntfy.token;
        }

        if (body.telegram) {
            if (body.telegram.enabled !== undefined) config.telegram.enabled = body.telegram.enabled;
            if (body.telegram.botToken !== undefined) config.telegram.botToken = body.telegram.botToken;
            if (body.telegram.chatId !== undefined) config.telegram.chatId = body.telegram.chatId;
        }

        if (body.discord) {
            if (body.discord.enabled !== undefined) config.discord.enabled = body.discord.enabled;
            if (body.discord.webhookUrl !== undefined) config.discord.webhookUrl = body.discord.webhookUrl;
        }

        if (body.notifyOnContactMessage !== undefined) {
            config.notifyOnContactMessage = body.notifyOnContactMessage;
        }

        await config.save();
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
