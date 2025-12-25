/**
 * IMAGE PROCESSING UTILITIES
 * 
 * Provides functions for generating optimized thumbnails and processing images
 * to improve gallery performance and reduce bandwidth usage.
 * 
 * Optimized for low-memory environments (2GB RAM cloud servers):
 * - Streaming image processing
 * - Limited concurrency
 * - Memory-efficient sharp configuration
 */

import sharp from 'sharp';
import { join } from 'path';
import { writeFile, unlink } from 'fs/promises';

import heicConvert from 'heic-convert';

// Thumbnail configuration
const THUMBNAIL_WIDTH = 800; // Max width for thumbnail
const THUMBNAIL_QUALITY = 80; // WebP quality (0-100)

// Configure sharp for low-memory environments
// Limit concurrent operations and cache size to prevent OOM
sharp.cache({ memory: 50 }); // Limit cache to 50MB
sharp.concurrency(1); // Process one image at a time to prevent memory spikes

/**
 * Generate an optimized WebP thumbnail from a buffer
 * @param {Buffer} imageBuffer - Original image buffer
 * @param {string} originalFilename - Original filename
 * @returns {Promise<{buffer: Buffer, filename: string, width: number, height: number}>}
 */
export async function generateThumbnail(imageBuffer, originalFilename) {
    try {
        // Create sharp instance
        let image = sharp(imageBuffer, {
            // Optimize for low memory usage
            limitInputPixels: 268402689, // ~16K x 16K max
            sequentialRead: true
        });

        // Handle HEIC for thumbnail generation if sharp fails
        try {
            await image.metadata();
        } catch (e) {
            // If sharp fails to read metadata, it might be an unsupported format like HEIC
            // Convert to JPEG first using heic-convert
            if (isHeic(imageBuffer)) {
                console.log('[INFO] Using heic-convert for thumbnail generation');
                const jpegBuffer = await heicConvert({
                    buffer: imageBuffer,
                    format: 'JPEG',
                    quality: 0.8
                });
                image = sharp(jpegBuffer);
            } else {
                throw e;
            }
        }

        // Get image metadata
        const metadata = await image.metadata();

        // Calculate thumbnail dimensions while maintaining aspect ratio
        const shouldResize = metadata.width > THUMBNAIL_WIDTH;
        const thumbnailWidth = shouldResize ? THUMBNAIL_WIDTH : metadata.width;
        const thumbnailHeight = shouldResize
            ? Math.round((metadata.height / metadata.width) * THUMBNAIL_WIDTH)
            : metadata.height;

        // Generate WebP thumbnail with optimized settings
        const thumbnailBuffer = await image
            .resize(thumbnailWidth, thumbnailHeight, {
                fit: 'inside',
                withoutEnlargement: true,
                kernel: sharp.kernel.lanczos3 // Better quality/performance balance
            })
            .webp({
                quality: THUMBNAIL_QUALITY,
                effort: 4, // Balance between compression and speed (0-6, default 4)
                smartSubsample: true // Better compression
            })
            .toBuffer();

        // Generate filename for thumbnail (optimized string operation)
        const dotIndex = originalFilename.lastIndexOf('.');
        const nameWithoutExt = dotIndex > 0 ? originalFilename.slice(0, dotIndex) : originalFilename;
        const thumbnailFilename = `${nameWithoutExt}-thumb.webp`;

        return {
            buffer: thumbnailBuffer,
            filename: thumbnailFilename,
            width: thumbnailWidth,
            height: thumbnailHeight
        };
    } catch (error) {
        console.error('[ERROR] Failed to generate thumbnail:', error);
        throw new Error('Failed to generate thumbnail');
    }
}

/**
 * Save thumbnail to filesystem
 * @param {Buffer} buffer - Thumbnail buffer
 * @param {string} filename - Thumbnail filename
 * @returns {Promise<string>} - URL path to thumbnail
 */
export async function saveThumbnail(buffer, filename) {
    try {
        const uploadDir = join(process.cwd(), 'public', 'uploads');
        const filePath = join(uploadDir, filename);

        await writeFile(filePath, buffer, { mode: 0o644 });

        return `/api/uploads/${filename}`;
    } catch (error) {
        console.error('[ERROR] Failed to save thumbnail:', error);
        throw new Error('Failed to save thumbnail');
    }
}

/**
 * Generate thumbnail from existing file URL
 * @param {string} fileUrl - URL of the original file (e.g., /api/uploads/image.jpg)
 * @returns {Promise<string>} - URL path to generated thumbnail
 */
