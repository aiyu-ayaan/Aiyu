import dbConnect from '@/lib/db';
import Gallery from '@/models/Gallery';
import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';

/**
 * Migration endpoint to fix gallery image URLs
 * Changes /uploads/... to /api/uploads/...
 */
async function migrateHandler(request) {
    await dbConnect();

    try {
        const result = await Gallery.updateMany(
            { src: { $regex: '^/uploads/' } },
            [{ $set: { src: { $concat: ['/api', '$src'] } } }]
        );

        return NextResponse.json({
            success: true,
            message: `Updated ${result.modifiedCount} gallery items`,
            details: result
        });
    } catch (error) {
        console.error('Migration failed:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}

export const POST = withAuth(migrateHandler);
