import Link from "next/link";
import dynamic from "next/dynamic";
import HomeLazySections from "../components/landing/HomeLazySections";
import ViewportLazySection from "../components/shared/ViewportLazySection";
import WebMCPTools from "../components/agent/WebMCPTools";
import { getHomePageData, getConfigData } from "@/lib/dataFetchers";
import { generateWebsiteSchema, generatePersonSchema, generateOrganizationSchema } from "@/app/schema";
import { getSiteUrl } from '@/lib/siteUrl';

const FuturisticResume = dynamic(() => import("../components/landing/FuturisticResume"), {
  loading: () => <div className="h-screen" />,
});
const GamePortfolio = dynamic(() => import("../components/landing/GamePortfolio"), {
  loading: () => <div className="h-screen" />,
});
export const revalidate = 0;

export async function generateMetadata() {
  const config = await getConfigData();

  const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
  const siteTitle = `${baseName} | ${config?.profession || 'Software Engineer'} Portfolio`;
  const baseUrl = getSiteUrl();
  const siteDescription = config?.siteDescription || 'Professional portfolio showcasing projects, blogs, and expertise.';
  const ogImage = (typeof config?.ogImage === 'string' ? config.ogImage : typeof config?.ogImage?.value === 'string' && config.ogImage.value.length > 0 ? config.ogImage.value : null) || `${baseUrl}/og-image.png`;

  return {
    title: siteTitle,
    description: siteDescription,
    keywords: ['portfolio', 'developer', 'projects', 'blogs', 'web development', config?.profession || 'full stack', 'freelance'].join(', '),
    openGraph: {
      title: siteTitle,
      description: siteDescription,
      url: baseUrl,
      type: 'website',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: baseName,
        },
      ],
      locale: 'en_US',
      siteName: siteTitle,
    },
    twitter: {
      card: 'summary_large_image',
      title: siteTitle,
      description: siteDescription,
      images: [ogImage],
    },
    alternates: {
      canonical: baseUrl,
    },
  };
}

export default async function Home() {
  const {
    homeData: serializedHomeData,
    aboutData: serializedAboutData,
    projectsData: serializedProjectsData,
    blogsData: serializedBlogsData,
    configData: serializedConfigData,
  } = await getHomePageData();

  const baseUrl = getSiteUrl();

  const projects = Array.isArray(serializedProjectsData) ? serializedProjectsData : [];
  const blogs = Array.isArray(serializedBlogsData) ? serializedBlogsData : [];
  const skills = Array.isArray(serializedAboutData?.skills) ? serializedAboutData.skills : [];
  const experiences = Array.isArray(serializedAboutData?.experiences) ? serializedAboutData.experiences : [];

  // Generate structured data
  const websiteSchema = generateWebsiteSchema(baseUrl, serializedConfigData?.siteTitle || 'Portfolio');
  const organizationSchema = generateOrganizationSchema(serializedConfigData, baseUrl);
  const personSchema = generatePersonSchema(serializedConfigData);

  const stats = [
    { label: 'Projects Built', value: projects.length, accent: 'var(--accent-cyan)' },
    { label: 'Core Skills', value: skills.length, accent: 'var(--accent-purple)' },
    { label: 'Experience Entries', value: experiences.length, accent: 'var(--accent-orange)' },
    { label: 'Published Blogs', value: blogs.length, accent: 'var(--accent-pink)' },
  ];

  const recentProjectNames = projects.slice(0, 3).map((project) => project?.name).filter(Boolean);
  const recentBlogTitles = [...blogs]
    .sort((a, b) => new Date(b?.createdAt || b?.date || 0) - new Date(a?.createdAt || a?.date || 0))
    .slice(0, 2)
    .map((blog) => blog?.title)
    .filter(Boolean);

  return (
    <div className="relative overflow-hidden">
      <WebMCPTools />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([websiteSchema, organizationSchema, personSchema]),
        }}
      />

      {serializedHomeData?.heroSectionType === 'game' ? (
        <GamePortfolio data={serializedHomeData} />
      ) : (
        <FuturisticResume data={serializedHomeData} />
      )}

      <ViewportLazySection
        id="home-snapshot"
        className="relative z-20 px-4 pb-10 lg:px-8 lg:pb-12"
        placeholderHeight={380}
        rootMargin="180px 0px"
        initialDelayMs={220}
      >
        <div className="mx-auto w-full max-w-[95%] lg:max-w-[80%] rounded-3xl border p-5 sm:p-7"
          style={{
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 92%, transparent), color-mix(in srgb, var(--bg-secondary) 92%, transparent))',
            borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
            boxShadow: '0 16px 36px var(--shadow-sm)',
          }}
        >
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="mb-2 inline-flex rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em]"
                style={{
                  borderColor: 'color-mix(in srgb, var(--accent-cyan) 42%, var(--border-secondary))',
                  color: 'var(--accent-cyan)',
                }}
              >
                Portfolio Snapshot
              </p>
              <h2 className="text-2xl font-bold sm:text-3xl" style={{ color: 'var(--text-primary)' }}>
                Explore Highlights Across Home, Projects, and Writing
              </h2>
            </div>
            <Link
              href="/projects"
              className="inline-flex items-center rounded-lg border px-4 py-2 text-sm font-semibold transition-colors duration-200"
              style={{
                borderColor: 'var(--accent-cyan)',
                color: 'var(--accent-cyan)',
                backgroundColor: 'color-mix(in srgb, var(--accent-cyan) 9%, transparent)',
              }}
            >
              Browse Full Projects
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {stats.map((item) => (
              <div
                key={item.label}
                className="rounded-xl border p-3"
                style={{
                  borderColor: 'color-mix(in srgb, var(--border-secondary) 70%, transparent)',
                  backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 84%, transparent)',
                }}
              >
                <p className="text-2xl font-bold" style={{ color: item.accent }}>{item.value}</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {[
              { href: '#home-tech', label: 'Tech Stack' },
              { href: '#home-about', label: 'About Highlights' },
              { href: '#home-projects', label: 'Featured Projects' },
              { href: '#home-blogs', label: 'Recent Blogs' },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-lg border px-3 py-2 text-sm font-medium"
                style={{
                  borderColor: 'color-mix(in srgb, var(--border-secondary) 76%, transparent)',
                  color: 'var(--text-secondary)',
                  backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 75%, transparent)',
                }}
              >
                {item.label}
              </a>
            ))}
          </div>

          {(recentProjectNames.length > 0 || recentBlogTitles.length > 0) && (
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-xl border p-3" style={{ borderColor: 'color-mix(in srgb, var(--border-secondary) 74%, transparent)' }}>
                <p className="mb-2 text-xs uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Project Picks</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {recentProjectNames.length ? recentProjectNames.join(' • ') : 'Projects will appear here soon.'}
                </p>
              </div>
              <div className="rounded-xl border p-3" style={{ borderColor: 'color-mix(in srgb, var(--border-secondary) 74%, transparent)' }}>
                <p className="mb-2 text-xs uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Latest Writing</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {recentBlogTitles.length ? recentBlogTitles.join(' • ') : 'Blog updates coming soon.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </ViewportLazySection>

      <HomeLazySections
        aboutData={serializedAboutData}
        projectsData={serializedProjectsData}
        blogsData={serializedBlogsData}
      />
    </div>
  );
}
