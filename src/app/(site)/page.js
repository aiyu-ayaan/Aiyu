import dynamic from "next/dynamic";
import HomeLazySections from "../components/landing/HomeLazySections";
import HomeSnapshot from "../components/landing/HomeSnapshot";
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
        <HomeSnapshot
          stats={stats}
          recentProjectNames={recentProjectNames}
          recentBlogTitles={recentBlogTitles}
        />
      </ViewportLazySection>

      <HomeLazySections
        aboutData={serializedAboutData}
        projectsData={serializedProjectsData}
        blogsData={serializedBlogsData}
      />
    </div>
  );
}
