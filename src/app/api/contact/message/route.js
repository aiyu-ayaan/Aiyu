import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSingleton, toClientList, fromClient } from '@/lib/serialize';
import { sendNotification } from '@/utils/notificationService';

export async function POST(request) {
    try {
        const body = await request.json();
        const { name, email, message } = body;

        if (!name || !email || !message) {
            return NextResponse.json(
                { error: 'Name, email, and message are required' },
                { status: 400 }
            );
        }

        // 1. Save to Database
        await prisma.contactMessage.create({
            data: fromClient('contactMessage', { name, email, message }, { keepId: false }),
        });

        // 1.5. Dispatch Notification Integrations if enabled
        try {
            const notifConfig = await getSingleton(prisma, 'notificationConfig');
            if (notifConfig && notifConfig.enabled && notifConfig.notifyOnContactMessage) {
                const title = `📧 New Contact Message: ${name}`;
                const text = `From: ${name} <${email}>\n\nMessage:\n${message}`;
                await sendNotification({
                    title,
                    message: text,
                    priority: '4', // High priority
                    tags: 'email,envelope,incoming_envelope'
                });
                console.log('✅ Contact form notification dispatched successfully.');
            }
        } catch (notifErr) {
            console.error('❌ Failed to trigger contact form notifications:', notifErr.message);
        }

        // 2. Check for n8n Webhook and forward if exists and enabled
        const config = await getSingleton(prisma, 'config');
        if (config?.n8nWebhookEnabled && config?.n8nWebhookUrl) {
            try {
                const payload = {
                    sender: name,
                    email: email,
                    content: message,
                    timestamp: new Date().toISOString()
                };

                const headers = {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'AiyuPortfolio/1.0'
                };

                // Add n8n webhook auth header if configured
                if (config.n8nWebhookAuthKey) {
                    // Using standard 'Authorization' header with the stored token value
                    headers['Authorization'] = config.n8nWebhookAuthKey;
                }

                const webhookResponse = await fetch(config.n8nWebhookUrl, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(payload),
                });

                if (webhookResponse.ok) {
                    console.log('✅ n8n webhook triggered successfully');
                } else {
                    const responseBody = await webhookResponse.text();
                    console.error('❌ n8n webhook failed with status:', webhookResponse.status);
                    console.error('Response:', responseBody);
                }
            } catch (webhookError) {
                console.error('❌ Failed to trigger n8n webhook:', webhookError.message);
                // We don't fail the request if webhook fails, just log it
            }
        }

        return NextResponse.json(
            { success: true, message: 'Message sent successfully' },
            { status: 201 }
        );

    } catch (error) {
        console.error('Contact form error:', error);
        return NextResponse.json(
            { error: 'Failed to send message' },
            { status: 500 }
        );
    }
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const requestedLimit = Number.parseInt(searchParams.get('limit') || '100', 10);
        const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 500) : 100;

        const messages = await prisma.contactMessage.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
        return NextResponse.json({ success: true, data: toClientList('contactMessage', messages) }, { status: 200 });
    } catch (error) {
        console.error('Failed to fetch messages:', error);
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
        }

        // deleteMany is a no-op (no throw) when the id does not exist, matching
        // the previous findByIdAndDelete behaviour that ignored a missing doc.
        await prisma.contactMessage.deleteMany({ where: { id } });

        return NextResponse.json({ success: true, message: 'Message deleted' }, { status: 200 });
    } catch (error) {
        console.error('Failed to delete message:', error);
        return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
    }
}
