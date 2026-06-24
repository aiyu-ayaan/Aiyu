import { NextResponse } from 'next/server';
import { login } from '@/lib/auth';
import { checkRateLimit, getClientIP } from '@/middleware/auth';
import { logAudit, AUDIT_CATEGORY } from '@/lib/audit';

// Per-IP throttle: 5 attempts / 5 min. With trusted-proxy IP resolution the
// key can no longer be spoofed via X-Forwarded-For.
const LOGIN_MAX_PER_IP = 5;
const LOGIN_WINDOW_MS = 300000;
// Global backstop against distributed (botnet) credential spraying from many
// real IPs. Kept generous so a single legitimate admin is never affected and an
// attacker cannot cheaply lock the admin out; tune via env if needed.
const LOGIN_GLOBAL_MAX = Number(process.env.LOGIN_GLOBAL_MAX_ATTEMPTS) || 50;
const LOGIN_GLOBAL_WINDOW_MS = 600000;

export async function POST(request) {
    const clientIP = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || '';

    try {
        // Rate limiting: per-IP first, then a global backstop.
        if (!checkRateLimit(`login:${clientIP}`, LOGIN_MAX_PER_IP, LOGIN_WINDOW_MS)) {
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

        if (!checkRateLimit('login:global', LOGIN_GLOBAL_MAX, LOGIN_GLOBAL_WINDOW_MS)) {
            console.warn('[SECURITY] Global login rate limit exceeded');
            await logAudit({
                action: 'LOGIN_RATE_LIMITED',
                category: AUDIT_CATEGORY.SECURITY,
                details: 'Login blocked: global attempt threshold exceeded',
                ipAddress: clientIP,
                userAgent,
            });
            return NextResponse.json({
                error: 'Too many login attempts. Please try again later.'
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
