import { prisma } from '@/lib/prisma';
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
    try {
        // Check if batch processing is requested
        const url = new URL(request.url);
        const batchSize = parseInt(url.searchParams.get('batch') || '10', 10);
        const skipCount = parseInt(url.searchParams.get('skip') || '0', 10);

        const missingThumbnailWhere = { OR: [{ thumbnail: null }, { thumbnail: '' }] };

        // Find images without thumbnails (with pagination for large datasets)
        const imagesWithoutThumbnails = await prisma.gallery.findMany({
            where: missingThumbnailWhere,
            skip: skipCount,
            take: batchSize,
            select: { id: true, src: true },
        });

        const totalCount = await prisma.gallery.count({ where: missingThumbnailWhere });

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
                console.log(`[MIGRATION] Processing ${i + 1}/${imagesWithoutThumbnails.length}: ${image.id}`);

                // Generate thumbnail
                const thumbnailUrl = await generateThumbnailFromUrl(image.src);

                // Update the database
                await prisma.gallery.update({
                    where: { id: image.id },
                    data: { thumbnail: thumbnailUrl },
                });

                results.success++;
                console.log(`[MIGRATION] ✓ Generated thumbnail for ${image.id}`);

                // Add small delay every 5 images to allow garbage collection
                if ((i + 1) % 5 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            } catch (error) {
                results.failed++;
                const errorMsg = `${image.id}: ${error.message}`;
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
