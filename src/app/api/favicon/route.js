
import dbConnect from "@/lib/db";
import ConfigModel from "@/models/Config";

export async function GET() {
    await dbConnect();

    try {
        const config = await ConfigModel.findOne().lean();

        if (config && config.favicon && config.favicon.value) {
            const base64Data = config.favicon.value.split(';base64,').pop();
            const buffer = Buffer.from(base64Data, 'base64');
            const mimeType = config.favicon.mimeType || 'image/x-icon';

            return new Response(buffer, {
                headers: {
                    'Content-Type': mimeType,
                    'Cache-Control': 'public, max-age=31536000, immutable',
                },
            });
        }

        // Return 404 if no favicon configured
        return new Response('Not found', { status: 404 });

    } catch (error) {
        console.error('Error serving favicon:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}
