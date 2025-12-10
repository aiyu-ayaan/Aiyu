
import { NextResponse } from 'next/server';
import { writeFile, mkdir, chmod } from 'fs/promises';
import { join } from 'path';

export async function POST(request) {
    try {
        const data = await request.formData();
        const file = data.get('file');

        if (!file) {
            return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = file.name.replace(/\.[^/.]+$/, "") + '-' + uniqueSuffix + '.' + file.name.split('.').pop();

        // Ensure upload directory exists
        const uploadDir = join(process.cwd(), 'public/uploads');
        console.log('Current working directory:', process.cwd());
        console.log('Upload directory target:', uploadDir);

        try {
            await mkdir(uploadDir, { recursive: true });
        } catch (e) {
            console.error('Error creating directory:', e);
            // Ignore error if directory exists
        }

        try {
            // Attempt to make directory writable just in case
            await chmod(uploadDir, 0o777);
        } catch (e) {
            console.warn('Could not chmod directory:', e);
        }

        const path = join(uploadDir, filename);

        await writeFile(path, buffer);
        console.log(`Open ${path} to see the uploaded file`);

        return NextResponse.json({ success: true, url: `/uploads/${filename}` });
    } catch (error) {
        console.error('Upload error details:', error);
        return NextResponse.json({ success: false, error: 'Upload failed: ' + error.message }, { status: 500 });
    }
}
