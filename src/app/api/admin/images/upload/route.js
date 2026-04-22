import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getSession } from '@/lib/auth';
import { checkRateLimit, getClientIP } from '@/middleware/auth';
import { validateBearerBlogToken, validateExternalApiKey } from '@/lib/blogApiAuth';
import { storeOptimizedImage } from '@/utils/uploadImage';

async function uploadAdminImage(request) {
    await dbConnect();
    const session = await getSession();
    const hasValidApiKey = validateExternalApiKey(request);
    const isBearerTokenValid = await validateBearerBlogToken(request);

    if (!session && !hasValidApiKey && !isBearerTokenValid) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const clientIP = getClientIP(request);
    const userIdentifier = session?.user?.name || session?.user?.email || (isBearerTokenValid ? 'bearer:blog-api' : clientIP);

    if (!checkRateLimit(userIdentifier, 60, 60000)) {
        return NextResponse.json(
            { success: false, error: 'Rate limit exceeded. Please wait before uploading again.' },
            { status: 429 }
        );
    }

    try {
        const data = await request.formData();
        const file = data.get('file');
        const name = data.get('name');

        if (!file) {
            return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
        }

        const uploadResult = await storeOptimizedImage(file, {
            name: typeof name === 'string' ? name : '',
        });

        return NextResponse.json({
            success: true,
            data: {
                url: uploadResult.url,
                thumbnailUrl: uploadResult.thumbnailUrl,
                filename: uploadResult.filename,
                width: uploadResult.width,
                height: uploadResult.height,
                type: uploadResult.type,
                size: uploadResult.size,
            },
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export const POST = uploadAdminImage;
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
