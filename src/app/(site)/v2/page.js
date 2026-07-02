import V2Hero from "../../components/landing/v2/V2Hero";
import V2Snapshot from "../../components/landing/v2/V2Snapshot";
import V2MissionControl from "../../components/landing/v2/V2MissionControl";
import V2LazySections from "../../components/landing/v2/V2LazySections";
import V2ScrollProgress from "../../components/landing/v2/V2ScrollProgress";
import ViewportLazySection from "../../components/shared/ViewportLazySection";
import { getHomePageData, getConfigData } from "@/lib/dataFetchers";
import { generateWebsiteSchema, generatePersonSchema, generateOrganizationSchema } from "@/app/schema";
import { getSiteUrl } from '@/lib/siteUrl';

export const revalidate = 0;

export async function generateMetadata() {
  const config = await getConfigData();

  const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
  const siteTitle = `${baseName} | ${config?.profession || 'Software Engineer'} Portfolio — V2`;
  const baseUrl = getSiteUrl();
  const siteDescription = config?.siteDescription || 'Professional portfolio showcasing projects, blogs, and expertise.';

  return {
    title: siteTitle,
    description: siteDescription,
    openGraph: {
      title: siteTitle,
      description: siteDescription,
      url: `${baseUrl}/v2`,
      type: 'website',
      locale: 'en_US',
      siteName: siteTitle,
    },
    alternates: {
      canonical: `${baseUrl}/v2`,
    },
  };
}

export default async function HomeV2() {
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([websiteSchema, organizationSchema, personSchema]),
        }}
      />

      <V2ScrollProgress />

      <V2Hero data={serializedHomeData} />

      <ViewportLazySection
        id="v2-snapshot"
        className="relative z-20 px-4 pb-10 lg:px-8 lg:pb-12"
        placeholderHeight={720}
        rootMargin="420px 0px"
        initialDelayMs={220}
      >
        <V2Snapshot
          stats={stats}
          recentProjectNames={recentProjectNames}
          recentBlogTitles={recentBlogTitles}
        />
      </ViewportLazySection>

      {serializedHomeData?.statusSection?.enabled !== false && (
        <ViewportLazySection
          id="v2-status"
          className="relative z-20 px-4 pb-10 lg:px-8 lg:pb-12"
          placeholderHeight={720}
          rootMargin="420px 0px"
        >
          <V2MissionControl data={serializedHomeData?.statusSection} />
        </ViewportLazySection>
      )}

      <V2LazySections
        aboutData={serializedAboutData}
        projectsData={serializedProjectsData}
        blogsData={serializedBlogsData}
        homeData={serializedHomeData}
      />
    </div>
  );
}
