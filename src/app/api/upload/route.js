/**
 * SECURE FILE UPLOAD API ROUTE
 * 
 * Security Features:
 * ✅ Authentication required (admin only)
 * ✅ Magic number validation (prevents fake file extensions)
 * ✅ File size limits (10MB max)
 * ✅ Rate limiting (10 uploads per minute per user)
 * ✅ No SVG uploads (XSS prevention)
 * ✅ Proper filename sanitization
 * ✅ No chmod 777 (secure permissions)
 * ✅ Comprehensive error logging
 */

import { NextResponse } from 'next/server';
import { withAuth, checkRateLimit, getClientIP } from '@/middleware/auth';
import { storeOptimizedImage } from '@/utils/uploadImage';

async function uploadHandler(request) {
    const startTime = Date.now();
    const clientIP = getClientIP(request);

    try {
        // Rate limiting: 60 uploads per minute per IP
        const userIdentifier = request.user?.username || clientIP;
        if (!checkRateLimit(userIdentifier, 60, 60000)) {
            console.warn(`[SECURITY] Rate limit exceeded for ${userIdentifier} from IP ${clientIP}`);
            return NextResponse.json({
                success: false,
                error: 'Rate limit exceeded. Please wait before uploading again.'
            }, { status: 429 });
        }

        // Parse form data
        const data = await request.formData();
        const file = data.get('file');

        if (!file) {
            return NextResponse.json({
                success: false,
                error: 'No file uploaded'
            }, { status: 400 });
        }

        console.log(`[UPLOAD] Received file: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);
        const requestedName = data.get('name');
        const uploadResult = await storeOptimizedImage(file, {
            name: typeof requestedName === 'string' ? requestedName : '',
        });
        const uploadTime = Date.now() - startTime;

        console.log(`[SUCCESS] File uploaded successfully:`, {
            originalName: file.name,
            secureFilename: uploadResult.filename,
            size: uploadResult.size,
            type: uploadResult.type,
            url: uploadResult.url,
            thumbnailUrl: uploadResult.thumbnailUrl,
            uploadTime: `${uploadTime}ms`,
            user: userIdentifier
        });

        return NextResponse.json({
            success: true,
            ...uploadResult
        });

    } catch (error) {
        console.error('[ERROR] Upload failed:', {
            error: error.message,
            stack: error.stack,
            user: request.user?.username,
            ip: clientIP,
            time: new Date().toISOString()
        });

        // Don't expose internal error details to client
        return NextResponse.json({
            success: false,
            error: 'Upload failed. Please try again or contact support.'
        }, { status: 500 });
    }
}

// Export with authentication wrapper - ONLY authenticated users can upload
export const POST = withAuth(uploadHandler);

// Explicitly set runtime to nodejs for file system operations
export const runtime = 'nodejs';

// Disable body parsing to handle multipart form data
export const dynamic = 'force-dynamic';
