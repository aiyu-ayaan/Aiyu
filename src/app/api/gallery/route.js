import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Gallery from '@/models/Gallery';
import { withAuth } from '@/middleware/auth';

// GET: Fetch all gallery items (Public)
export async function GET() {
    await dbConnect();

    try {
        const images = await Gallery.find({}).sort({ createdAt: -1 });
        return NextResponse.json({ success: true, data: images });
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

        return NextResponse.json({ success: true, data: {} });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

// Export authenticated handlers
export const POST = withAuth(createGalleryItem);
export const DELETE = withAuth(deleteGalleryItem);
