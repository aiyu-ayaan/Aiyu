import GalleryV2 from '../../components/gallery/v2/GalleryV2';
import { getConfigData, getGalleryData } from '@/lib/dataFetchers';
import { getSiteUrl } from '@/lib/siteUrl';

export const revalidate = 0;

export async function generateMetadata() {
    const config = await getConfigData();
    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
    const baseUrl = getSiteUrl();
    const description = 'A pure photo wall — the visual archive with nothing but the frames. V2 edition.';

    return {
        title: `${baseName} | Gallery — V2`,
        description,
        openGraph: {
            title: `${baseName} | Gallery — V2`,
            description,
            url: `${baseUrl}/v2/gallery`,
            type: 'website',
        },
        alternates: {
            canonical: `${baseUrl}/v2/gallery`,
        },
    };
}

export default async function GalleryV2Page() {
    const [images, config] = await Promise.all([getGalleryData(), getConfigData()]);
    return <GalleryV2 initialImages={images} initialConfig={config} />;
}
