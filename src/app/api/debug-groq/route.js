import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSingleton } from '@/lib/serialize';
import { decrypt } from '@/lib/encryption';

export async function GET() {
    const config = await getSingleton(prisma, 'config', { withSecrets: true });
    const apiKey = decrypt(config?.encryptedGroqApiKey);
    
    if (!apiKey) return NextResponse.json({ error: 'No key decrypted' });

    const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    
    const text = await res.text();
    return NextResponse.json({ status: res.status, ok: res.ok, data: text, keyStarts: apiKey.substring(0, 8) });
}
