import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { generateSecureFilename, validateUploadedFile } from '@/utils/fileValidation';
import { generateThumbnail, processUploadedImage, saveThumbnail } from '@/utils/imageProcessing';

function getExtension(filename = '') {
    const dotIndex = filename.lastIndexOf('.');
    if (dotIndex <= 0 || dotIndex === filename.length - 1) return '';
    return filename.slice(dotIndex + 1);
}

function stripExtension(filename = '') {
    const dotIndex = filename.lastIndexOf('.');
    if (dotIndex <= 0) return filename;
    return filename.slice(0, dotIndex);
}

function normalizePreferredName(preferredName, fallbackName) {
    const trimmed = typeof preferredName === 'string' ? preferredName.trim() : '';
    if (!trimmed) return fallbackName;

    const fallbackExt = getExtension(fallbackName);
    if (getExtension(trimmed)) return trimmed;
    return fallbackExt ? `${trimmed}.${fallbackExt}` : trimmed;
}

/**
 * Shared image upload pipeline used by /api/upload and blog image update routes.
 */
export async function storeOptimizedImage(file, options = {}) {
    if (!file) {
        throw new Error('No file uploaded');
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const validation = validateUploadedFile(file, buffer);

    if (!validation.valid) {
        throw new Error(validation.error || 'Invalid upload');
    }

    let finalBuffer = buffer;
    let finalType = validation.detectedType || file.type;
    let imageWidth = null;
    let imageHeight = null;

    try {
        const processed = await processUploadedImage(buffer);
        finalBuffer = processed.buffer;
        imageWidth = processed.width;
        imageHeight = processed.height;

        const inputType = String(file.type || '').split('/')[1];
        if (processed.format !== inputType && processed.format === 'webp') {
            finalType = 'image/webp';
        }
    } catch (error) {
        console.error('[WARN] Image processing failed, falling back to original:', error);
        if (validation.detectedType === 'image/heic') {
            throw new Error(`Failed to process HEIC image: ${error.message}`);
        }
    }

    const requestedName = normalizePreferredName(options?.name, file.name);
    const finalBaseName = finalType === 'image/webp'
        ? `${stripExtension(requestedName) || 'image'}.webp`
        : requestedName;
    const secureFilename = generateSecureFilename(finalBaseName);

    const uploadDir = join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true, mode: 0o755 });

    const filePath = join(uploadDir, secureFilename);
    await writeFile(filePath, finalBuffer, { mode: 0o644 });

    const fileUrl = `/api/uploads/${secureFilename}`;
    let thumbnailUrl = null;

    if (finalType?.startsWith('image/')) {
        try {
            const thumbnail = await generateThumbnail(finalBuffer, secureFilename);
            thumbnailUrl = await saveThumbnail(thumbnail.buffer, thumbnail.filename);
        } catch (error) {
            console.warn('[WARN] Failed to generate thumbnail, continuing without it:', error.message);
        }
    }

    return {
        url: fileUrl,
        thumbnailUrl,
        filename: secureFilename,
        size: finalBuffer.length,
        type: finalType,
        width: imageWidth,
        height: imageHeight,
    };
}
