/**
 * Audit trail helper. Records critical admin actions to the AuditLog table.
 *
 * Logging is intentionally fire-and-forget and never throws into the caller —
 * an audit write must not be able to break the action it is recording. Only
 * high-value events are instrumented (auth + destructive mutations), not every
 * endpoint, to keep the trail signal-dense.
 */
import { prisma } from '@/lib/prisma';
import { getClientIP } from '@/middleware/auth';

/** Known action categories. */
export const AUDIT_CATEGORY = {
    AUTH: 'auth',
    CONTENT: 'content',
    SYSTEM: 'system',
    SECURITY: 'security',
};

/**
 * @param {Object} entry
 * @param {string} entry.action     Stable uppercase action code (e.g. LOGIN_SUCCESS).
 * @param {string} [entry.category] One of AUDIT_CATEGORY (default: system).
 * @param {string} [entry.details]  Human-readable context.
 * @param {Request} [entry.request] Used to derive IP + user-agent.
 * @param {string} [entry.ipAddress] Explicit IP (overrides request-derived).
 * @param {string} [entry.userAgent] Explicit UA (overrides request-derived).
 */
export async function logAudit({
    action,
    category = AUDIT_CATEGORY.SYSTEM,
    details = '',
    request,
    ipAddress,
    userAgent,
}) {
    try {
        const ip = ipAddress ?? (request ? getClientIP(request) : '');
        const ua = userAgent ?? (request ? request.headers.get('user-agent') || '' : '');

        await prisma.auditLog.create({
            data: {
                action: String(action || 'UNKNOWN'),
                category,
                details: String(details || '').slice(0, 2000),
                ipAddress: ip || '',
                userAgent: ua || '',
            },
        });
    } catch (error) {
        // Never let auditing break the underlying action.
        console.error('[AUDIT] Failed to record action:', action, error?.message);
    }
}
