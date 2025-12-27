import GalleryClient from './GalleryClient';
import dbConnect from '@/lib/db';
import ConfigModel from '@/models/Config';

export async function generateMetadata() {
    try {
        await dbConnect();
        const config = await ConfigModel.findOne().lean();
        const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const description = 'A collection of my photography and visual work.';
        const ogImage = config?.ogImage || `${baseUrl}/og-image.png`;

        return {
            title: `${baseName} | Gallery`,
            description,
            keywords: ['gallery', 'photography', 'visual', 'design', 'portfolio', 'images'].join(', '),
            openGraph: {
                title: `${baseName} | Gallery`,
                description,
                url: `${baseUrl}/gallery`,
                type: 'website',
                images: [{ url: ogImage, width: 1200, height: 630 }],
            },
            twitter: {
                card: 'summary_large_image',
                title: `${baseName} | Gallery`,
                description,
                images: [ogImage],
            },
            alternates: {
                canonical: `${baseUrl}/gallery`,
            },
        };
    } catch (error) {
        console.error('Error generating metadata:', error);
        return {
            title: 'Gallery | Portfolio',
            description: 'A collection of my photography and visual work.',
        };
    }
}

export default function GalleryPage() {
    return <GalleryClient />;
}
