import AiHub from '@/app/components/ai/v2/AiHub';
import { getAiPageData, getConfigData } from '@/lib/dataFetchers';
import { getSiteUrl } from '@/lib/siteUrl';
import { v2PublicPath } from '@/lib/siteVersion';

export const revalidate = 0;

export async function generateMetadata() {
    const config = await getConfigData();
    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
    const baseUrl = getSiteUrl();
    const title = `${baseName} | AI Hub`;
    const description =
        'The AI stack I build with — skills, recommended tools, free-credit resources, live telemetry, and a reusable prompt library.';

    return {
        title,
        description,
        keywords: [
            'AI developer',
            'AI tools',
            'free AI credits',
            'free AI API',
            'RAG',
            'prompt engineering',
            'LLM',
            'Groq',
            'OpenRouter',
            'Gemini',
        ],
        openGraph: {
            title,
            description,
            url: `${baseUrl}${v2PublicPath(config, '/ai')}`,
            type: 'website',
        },
        alternates: {
            canonical: `${baseUrl}${v2PublicPath(config, '/ai')}`,
        },
    };
}

export default async function AiHubPage() {
    const { config, stats } = await getAiPageData();
    return <AiHub config={config} stats={stats} />;
}
