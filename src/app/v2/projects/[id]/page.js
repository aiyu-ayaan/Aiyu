import { notFound, permanentRedirect } from 'next/navigation';
import { cache } from 'react';
import ProjectDetailV2 from '../../../components/projects/v2/ProjectDetailV2';
import BreadcrumbSchema from '../../../components/shared/BreadcrumbSchema';
import TrackView from '../../../components/shared/TrackView';
import { getConfigData } from '@/lib/dataFetchers';
import { getProjectSlug, resolveProjectByIdentifier } from '@/lib/contentSlugs';
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

const getProjectByIdentifier = cache(async (identifier) => {
    return resolveProjectByIdentifier(null, identifier);
});

export async function generateMetadata({ params }) {
    const { id: identifier } = await params;
    const [config, project] = await Promise.all([getConfigData(), getProjectByIdentifier(identifier)]);

    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
    const baseUrl = getSiteUrl();

    if (!project) {
        return {
            title: `Project Not Found | ${baseName}`,
            robots: { index: false, follow: false },
        };
    }

    const canonicalUrl = `${baseUrl}${v2PublicPath(config, `/projects/${getProjectSlug(project)}`)}`;
    const description = String(project?.description || 'Project details').slice(0, 160);
    const ogImage = (typeof project?.image === 'string' && project.image.trim())
        || (typeof config?.ogImage === 'string' && config.ogImage.trim())
        || `${baseUrl}/og-image.png`;

    return {
        title: `${baseName} | ${project.name}`,
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
            title: project.name,
            description,
            url: canonicalUrl,
            type: 'article',
            images: [{ url: ogImage, width: 1200, height: 630 }],
        },
        twitter: {
            card: 'summary_large_image',
            title: project.name,
            description,
            images: [ogImage],
        },
        alternates: {
            canonical: canonicalUrl,
        },
    };
}

/**
 * /v2/projects/[id] — the same project data and view tracking as the classic
 * detail page, rendered under the v2 chrome (see ProjectDetailV2) so visitors
 * arriving from /v2/projects stay inside the v2 shell instead of bouncing to v1.
 */
export default async function ProjectDetailV2Page({ params }) {
    const { id: identifier } = await params;
    const [project, config] = await Promise.all([
        getProjectByIdentifier(identifier),
        getConfigData(),
    ]);

    if (!project) {
        notFound();
    }

    const canonicalSlug = getProjectSlug(project);
    if (identifier !== canonicalSlug) {
        permanentRedirect(v2PublicPath(config, `/projects/${canonicalSlug}`));
    }

    const baseUrl = getSiteUrl();
    const canonicalUrl = `${baseUrl}${v2PublicPath(config, `/projects/${canonicalSlug}`)}`;
    const stackList = Array.isArray(project?.techStack) ? project.techStack : [];

    const projectSchema = {
        '@context': 'https://schema.org',
        '@type': 'SoftwareSourceCode',
        name: project.name,
        description: project.description || undefined,
        url: canonicalUrl,
        ...(project?.image ? { image: project.image } : {}),
        ...(stackList.length > 0 ? { programmingLanguage: stackList } : {}),
        ...(isExternalHttpUrl(project?.codeLink) ? { codeRepository: project.codeLink } : {}),
        author: {
            '@type': 'Person',
            name: process.env.NEXT_PUBLIC_AUTHOR_NAME || 'Portfolio Owner',
        },
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': canonicalUrl,
        },
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(projectSchema) }}
            />
            <BreadcrumbSchema
                path="/projects"
                name="Projects"
                trail={[{ name: project.name, path: `/projects/${canonicalSlug}` }]}
            />
            <TrackView entityType="project" entityId={project?._id} entitySlug={canonicalSlug} />
            <ProjectDetailV2 project={project} backHref={v2PublicPath(config, '/projects')} />
        </>
    );
}
