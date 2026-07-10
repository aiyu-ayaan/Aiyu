import AiHub from '@/app/components/ai/v2/AiHub';
import { resolveNavLabel } from '@/app/components/shared/BreadcrumbSchema';
import { getAiPageData, getConfigData, getLayoutData } from '@/lib/dataFetchers';
import { getSiteUrl } from '@/lib/siteUrl';
import { v2PublicPath } from '@/lib/siteVersion';
import { generateAiHubSchema } from '@/app/schema';

export const revalidate = 0;

const AI_HUB_DESCRIPTION =
    'The AI stack I build with — skills my agents can use, recommended tools, free-credit resources, live telemetry, and a reusable prompt library.';

const AI_HUB_KEYWORDS = [
    'AI developer',
    'AI agent skills',
    'AI tools',
    'free AI credits',
    'free AI API',
    'RAG',
    'prompt engineering',
    'LLM',
    'Groq',
    'OpenRouter',
    'Gemini',
];

function resolveOgImage(config, baseUrl) {
    const raw =
        typeof config?.ogImage === 'string'
            ? config.ogImage
            : typeof config?.ogImage?.value === 'string'
              ? config.ogImage.value
              : '';
    const trimmed = raw.trim();
    if (!trimmed) return `${baseUrl}/og-image.png`;
    try {
        return new URL(trimmed, baseUrl).toString();
    } catch {
        return `${baseUrl}/og-image.png`;
    }
}

export async function generateMetadata() {
    const config = await getConfigData();
    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
    const baseUrl = getSiteUrl();
    const url = `${baseUrl}${v2PublicPath(config, '/ai')}`;
    const title = `${baseName} | AI Hub`;
    const ogImage = resolveOgImage(config, baseUrl);

    return {
        title,
        description: AI_HUB_DESCRIPTION,
        keywords: AI_HUB_KEYWORDS,
        openGraph: {
            title,
            description: AI_HUB_DESCRIPTION,
            url,
            type: 'website',
            siteName: baseName,
            images: [
                {
                    url: ogImage,
                    width: 1200,
                    height: 630,
                    alt: `${baseName} — AI Hub`,
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description: AI_HUB_DESCRIPTION,
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

export default async function AiHubPage() {
    const [{ config, stats }, siteConfig, { headerData }] = await Promise.all([
        getAiPageData(),
        getConfigData(),
        getLayoutData(),
    ]);
    const baseUrl = getSiteUrl();
    const baseName = siteConfig?.siteTitle || siteConfig?.logoText || 'Portfolio';
    const url = `${baseUrl}${v2PublicPath(siteConfig, '/ai')}`;

    const schema = generateAiHubSchema({
        siteUrl: baseUrl,
        url,
        title: `${baseName} | AI Hub`,
        description: AI_HUB_DESCRIPTION,
        sections: config?.sections,
        breadcrumbName: resolveNavLabel(headerData?.navLinks, '/ai', 'AI Hub'),
    });

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
            />
            <AiHub config={config} stats={stats} />
        </>
    );
}
