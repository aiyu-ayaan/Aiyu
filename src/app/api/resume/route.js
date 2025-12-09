import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Config from '@/models/Config';

export async function GET() {
    await dbConnect();
    try {
        const config = await Config.findOne().lean();

        if (!config || !config.resume || config.resume.type !== 'file' || !config.resume.value) {
            return new NextResponse('Resume not found', { status: 404 });
        }

        // config.resume.value is a Data URI: "data:application/pdf;base64,....."
        const dataUri = config.resume.value;
        const parts = dataUri.split(',');

        if (parts.length !== 2) {
            return new NextResponse('Invalid resume data', { status: 500 });
        }

        const mimeMatch = parts[0].match(/:(.*?);/);
        const contentType = mimeMatch ? mimeMatch[1] : 'application/pdf';
        const buffer = Buffer.from(parts[1], 'base64');

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `inline; filename="${config.resume.filename || 'resume'}"`,
            },
        });

    } catch (error) {
        console.error('Error serving resume:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
