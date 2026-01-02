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
                // Prepare headers with auth
                const authKey = process.env.BLOG_API_KEY || process.env.JWT_SECRET;
                const headers = {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                };

                // Add Authorization header if auth key exists
                if (authKey) {
                    headers['Authorization'] = `Bearer ${authKey}`;
                }

                // Send data with sender name and content as body
                const webhookResponse = await fetch(config.n8nWebhookUrl, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        sender: name,
                        email: email,
                        content: message,
                        timestamp: new Date().toISOString()
                    }),
                });

                if (webhookResponse.ok) {
                    console.log('✅ n8n webhook triggered successfully');
                } else {
                    console.error('❌ n8n webhook failed with status:', webhookResponse.status);
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
        await dbConnect();
        const messages = await ContactMessage.find().sort({ createdAt: -1 });
        return NextResponse.json({ success: true, data: messages }, { status: 200 });
    } catch (error) {
        console.error('Failed to fetch messages:', error);
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
        }

        await ContactMessage.findByIdAndDelete(id);

        return NextResponse.json({ success: true, message: 'Message deleted' }, { status: 200 });
    } catch (error) {
        console.error('Failed to delete message:', error);
        return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
    }
}
