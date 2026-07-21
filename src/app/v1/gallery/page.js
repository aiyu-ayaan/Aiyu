import GalleryClient from './GalleryClient';
import { getConfigData, getGalleryData } from '@/lib/dataFetchers';
import { getSiteUrl } from '@/lib/siteUrl';
import { getSocialMeta, applySocialOverrides } from '@/lib/socialMeta';

export const revalidate = 0;

export async function generateMetadata() {
    try {
        const [config, social] = await Promise.all([getConfigData(), getSocialMeta()]);
        const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
        const baseUrl = getSiteUrl();
        const description = 'A collection of my photography and visual work.';

        const base = {
            title: `${baseName} | Gallery`,
            description,
            keywords: ['gallery', 'photography', 'visual', 'design', 'portfolio', 'images'].join(', '),
            robots: {
                index: true,
                follow: true,
                googleBot: {
                    index: true,
                    follow: true,
                    'max-snippet': -1,
                    'max-image-preview': 'large',
                    'max-video-preview': -1,
                },
            },
            openGraph: {
                title: `${baseName} | Gallery`,
                description,
                url: `${baseUrl}/gallery`,
                type: 'website',
            },
            twitter: {
                card: 'summary_large_image',
                title: `${baseName} | Gallery`,
                description,
            },
            alternates: {
                canonical: `${baseUrl}/gallery`,
            },
        };

        return applySocialOverrides(base, social, '/gallery', { baseUrl, fallbackImage: config?.ogImage });
    } catch (error) {
        console.error('Error generating metadata:', error);
        return {
            title: 'Gallery | Portfolio',
            description: 'A collection of my photography and visual work.',
        };
    }
}

export default async function GalleryPage() {
    const [images, config] = await Promise.all([getGalleryData(), getConfigData()]);
    return <GalleryClient initialImages={images} initialConfig={config} />;
}
