import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toClient, toClientList, fromClient } from '@/lib/serialize';
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
                const rows = await prisma.gallery.findMany({
                    orderBy: [{ isPinned: 'desc' }, { order: 'asc' }, { createdAt: 'desc' }],
                });
                return toClientList('gallery', rows);
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
    try {
        const body = await req.json();
        const galleryItem = await prisma.gallery.create({ data: fromClient('gallery', body, { keepId: false }) });
        await cache.invalidateAsync(CACHE_KEYS.GALLERY);
        return NextResponse.json({ success: true, data: toClient('gallery', galleryItem) }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

// DELETE: Remove a gallery item (Admin only)
async function deleteGalleryItem(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
        }

        let deletedItem;
        try {
            deletedItem = await prisma.gallery.delete({ where: { id } });
        } catch (error) {
            if (error?.code === 'P2025') {
                return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
            }
            throw error;
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
    try {
        const body = await req.json();

        // Bulk update for ordering
        if (body.items && Array.isArray(body.items)) {
            await prisma.$transaction(
                body.items.map((item) =>
                    prisma.gallery.update({
                        where: { id: item.id },
                        data: { order: Number(item.order) },
                    })
                )
            );
            await cache.invalidateAsync(CACHE_KEYS.GALLERY);
            return NextResponse.json({ success: true, message: 'Ordering updated successfully' });
        }

        // Single update (e.g. isPinned toggle)
        if (body.id) {
            let updatedItem;
            try {
                updatedItem = await prisma.gallery.update({
                    where: { id: body.id },
                    data: fromClient('gallery', body.update, { keepId: false }),
                });
            } catch (error) {
                if (error?.code === 'P2025') {
                    return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
                }
                throw error;
            }

            await cache.invalidateAsync(CACHE_KEYS.GALLERY);
            return NextResponse.json({ success: true, data: toClient('gallery', updatedItem) });
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
