/**
 * Authentication Middleware for Protected API Routes
 * Verifies JWT tokens for admin-only endpoints
 */

import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

/**
 * Verifies if the request has a valid authentication token
 * 
 * @param {Request} request - Next.js request object
 * @returns {Promise<{ authenticated: boolean, user: object | null, error: string | null }>}
 */
export async function verifyAuth(request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token');

        if (!token) {
            return {
                authenticated: false,
                user: null,
                error: 'No authentication token provided'
            };
        }

        const { payload } = await jwtVerify(token.value, JWT_SECRET);

        return {
            authenticated: true,
            user: payload,
            error: null
        };
    } catch (error) {
        return {
            authenticated: false,
            user: null,
            error: 'Invalid or expired token'
        };
    }
}

/**
 * Middleware wrapper for protected API routes
 * Usage: export const POST = withAuth(handler);
 * 
 * @param {Function} handler - API route handler
 * @returns {Function} - Wrapped handler with authentication
 */
export function withAuth(handler) {
    return async function (request, context) {
        const auth = await verifyAuth(request);

        if (!auth.authenticated) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'Unauthorized',
                    message: auth.error
                }),
                {
                    status: 401,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        // Add user to request for handler to use
        request.user = auth.user;

        return handler(request, context);
    };
}

/**
 * Rate limiting helper (simple in-memory implementation)
 * For production, use Redis or a proper rate limiting service
 */
const rateLimitMap = new Map();

/**
 * Simple rate limiter
 * 
 * @param {string} identifier - IP address or user ID
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {boolean} - True if request should be allowed
 */
export function checkRateLimit(identifier, maxRequests = 10, windowMs = 60000) {
    const now = Date.now();
    const userRequests = rateLimitMap.get(identifier) || [];

    // Filter out old requests outside the time window
    const recentRequests = userRequests.filter(time => now - time < windowMs);

    if (recentRequests.length >= maxRequests) {
        return false;
    }

    // Add current request
    recentRequests.push(now);
    rateLimitMap.set(identifier, recentRequests);

    // Cleanup old entries periodically
    if (rateLimitMap.size > 1000) {
        const cutoff = now - windowMs;
        for (const [key, times] of rateLimitMap.entries()) {
            const recent = times.filter(t => now - t < windowMs);
            if (recent.length === 0) {
                rateLimitMap.delete(key);
            }
        }
    }

    return true;
}

/**
 * Get client IP address from request
 * 
 * @param {Request} request - Next.js request object
 * @returns {string} - Client IP address
 */
export function getClientIP(request) {
    // Check various headers for IP (considering proxies)
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }

    const real = request.headers.get('x-real-ip');
    if (real) {
        return real;
    }

    return request.headers.get('x-client-ip') || 'unknown';
}
