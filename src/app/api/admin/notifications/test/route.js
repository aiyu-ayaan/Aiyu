import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';

// Safely encodes HTTP headers containing unicode characters using MIME Base64 (RFC 2047) to avoid WHATWG fetch ByteString TypeErrors
function encodeMimeHeader(str) {
    if (!str) return '';
    let isAscii = true;
    for (let i = 0; i < str.length; i++) {
        if (str.charCodeAt(i) > 127) {
            isAscii = false;
            break;
        }
    }
    if (isAscii) return str;
    const base64 = Buffer.from(str, 'utf-8').toString('base64');
    return `=?utf-8?B?${base64}?=`;
}

// POST: Dispatch a direct live test notification without saving to DB first!
async function testNotification(request) {
    try {
        const body = await request.json();
        const { channel, ntfy, telegram, discord } = body;

        const title = `🔔 Aiyu Integration Live Test`;
        const message = `Congratulations! Your ${channel.toUpperCase()} notification channel is successfully linked to your portfolio command center.`;

        if (channel === 'ntfy') {
            if (!ntfy || !ntfy.topic) {
                return NextResponse.json({ success: false, error: 'ntfy Topic is required for testing.' }, { status: 400 });
            }
            const server = ntfy.serverUrl || 'https://ntfy.sh';
            const url = `${server.replace(/\/$/, '')}/${ntfy.topic}`;
            const headers = {
                'Title': encodeMimeHeader(title),
                'Priority': '4',
                'Tags': 'bell,tada,partying_face'
            };
            if (ntfy.token) {
                headers['Authorization'] = `Bearer ${ntfy.token}`;
            }

            const res = await fetch(url, {
                method: 'POST',
                headers,
                body: message
            });

            if (!res.ok) {
                const text = await res.text();
                return NextResponse.json({ success: false, error: `ntfy server returned error (${res.status}): ${text}` });
            }
        } 
        
        else if (channel === 'telegram') {
            if (!telegram || !telegram.botToken || !telegram.chatId) {
                return NextResponse.json({ success: false, error: 'Telegram Bot Token and Chat ID are required for testing.' }, { status: 400 });
            }
            const url = `https://api.telegram.org/bot${telegram.botToken}/sendMessage`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: telegram.chatId,
                    text: `*${title}*\n\n${message}`,
                    parse_mode: 'Markdown'
                })
            });

            if (!res.ok) {
                const json = await res.json();
                return NextResponse.json({ success: false, error: `Telegram API error: ${json.description || JSON.stringify(json)}` });
            }
        } 
        
        else if (channel === 'discord') {
            if (!discord || !discord.webhookUrl) {
                return NextResponse.json({ success: false, error: 'Discord Webhook URL is required for testing.' }, { status: 400 });
            }
            const res = await fetch(discord.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    embeds: [{
                        title: title,
                        description: message,
                        color: 16750848, // Orange-ish Gold
                        timestamp: new Date().toISOString()
                    }]
                })
            });

            if (!res.ok) {
                const text = await res.text();
                return NextResponse.json({ success: false, error: `Discord Webhook returned status ${res.status}: ${text}` });
            }
        } 
        
        else {
            return NextResponse.json({ success: false, error: 'Invalid channel specified.' }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: `${channel.toUpperCase()} channel test message sent successfully!` });

    } catch (error) {
        console.error('[API NOTIFICATION TEST ERROR]:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export const POST = withAuth(testNotification);
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
