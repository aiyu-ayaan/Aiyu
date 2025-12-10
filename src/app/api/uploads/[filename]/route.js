import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(request, { params }) {
    try {
        const { filename } = await params;

        // Security check to prevent directory traversal
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
        }

        const uploadDir = join(process.cwd(), 'public/uploads');
        const filePath = join(uploadDir, filename);

        try {
            const fileBuffer = await readFile(filePath);

            // Determine content type based on extension
            const ext = filename.split('.').pop()?.toLowerCase();
            let contentType = 'application/octet-stream';

            if (ext === 'png') contentType = 'image/png';
            else if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
            else if (ext === 'gif') contentType = 'image/gif';
            else if (ext === 'webp') contentType = 'image/webp';
            else if (ext === 'svg') contentType = 'image/svg+xml';
            else if (ext === 'pdf') contentType = 'application/pdf';

            return new NextResponse(fileBuffer, {
                headers: {
                    'Content-Type': contentType,
                    'Cache-Control': 'public, max-age=31536000, immutable',
                },
            });
        } catch (error) {
            console.error(`File not found: ${filePath}`);
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }
    } catch (error) {
        console.error('Error serving file:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
