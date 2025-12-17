import dbConnect from '@/lib/db';
import Gallery from '@/models/Gallery';
import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { generateThumbnailFromUrl } from '@/utils/imageProcessing';

/**
 * Migration endpoint to generate thumbnails for existing gallery images
 * This processes all gallery items that don't have thumbnails yet
 * 
 * Optimized for low-memory environments:
 * - Processes images sequentially (not in parallel)
 * - Adds delay between operations to allow GC
 * - Limits database query size
 */
async function migrateHandler(request) {
    await dbConnect();

    try {
        // Check if batch processing is requested
        const url = new URL(request.url);
        const batchSize = parseInt(url.searchParams.get('batch') || '10', 10);
        const skipCount = parseInt(url.searchParams.get('skip') || '0', 10);

        // Find images without thumbnails (with pagination for large datasets)
        const imagesWithoutThumbnails = await Gallery.find({
            $or: [
                { thumbnail: { $exists: false } },
                { thumbnail: null },
                { thumbnail: '' }
            ]
        })
        .skip(skipCount)
        .limit(batchSize)
        .lean() // Use lean() for better performance
        .select('_id src'); // Only fetch required fields

        const totalCount = await Gallery.countDocuments({
            $or: [
                { thumbnail: { $exists: false } },
                { thumbnail: null },
                { thumbnail: '' }
            ]
        });

        console.log(`[MIGRATION] Processing batch: ${imagesWithoutThumbnails.length} images (${skipCount + 1}-${skipCount + imagesWithoutThumbnails.length} of ${totalCount})`);

        const results = {
            total: imagesWithoutThumbnails.length,
            totalRemaining: totalCount,
            success: 0,
            failed: 0,
            errors: []
        };

        // Process each image sequentially to avoid memory spikes
        for (let i = 0; i < imagesWithoutThumbnails.length; i++) {
            const image = imagesWithoutThumbnails[i];
            try {
                console.log(`[MIGRATION] Processing ${i + 1}/${imagesWithoutThumbnails.length}: ${image._id}`);
                
                // Generate thumbnail
                const thumbnailUrl = await generateThumbnailFromUrl(image.src);
                
                // Update the database
                await Gallery.findByIdAndUpdate(image._id, {
                    thumbnail: thumbnailUrl
                });
                
                results.success++;
                console.log(`[MIGRATION] ✓ Generated thumbnail for ${image._id}`);
                
                // Add small delay every 5 images to allow garbage collection
                if ((i + 1) % 5 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            } catch (error) {
                results.failed++;
                const errorMsg = `${image._id}: ${error.message}`;
                results.errors.push(errorMsg);
                console.error(`[MIGRATION] ✗ Failed: ${errorMsg}`);
            }
        }

        const hasMore = (skipCount + batchSize) < totalCount;

        return NextResponse.json({
            success: true,
            message: `Processed ${results.success} of ${results.total} images successfully.`,
            details: results,
            hasMore,
            nextSkip: hasMore ? skipCount + batchSize : null,
            progress: {
                processed: skipCount + results.total,
                total: totalCount,
                percentage: Math.round(((skipCount + results.total) / totalCount) * 100)
            }
        });
    } catch (error) {
        console.error('[MIGRATION] Migration failed:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}

export const POST = withAuth(migrateHandler);
export const runtime = 'nodejs';
