import dynamic from 'next/dynamic';
import { getConfigData, getAboutData } from "@/lib/dataFetchers";

const About = dynamic(() => import('../../components/about/About'), {
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
  const config = await getConfigData();
  const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const description = 'Learn more about my background, skills, and experience.';
  const ogImage = (typeof config?.ogImage === 'string' ? config.ogImage : typeof config?.ogImage?.value === 'string' && config.ogImage.value.length > 0 ? config.ogImage.value : null) || `${baseUrl}/og-image.png`;

  return {
    title: `${baseName} | About Me`,
    description,
    keywords: ['about', 'developer', 'experience', 'skills', 'background', config?.profession || 'full stack'].join(', '),
    openGraph: {
      title: `${baseName} | About Me`,
      description,
      url: `${baseUrl}/about-me`,
      type: 'website',
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${baseName} | About Me`,
      description,
      images: [ogImage],
    },
    alternates: {
      canonical: `${baseUrl}/about-me`,
    },
  };
}
export default async function AboutPage() {
  const serializedAboutData = await getAboutData();
  return <About data={serializedAboutData} />;
}
