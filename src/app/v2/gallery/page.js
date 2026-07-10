import GalleryV2 from '../../components/gallery/v2/GalleryV2';
import BreadcrumbSchema from '../../components/shared/BreadcrumbSchema';
import { getConfigData, getGalleryData } from '@/lib/dataFetchers';
import { getSiteUrl } from '@/lib/siteUrl';
import { v2PublicPath } from '@/lib/siteVersion';

export const revalidate = 0;

export async function generateMetadata() {
    const config = await getConfigData();
    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
    const baseUrl = getSiteUrl();
    const description = 'A pure photo wall — the visual archive with nothing but the frames. V2 edition.';

    return {
        title: `${baseName} | Gallery`,
        description,
        openGraph: {
            title: `${baseName} | Gallery`,
            description,
            url: `${baseUrl}${v2PublicPath(config, '/gallery')}`,
            type: 'website',
        },
        alternates: {
            canonical: `${baseUrl}${v2PublicPath(config, '/gallery')}`,
        },
    };
}

export default async function GalleryV2Page() {
    const [images, config] = await Promise.all([getGalleryData(), getConfigData()]);
    return (
        <>
            <BreadcrumbSchema path="/gallery" name="Gallery" />
            <GalleryV2 initialImages={images} initialConfig={config} />
        </>
    );
}
