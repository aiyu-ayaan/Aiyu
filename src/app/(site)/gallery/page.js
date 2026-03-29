import dynamic from 'next/dynamic';
import { getConfigData } from '@/lib/dataFetchers';

const GalleryClient = dynamic(() => import('./GalleryClient'), {
    loading: () => (
        <div className="min-h-screen p-4 lg:p-8">
            <div
                className="mx-auto max-w-6xl animate-pulse rounded-3xl border"
                style={{
                    minHeight: '460px',
                    borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)',
                    background:
                        'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 84%, transparent), color-mix(in srgb, var(--bg-secondary) 86%, transparent))',
                }}
            />
        </div>
    ),
});

export async function generateMetadata() {
    try {
        const config = await getConfigData();
        const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const description = 'A collection of my photography and visual work.';
        const ogImage = (typeof config?.ogImage === 'string' ? config.ogImage : typeof config?.ogImage?.value === 'string' && config.ogImage.value.length > 0 ? config.ogImage.value : null) || `${baseUrl}/og-image.png`;

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
