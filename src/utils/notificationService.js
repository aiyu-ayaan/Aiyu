import dbConnect from '@/lib/db';
import NotificationConfig from '@/models/NotificationConfig';

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

/**
 * Sends a notification across all enabled channels (ntfy, telegram, discord)
 * @param {Object} payload
 * @param {string} payload.title - The title of the notification
 * @param {string} payload.message - The text content of the message
 * @param {string} [payload.priority] - ntfy priority ('1' to '5', default '3')
 * @param {string} [payload.tags] - ntfy tags (comma-separated emojis or words)
 */
export async function sendNotification({ title, message, priority = '3', tags = '' }) {
    try {
        await dbConnect();
        const config = await NotificationConfig.findOne({});
        
        if (!config || !config.enabled) {
            console.log('[NOTIFICATION SERVICE] Notifications are disabled or not configured.');
            return { success: false, reason: 'disabled' };
        }

        const promises = [];

        // 1. ntfy
        if (config.ntfy && config.ntfy.enabled && config.ntfy.topic) {
            const server = config.ntfy.serverUrl || 'https://ntfy.sh';
            const topic = config.ntfy.topic;
            const token = config.ntfy.token;
            
            const url = `${server.replace(/\/$/, '')}/${topic}`;
            const headers = {
                'Title': encodeMimeHeader(title),
                'Priority': priority,
                'Tags': tags
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            promises.push(
                fetch(url, {
                    method: 'POST',
                    headers,
                    body: message
                })
                .then(async (res) => {
                    if (!res.ok) {
                        const errText = await res.text();
                        console.error(`[NOTIFICATION SERVICE] ntfy failed with status ${res.status}: ${errText}`);
                    } else {
                        console.log('[NOTIFICATION SERVICE] ntfy alert dispatched successfully.');
                    }
                })
                .catch(err => console.error('[NOTIFICATION SERVICE] ntfy delivery error:', err))
            );
        }

        // 2. Telegram
        if (config.telegram && config.telegram.enabled && config.telegram.botToken && config.telegram.chatId) {
            const botToken = config.telegram.botToken;
            const chatId = config.telegram.chatId;
            const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
            
            promises.push(
                fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: `*${title}*\n\n${message}`,
                        parse_mode: 'Markdown'
                    })
                })
                .then(async (res) => {
                    if (!res.ok) {
                        const errJson = await res.json();
                        console.error('[NOTIFICATION SERVICE] Telegram failed:', errJson);
                    } else {
                        console.log('[NOTIFICATION SERVICE] Telegram message dispatched successfully.');
                    }
                })
                .catch(err => console.error('[NOTIFICATION SERVICE] Telegram delivery error:', err))
            );
        }

        // 3. Discord
        if (config.discord && config.discord.enabled && config.discord.webhookUrl) {
            const webhookUrl = config.discord.webhookUrl;
            
            promises.push(
                fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        embeds: [{
                            title: title,
                            description: message,
                            color: 3447003, // Cyan
                            timestamp: new Date().toISOString()
                        }]
                    })
                })
                .then(async (res) => {
                    if (!res.ok) {
                        const errText = await res.text();
                        console.error(`[NOTIFICATION SERVICE] Discord failed with status ${res.status}: ${errText}`);
                    } else {
                        console.log('[NOTIFICATION SERVICE] Discord webhook dispatched successfully.');
                    }
                })
                .catch(err => console.error('[NOTIFICATION SERVICE] Discord delivery error:', err))
            );
        }

        if (promises.length === 0) {
            console.log('[NOTIFICATION SERVICE] No integration channels are active/enabled.');
            return { success: false, reason: 'no_active_channels' };
        }

        await Promise.all(promises);
        return { success: true };
    } catch (error) {
        console.error('[NOTIFICATION SERVICE ERROR]:', error);
        return { success: false, error: error.message };
    }
}
