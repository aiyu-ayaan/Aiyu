import { NextResponse } from 'next/server';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { join } from 'path';
import { checkRateLimit, getClientIP } from '@/middleware/auth';

const CONTENT_TYPES = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
};

export async function GET(request, { params }) {
    try {
        const clientIP = getClientIP(request);
        if (!checkRateLimit(`uploads:${clientIP}`, 120, 60000)) {
            return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
        }

        const { filename } = await params;

        if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
        }

        const uploadDir = join(process.cwd(), 'public', 'uploads');
        const filePath = join(uploadDir, filename);

        let fileStats;
        try {
            fileStats = await stat(filePath);
        } catch {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        const ext = filename.split('.').pop()?.toLowerCase() ?? '';
        const contentType = CONTENT_TYPES[ext] ?? 'application/octet-stream';

        // Stream the file — avoids loading the entire buffer into Node.js heap
        const stream = createReadStream(filePath);
        const readable = new ReadableStream({
            start(controller) {
                stream.on('data', (chunk) => controller.enqueue(chunk));
                stream.on('end', () => controller.close());
                stream.on('error', (err) => {
                    controller.error(err);
                    stream.destroy();
                });
            },
            cancel() {
                stream.destroy();
            },
        });

        return new NextResponse(readable, {
            headers: {
                'Content-Type': contentType,
                'Content-Length': fileStats.size.toString(),
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (error) {
        console.error('Error serving file:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
