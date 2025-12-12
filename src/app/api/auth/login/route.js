import { NextResponse } from 'next/server';
import { login } from '@/lib/auth';
import { checkRateLimit, getClientIP } from '@/middleware/auth';

export async function POST(request) {
    try {
        // Rate limiting: 5 login attempts per 5 minutes
        const clientIP = getClientIP(request);
        if (!checkRateLimit(`login:${clientIP}`, 5, 300000)) {
            console.warn(`[SECURITY] Login rate limit exceeded for IP: ${clientIP}`);
            return NextResponse.json({
                error: 'Too many login attempts. Please try again in 5 minutes.'
            }, { status: 429 });
        }

        const formData = await request.formData();
        const success = await login(formData);

        if (success) {
            console.log(`[AUTH] Successful login from IP: ${clientIP}`);
            return NextResponse.json({ success: true }, { status: 200 });
        } else {
            console.warn(`[SECURITY] Failed login attempt from IP: ${clientIP}`);
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }
    } catch (error) {
        console.error('[ERROR] Login error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

