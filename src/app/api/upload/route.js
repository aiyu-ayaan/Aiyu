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

        // Generate secure filename
        const secureFilename = generateSecureFilename(file.name);

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
        await writeFile(filePath, buffer, { mode: 0o644 });

        const uploadTime = Date.now() - startTime;
        const fileUrl = `/uploads/${secureFilename}`;

        console.log(`[SUCCESS] File uploaded successfully:`, {
            originalName: file.name,
            secureFilename,
            size: file.size,
            type: file.type,
            url: fileUrl,
            uploadTime: `${uploadTime}ms`,
            user: userIdentifier
        });

        return NextResponse.json({
            success: true,
            url: fileUrl,
            filename: secureFilename,
            size: file.size,
            type: file.type
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
