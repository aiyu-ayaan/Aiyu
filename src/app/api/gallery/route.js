import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Gallery from '@/models/Gallery';
import { withAuth } from '@/middleware/auth';
import { deleteThumbnail } from '@/utils/imageProcessing';
import cache, { CACHE_KEYS, CACHE_TTL, createCacheDebugHeaders } from '@/lib/cache';
import { createPublicCacheHeaders, RESPONSE_CACHE } from '@/lib/httpCache';

// GET: Fetch all gallery items (Public)
export async function GET() {
    try {
        const { value: images, meta } = await cache.getOrSetWithMeta(
            CACHE_KEYS.GALLERY,
            async () => {
                await dbConnect();
                return Gallery.find({}).sort({ isPinned: -1, order: 1, createdAt: -1 }).lean();
            },
            CACHE_TTL.MEDIUM
        );

        return NextResponse.json({ success: true, data: images }, {
            headers: {
                ...createPublicCacheHeaders(RESPONSE_CACHE.PUBLIC_MEDIUM),
                ...createCacheDebugHeaders(meta),
            },
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

// POST: Create a new gallery item (Admin only)
async function createGalleryItem(req) {
    await dbConnect();

    try {
        const body = await req.json();
        const galleryItem = await Gallery.create(body);
        await cache.invalidateAsync(CACHE_KEYS.GALLERY);
        return NextResponse.json({ success: true, data: galleryItem }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

// DELETE: Remove a gallery item (Admin only)
async function deleteGalleryItem(req) {
    await dbConnect();

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
        }

        const deletedItem = await Gallery.findByIdAndDelete(id);

        if (!deletedItem) {
            return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
        }

        await cache.invalidateAsync(CACHE_KEYS.GALLERY);

        // Delete associated thumbnail file (non-blocking)
        if (deletedItem.thumbnail) {
            deleteThumbnail(deletedItem.thumbnail).catch(err =>
                console.warn('[WARN] Failed to delete thumbnail:', err.message)
            );
        }

        return NextResponse.json({ success: true, data: {} });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

// PUT: Update gallery items (Admin only)
async function updateGalleryItem(req) {
    await dbConnect();

    try {
        const body = await req.json();

        // Bulk update for ordering
        if (body.items && Array.isArray(body.items)) {
            const bulkOps = body.items.map((item) => ({
                updateOne: {
                    filter: { _id: item.id },
                    update: { order: item.order }
                }
            }));
            await Gallery.bulkWrite(bulkOps);
            await cache.invalidateAsync(CACHE_KEYS.GALLERY);
            return NextResponse.json({ success: true, message: 'Ordering updated successfully' });
        }

        // Single update (e.g. isPinned toggle)
        if (body.id) {
            const updatedItem = await Gallery.findByIdAndUpdate(
                body.id,
                { $set: body.update },
                { new: true }
            );
            if (!updatedItem) {
                return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
            }

            await cache.invalidateAsync(CACHE_KEYS.GALLERY);
            return NextResponse.json({ success: true, data: updatedItem });
        }

        return NextResponse.json({ success: false, error: 'Invalid request payload' }, { status: 400 });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

// Export authenticated handlers
export const POST = withAuth(createGalleryItem);
export const DELETE = withAuth(deleteGalleryItem);
export const PUT = withAuth(updateGalleryItem);

// Use nodejs runtime for file system operations
export const runtime = 'nodejs';
