import { NextResponse } from 'next/server';
import { login } from '@/lib/auth';
import { checkRateLimit, getClientIP } from '@/middleware/auth';
import { logAudit, AUDIT_CATEGORY } from '@/lib/audit';

export async function POST(request) {
    const clientIP = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || '';

    try {
        // Rate limiting: 5 login attempts per 5 minutes
        if (!checkRateLimit(`login:${clientIP}`, 5, 300000)) {
            console.warn(`[SECURITY] Login rate limit exceeded for IP: ${clientIP}`);
            await logAudit({
                action: 'LOGIN_RATE_LIMITED',
                category: AUDIT_CATEGORY.SECURITY,
                details: 'Login blocked: too many attempts',
                ipAddress: clientIP,
                userAgent,
            });
            return NextResponse.json({
                error: 'Too many login attempts. Please try again in 5 minutes.'
            }, { status: 429 });
        }

        const formData = await request.formData();
        const success = await login(formData, { ipAddress: clientIP, userAgent });

        if (success) {
            console.log(`[AUTH] Successful login from IP: ${clientIP}`);
            await logAudit({
                action: 'LOGIN_SUCCESS',
                category: AUDIT_CATEGORY.AUTH,
                details: 'Admin signed in',
                ipAddress: clientIP,
                userAgent,
            });
            return NextResponse.json({ success: true }, { status: 200 });
        } else {
            console.warn(`[SECURITY] Failed login attempt from IP: ${clientIP}`);
            await logAudit({
                action: 'LOGIN_FAILED',
                category: AUDIT_CATEGORY.SECURITY,
                details: `Invalid credentials for username "${formData.get('username') || ''}"`,
                ipAddress: clientIP,
                userAgent,
            });
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }
    } catch (error) {
        console.error('[ERROR] Login error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
