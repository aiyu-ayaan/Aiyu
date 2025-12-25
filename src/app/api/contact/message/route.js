import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ContactMessage from '@/models/ContactMessage';
import Config from '@/models/Config';

export async function POST(request) {
    try {
        await dbConnect();
        const body = await request.json();
        const { name, email, message } = body;

        if (!name || !email || !message) {
            return NextResponse.json(
                { error: 'Name, email, and message are required' },
                { status: 400 }
            );
        }

        // 1. Save to Database
        const newMessage = await ContactMessage.create({
            name,
            email,
            message,
        });

        // 2. Check for n8n Webhook and forward if exists
        const config = await Config.findOne().lean();
        if (config?.n8nWebhookUrl) {
            try {
                // Determine if webhook requires raw body or specific structure
                // Defaulting to sending the collected data
                await fetch(config.n8nWebhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'contact_form_submission',
                        data: { name, email, message, createdAt: newMessage.createdAt },
                    }),
                });
            } catch (webhookError) {
                console.error('Failed to trigger n8n webhook:', webhookError);
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
