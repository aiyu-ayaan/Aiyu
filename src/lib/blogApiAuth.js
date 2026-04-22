import crypto from 'crypto';
import Config from '@/models/Config';

export function validateExternalApiKey(request) {
    const apiKey = request.headers.get('x-api-key');
    const validApiKey = process.env.BLOG_API_KEY || process.env.JWT_SECRET;
    return Boolean(apiKey && validApiKey && apiKey === validApiKey);
}

export async function validateBearerBlogToken(request) {
    const authHeader = request.headers.get('authorization') || '';
    const [scheme, rawToken] = authHeader.split(' ');
    if (!scheme || !rawToken || scheme.toLowerCase() !== 'bearer') {
        return false;
    }

    const providedHash = crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
    const config = await Config.findOne().select('+blogApiTokenHash').lean();
    const storedHash = String(config?.blogApiTokenHash || '');
    if (!storedHash) return false;

    const storedBuffer = Buffer.from(storedHash, 'hex');
    const providedBuffer = Buffer.from(providedHash, 'hex');
    if (storedBuffer.length !== providedBuffer.length) return false;

    return crypto.timingSafeEqual(storedBuffer, providedBuffer);
}
