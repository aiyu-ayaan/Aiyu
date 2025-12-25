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
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { withAuth, checkRateLimit, getClientIP } from '@/middleware/auth';
import {
    validateUploadedFile,
    generateSecureFilename,
    MAX_FILE_SIZE
} from '@/utils/fileValidation';
import { generateThumbnail, saveThumbnail, processUploadedImage } from '@/utils/imageProcessing';

async function uploadHandler(request) {
    const startTime = Date.now();
    const clientIP = getClientIP(request);

    try {
        // Rate limiting: 10 uploads per minute per IP
        const userIdentifier = request.user?.username || clientIP;
        if (!checkRateLimit(userIdentifier, 10, 60000)) {
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

        // Convert to buffer for validation
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Comprehensive file validation
        const validation = validateUploadedFile(file, buffer);
        if (!validation.valid) {
            console.warn(`[SECURITY] File validation failed: ${validation.error}`, {
                filename: file.name,
                size: file.size,
                type: file.type,
                user: userIdentifier,
                ip: clientIP
            });
            return NextResponse.json({
                success: false,
                error: validation.error
            }, { status: 400 });
        }

        // Process image (Convert HEIC->WebP, optimize huge images)
        let finalBuffer = buffer;
        let finalFilename = file.name;
        let finalType = validation.detectedType || file.type;
        let imageWidth = null;
        let imageHeight = null;

        try {
            const processed = await processUploadedImage(buffer);
            finalBuffer = processed.buffer;
            imageWidth = processed.width;
            imageHeight = processed.height;

            // If format changed (e.g. HEIC -> WebP), update extension and type
            if (processed.format !== file.type.split('/')[1] && processed.format === 'webp') {
                const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.'));
                finalFilename = `${nameWithoutExt}.webp`;
                finalType = 'image/webp';
            }
        } catch (error) {
            console.error('[WARN] Image processing failed, falling back to original:', error);
            // Fallback to original buffer if processing fails (unless it's HEIC which needs conversion)
            if (validation.detectedType === 'image/heic') {
                throw new Error('Failed to process HEIC image: ' + error.message);
            }
        }

        // Generate secure filename
        const secureFilename = generateSecureFilename(finalFilename);

        // Ensure upload directory exists with SECURE permissions
        const uploadDir = join(process.cwd(), 'public', 'uploads');

        try {
            // Create directory with restrictive permissions (755)
            // Owner: read, write, execute
            // Group: read, execute
            // Others: read, execute
            await mkdir(uploadDir, { recursive: true, mode: 0o755 });
        } catch (e) {
            if (e.code !== 'EEXIST') {
                console.error('[ERROR] Failed to create upload directory:', e);
                throw e;
            }
        }

        // Write file with secure permissions (644)
        // Owner: read, write
        // Group: read
        // Others: read
        const filePath = join(uploadDir, secureFilename);
        await writeFile(filePath, finalBuffer, { mode: 0o644 });

        const uploadTime = Date.now() - startTime;
        const fileUrl = `/api/uploads/${secureFilename}`;

        // Generate thumbnail for images
        let thumbnailUrl = null;
        const isImage = finalType?.startsWith('image/');
        if (isImage) {
            try {
                // Use the final buffer (which might be converted WebP) for thumbnail generation
                const thumbnail = await generateThumbnail(finalBuffer, secureFilename);
                thumbnailUrl = await saveThumbnail(thumbnail.buffer, thumbnail.filename);
                console.log(`[SUCCESS] Thumbnail generated: ${thumbnailUrl}`);
            } catch (error) {
                console.warn('[WARN] Failed to generate thumbnail, continuing without it:', error.message);
                // Continue without thumbnail - not a critical error
            }
        }

        console.log(`[SUCCESS] File uploaded successfully:`, {
            originalName: file.name,
            secureFilename,
            size: finalBuffer.length,
            type: finalType,
            url: fileUrl,
            thumbnailUrl,
            uploadTime: `${uploadTime}ms`,
            user: userIdentifier
        });

        return NextResponse.json({
            success: true,
            url: fileUrl,
            thumbnailUrl,
            filename: secureFilename,
            size: finalBuffer.length,
            type: finalType,
            width: imageWidth,
            height: imageHeight
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
