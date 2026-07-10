import { notFound, permanentRedirect } from 'next/navigation';
import { cache } from 'react';
import AppDetailV2 from '../../../components/deployments/v2/AppDetailV2';
import BreadcrumbSchema from '../../../components/shared/BreadcrumbSchema';
import TrackView from '../../../components/shared/TrackView';
import { getConfigData } from '@/lib/dataFetchers';
import { getDeploymentSlug, resolveDeploymentByIdentifier } from '@/lib/contentSlugs';
import { getSiteUrl } from '@/lib/siteUrl';
import { v2PublicPath } from '@/lib/siteVersion';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function isExternalHttpUrl(value) {
    if (typeof value !== 'string' || value.trim().length === 0) {
        return false;
    }
    try {
        const parsed = new URL(value);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

const getDeploymentByIdentifier = cache(async (identifier) => {
    return resolveDeploymentByIdentifier(null, identifier);
});

export async function generateMetadata({ params }) {
    const { id: identifier } = await params;
    const [config, deployment] = await Promise.all([getConfigData(), getDeploymentByIdentifier(identifier)]);

    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
    const baseUrl = getSiteUrl();

    if (!deployment) {
        return {
            title: `App Not Found | ${baseName}`,
            robots: { index: false, follow: false },
        };
    }

    const canonicalUrl = `${baseUrl}${v2PublicPath(config, `/apps/${getDeploymentSlug(deployment)}`)}`;
    const description = String(deployment?.description || 'App details').slice(0, 160);
    const ogImage = (typeof deployment?.image === 'string' && deployment.image.trim())
        || (typeof config?.ogImage === 'string' && config.ogImage.trim())
        || `${baseUrl}/og-image.png`;

    return {
        title: `${baseName} | ${deployment.name}`,
        description,
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
            title: deployment.name,
            description,
            url: canonicalUrl,
            type: 'website',
            images: [{ url: ogImage, width: 1200, height: 630 }],
        },
        twitter: {
            card: 'summary_large_image',
            title: deployment.name,
            description,
            images: [ogImage],
        },
        alternates: {
            canonical: canonicalUrl,
        },
    };
}

/**
 * /v2/apps/[id] — the same deployment data and view tracking as the classic
 * detail page, rendered under the v2 chrome (see AppDetailV2) so visitors
 * arriving from /v2/apps stay inside the v2 shell instead of bouncing to v1.
 */
export default async function AppDetailV2Page({ params }) {
    const { id: identifier } = await params;
    const [deployment, config] = await Promise.all([
        getDeploymentByIdentifier(identifier),
        getConfigData(),
    ]);

    if (!deployment) {
        notFound();
    }

    const canonicalSlug = getDeploymentSlug(deployment);
    if (identifier !== canonicalSlug) {
        permanentRedirect(v2PublicPath(config, `/apps/${canonicalSlug}`));
    }

    const baseUrl = getSiteUrl();
    const canonicalUrl = `${baseUrl}${v2PublicPath(config, `/apps/${canonicalSlug}`)}`;
    const stackList = Array.isArray(deployment?.techStack) ? deployment.techStack : [];

    const appSchema = {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: deployment.name,
        description: deployment.description || undefined,
        url: isExternalHttpUrl(deployment?.hostedUrl) ? deployment.hostedUrl : canonicalUrl,
        applicationCategory: deployment?.appType || 'WebApplication',
        operatingSystem: 'Web',
        ...(deployment?.image ? { image: deployment.image } : {}),
        ...(stackList.length > 0 ? { softwareRequirements: stackList.join(', ') } : {}),
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': canonicalUrl,
        },
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }}
            />
            <BreadcrumbSchema
                path="/apps"
                name="Apps"
                trail={[{ name: deployment.name, path: `/apps/${canonicalSlug}` }]}
            />
            <TrackView entityType="app" entityId={deployment?._id} entitySlug={canonicalSlug} />
            <AppDetailV2 deployment={deployment} backHref={v2PublicPath(config, '/apps')} />
        </>
    );
}
