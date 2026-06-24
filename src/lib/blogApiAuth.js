import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { getSingleton } from '@/lib/serialize';

export async function validateBearerBlogToken(request) {
    const authHeader = request.headers.get('authorization') || '';
    const [scheme, rawToken] = authHeader.split(' ');
    if (!scheme || !rawToken || scheme.toLowerCase() !== 'bearer') {
        return false;
    }

    const providedHash = crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
    const config = await getSingleton(prisma, 'config', { withSecrets: true });
    const storedHash = String(config?.blogApiTokenHash || '');
    if (!storedHash) return false;

    const storedBuffer = Buffer.from(storedHash, 'hex');
    const providedBuffer = Buffer.from(providedHash, 'hex');
    if (storedBuffer.length !== providedBuffer.length) return false;

    return crypto.timingSafeEqual(storedBuffer, providedBuffer);
}