export async function generateThumbnailFromUrl(fileUrl) {
    try {
        // Extract filename from URL
        const filename = fileUrl.split('/').pop();

        // Read the original file
        const uploadDir = join(process.cwd(), 'public', 'uploads');
        const filePath = join(uploadDir, filename);

        const { readFile } = await import('fs/promises');
        const imageBuffer = await readFile(filePath);

        // Generate thumbnail
        const thumbnail = await generateThumbnail(imageBuffer, filename);

        // Save thumbnail
        const thumbnailUrl = await saveThumbnail(thumbnail.buffer, thumbnail.filename);

        return thumbnailUrl;
    } catch (error) {
        console.error('[ERROR] Failed to generate thumbnail from URL:', error);
        throw error;
    }
}

/**
 * Delete thumbnail file
 * @param {string} thumbnailUrl - URL of thumbnail to delete
 */
export async function deleteThumbnail(thumbnailUrl) {
    try {
        if (!thumbnailUrl) return;

        const filename = thumbnailUrl.split('/').pop();
        const uploadDir = join(process.cwd(), 'public', 'uploads');
        const filePath = join(uploadDir, filename);

        await unlink(filePath);
    } catch (error) {
        // Don't throw error if file doesn't exist
        console.warn('[WARN] Failed to delete thumbnail:', error.message);
    }
}

/**
 * Helper to check if buffer is HEIC
 */
function isHeic(buffer) {
    if (!buffer || buffer.length < 12) return false;
    // Check for 'ftyp' + 'heic' or 'mif1'
    // Offset 4 is 'ftyp', offset 8 is brand
    const ftyp = buffer.slice(4, 8).toString('ascii');
    const brand = buffer.slice(8, 12).toString('ascii');

    return ftyp === 'ftyp' && (brand === 'heic' || brand === 'heix' || brand === 'mif1' || brand === 'msf1');
}

/**
 * Process uploaded image
 * - Converting HEIC/HEIF to WebP using heic-convert if needed
 * - Optimizes huge images
 * @param {Buffer} buffer - Original image buffer
 * @returns {Promise<{buffer: Buffer, format: string, width: number, height: number}>}
 */
export async function processUploadedImage(buffer) {
    try {
        let inputBuffer = buffer;

        // Check for HEIC and convert to JPEG first
        // Sharp may partially recognize HEIC but lack the decoder, so convert immediately
        if (isHeic(buffer)) {
            console.log('[INFO] Detected HEIC file, converting to JPEG using heic-convert');
            const jpegBuffer = await heicConvert({
                buffer: buffer,
                format: 'JPEG',
                quality: 1
            });
            inputBuffer = jpegBuffer;
            console.log('[SUCCESS] HEIC converted to JPEG, size:', jpegBuffer.length);
        }

        const image = sharp(inputBuffer, {
            limitInputPixels: 268402689,
            sequentialRead: true
        });

        const metadata = await image.metadata();

        // Check if conversion is needed (HEIC/HEIF or very large images)
        // Note: metadata.format will be 'jpeg' if we converted via heic-convert
        const isHeicOriginal = metadata.format === 'heic' || metadata.format === 'heif' || isHeic(buffer);
        const isHuge = metadata.width > 2500 || metadata.height > 2500;

        if (!isHeicOriginal && !isHuge) {
            // Return original if no processing needed
            return {
                buffer,
                format: metadata.format,
                width: metadata.width,
                height: metadata.height
            };
        }

        // Configure output pipeline
        let pipeline = image;

        // Resize if huge (capped at 2500px to save space/bandwidth)
        if (isHuge) {
            pipeline = pipeline.resize(2500, 2500, {
                fit: 'inside',
                withoutEnlargement: true
            });
        }

        // Convert to WebP if HEIC, otherwise keep format or optimize if huge
        // For simplicity and consistency, we'll standardize on WebP for all processed images
        // as it offers better compression than JPEG/PNG
        const outputBuffer = await pipeline
            .webp({ quality: 85, effort: 4 })
            .toBuffer();

        const outputMetadata = await sharp(outputBuffer).metadata();

        return {
            buffer: outputBuffer,
            format: 'webp',
            width: outputMetadata.width,
            height: outputMetadata.height
        };

    } catch (error) {
        console.error('[ERROR] Image processing failed:', error);
        throw new Error('Failed to process image');
    }
}
