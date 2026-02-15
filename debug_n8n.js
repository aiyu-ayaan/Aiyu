
const fs = require('fs');
const path = require('path');

// Manually load .env
try {
    const envPath = path.resolve(process.cwd(), '.env');
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
} catch (e) {
    console.error('Failed to load .env', e);
}

const mongoose = require('mongoose');

// Define minimal Config schema for the script
const ConfigSchema = new mongoose.Schema({
    n8nWebhookUrl: String,
    n8nWebhookAuthKey: String,
}, { strict: false });

const Config = mongoose.models.Config || mongoose.model('Config', ConfigSchema);

async function testWebhook() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('❌ MONGODB_URI is missing in .env');
            process.exit(1);
        }

        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected.');

        const config = await Config.findOne().lean();
        if (!config) {
            console.error('❌ No config found in DB.');
            process.exit(1);
        }

        console.log('--- Configuration ---');
        console.log('n8nWebhookUrl:', config.n8nWebhookUrl);
        console.log('n8nWebhookAuthKey:', config.n8nWebhookAuthKey ? '*** HIDDEN ***' : '(empty)');

        if (!config.n8nWebhookUrl) {
            console.error('❌ n8n Webhook URL is not set.');
            process.exit(1);
        }

        const headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'AiyuPortfolio/Debug'
        };

        if (config.n8nWebhookAuthKey) {
            console.log('Setting header: Authentication');
            headers['Authentication'] = config.n8nWebhookAuthKey;
        } else {
            console.warn('⚠️ No Auth Key configured.');
        }

        console.log('Sending test request...');
        const res = await fetch(config.n8nWebhookUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                message: "Test from debug script",
                timestamp: new Date().toISOString()
            })
        });

        console.log('--- Response ---');
        console.log('Status:', res.status);
        const text = await res.text();
        console.log('Body:', text);

        if (res.ok) {
            console.log('✅ SUCCESS: Webhook triggered.');
        } else {
            console.log('❌ FAILED: Webhook rejected the request.');
            if (res.status === 403) {
                console.log('\nPossible fixes:');
                console.log('1. Check if n8n Webhook node has "Header Auth" enabled.');
                console.log('2. Check if n8n "Header Name" is set to "Authentication".');
                console.log('3. Check if n8n "Header Value" matches the token.');
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

testWebhook();
