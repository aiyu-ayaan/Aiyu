import { notFound } from 'next/navigation';
import Link from 'next/link';
import { AI_SECTION_COMPONENTS } from '@/app/components/ai/v2/registry';
import { resolveNavLabel } from '@/app/components/shared/BreadcrumbSchema';
import TrackView from '@/app/components/shared/TrackView';
import { getAiPageData, getConfigData, getLayoutData } from '@/lib/dataFetchers';
import { getSiteUrl } from '@/lib/siteUrl';
import { v2PublicPath } from '@/lib/siteVersion';
import { findRenderableSection, getSubPageBySlug } from '@/lib/aiSubPages';
import { buildBreadcrumbList } from '@/app/schema';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

function resolveOgImage(config, baseUrl) {
    const raw = typeof config?.ogImage === 'string' ? config.ogImage.trim() : '';
    if (!raw) return `${baseUrl}/og-image.png`;
    try {
        return new URL(raw, baseUrl).toString();
    } catch {
        return `${baseUrl}/og-image.png`;
    }
}

function describeSection(section, route) {
    const raw = String(section?.subtitle || section?.title || route?.fallbackTitle || 'AI Hub').trim();
    return raw.slice(0, 160);
}

export async function generateMetadata({ params }) {
    const { section: slug } = await params;
    const route = getSubPageBySlug(slug);
    const config = await getConfigData();
    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
    const baseUrl = getSiteUrl();

    if (!route) {
        return {
            title: `Not Found | ${baseName}`,
            robots: { index: false, follow: false },
        };
    }

    const { config: aiConfig } = await getAiPageData();
    const section = findRenderableSection(aiConfig, route.type);

    if (!section) {
        return {
            title: `${baseName} | AI Hub`,
            robots: { index: false, follow: false },
        };
    }

    const url = `${baseUrl}${v2PublicPath(config, `/ai/${route.slug}`)}`;
    const heading = section.title || route.fallbackTitle;
    const title = `${baseName} | ${heading}`;
    const description = describeSection(section, route);
    const ogImage = resolveOgImage(config, baseUrl);

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            url,
            type: 'website',
            siteName: baseName,
            images: [{ url: ogImage, width: 1200, height: 630, alt: `${baseName} — ${heading}` }],
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [ogImage],
        },
        robots: {
            index: true,
            follow: true,
            googleBot: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1',
        },
        alternates: {
            canonical: url,
        },
    };
}

export default async function AiSectionPage({ params }) {
    const { section: slug } = await params;
    const route = getSubPageBySlug(slug);
    if (!route) notFound();

    const [{ config: aiConfig, stats }, siteConfig, { headerData }] = await Promise.all([
        getAiPageData(),
        getConfigData(),
        getLayoutData(),
    ]);

    const section = findRenderableSection(aiConfig, route.type);
    const Component = section ? AI_SECTION_COMPONENTS[section.type] : null;
    if (!section || !Component) notFound();

    const baseUrl = getSiteUrl();
    const hubPath = v2PublicPath(siteConfig, '/ai');
    const url = `${baseUrl}${v2PublicPath(siteConfig, `/ai/${route.slug}`)}`;
    const hubLabel = resolveNavLabel(headerData?.navLinks, '/ai', 'AI Hub');
    const heading = section.title || route.fallbackTitle;

    const breadcrumb = {
        '@context': 'https://schema.org',
        ...buildBreadcrumbList([
            { name: 'Home', item: baseUrl },
            { name: hubLabel, item: `${baseUrl}${hubPath}` },
            { name: heading, item: url },
        ]),
    };

    const extra = section.type === 'stats' ? { stats } : {};

    return (
        <main className="relative overflow-hidden">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
            />
            <TrackView entityType="ai-section" entityId={route.slug} entitySlug={route.slug} />

            <div className="mx-auto w-full max-w-7xl px-6 pt-28 sm:pt-32 lg:px-10">
                <Link
                    href={hubPath}
                    className="group inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] transition-colors duration-200"
                    style={{ color: 'var(--text-muted)' }}
                >
                    <span className="transition-transform duration-300 group-hover:-translate-x-1">←</span>
                    {hubLabel}
                </Link>
            </div>

            <Component index="01" section={section} {...extra} />
        </main>
    );
}
