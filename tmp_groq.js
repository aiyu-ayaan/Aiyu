const fs = require('fs');
const envConfig = fs.readFileSync('d:/VS-Code/Next JS/portfolio/.env', 'utf-8')
    .split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key) process.env[key.trim()] = valueParts.join('=').replace(/[\r\n"']/g, '').trim();
    });

const mongoose = require('mongoose');
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_secret_key_32_chars_long!';
const IV_LENGTH = 16;

function decrypt(text) {
    if (!text) return null;
    let textParts = text.split(':');
    let iv = Buffer.from(textParts.shift(), 'hex');
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

async function testGroq() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // We don't have the mongoose model defined in pure JS here, so we will use raw collection
    const config = await mongoose.connection.collection('configs').findOne({});
    const apiKey = decrypt(config.encryptedGroqApiKey);
    
    console.log("Decrypted Key:", apiKey ? apiKey.substring(0, 8) + "..." : "none");

    if (!apiKey) {
        console.log("No key found.");
        process.exit(1);
    }

    const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: {
            'Authorization': `Bearer ${apiKey}`
        }
    });

    console.log("Status:", res.status);
    if (!res.ok) {
        console.log("Error:", await res.text());
    } else {
        const data = await res.json();
        console.log("Success! Models:", data.data.map(m => m.id).slice(0, 5));
    }
    process.exit(0);
}

testGroq();
