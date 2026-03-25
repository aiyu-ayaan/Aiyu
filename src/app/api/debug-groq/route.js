import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Config from '@/models/Config';
import { decrypt } from '@/lib/encryption';

export async function GET() {
    await dbConnect();
    const config = await Config.findOne().select('+encryptedGroqApiKey').lean();
    const apiKey = decrypt(config.encryptedGroqApiKey);
    
    if (!apiKey) return NextResponse.json({ error: 'No key decrypted' });

    const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    
    const text = await res.text();
    return NextResponse.json({ status: res.status, ok: res.ok, data: text, keyStarts: apiKey.substring(0, 8) });
}
