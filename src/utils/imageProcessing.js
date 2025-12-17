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
        // Create sharp instance once for reuse
        const image = sharp(imageBuffer, {
            // Optimize for low memory usage
            limitInputPixels: 268402689, // ~16K x 16K max
            sequentialRead: true
        });
        
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
