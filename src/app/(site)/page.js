import FuturisticResume from "../components/landing/FuturisticResume";
import GamePortfolio from "../components/landing/GamePortfolio";
import HomeAbout from "../components/landing/HomeAbout";
import HomeProjects from "../components/landing/HomeProjects";
import Divider from "../components/landing/Divider";
import TechStackCarousel from "../components/landing/TechStackCarousel";
import HomeBlogs from "../components/landing/HomeBlogs";
import dbConnect from "@/lib/db";
import HomeModel from "@/models/Home";
import AboutModel from "@/models/About";
import ProjectModel from "@/models/Project";
import BlogModel from "@/models/Blog";
import ConfigModel from "@/models/Config";
import { generateWebsiteSchema, generatePersonSchema, generateOrganizationSchema } from "@/app/schema";

export async function generateMetadata() {
  await dbConnect();
  const config = await ConfigModel.findOne().lean();

  const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const siteDescription = config?.siteDescription || 'Professional portfolio showcasing projects, blogs, and expertise.';
  const ogImage = config?.ogImage || `${baseUrl}/og-image.png`;

  return {
    title: baseName,
    description: siteDescription,
    keywords: ['portfolio', 'developer', 'projects', 'blogs', 'web development', config?.profession || 'full stack', 'freelance'].join(', '),
    openGraph: {
      title: baseName,
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
      siteName: baseName,
    },
    twitter: {
      card: 'summary_large_image',
      title: baseName,
      description: siteDescription,
      images: [ogImage],
    },
    alternates: {
      canonical: baseUrl,
    },
  };
}

export default async function Home() {
  await dbConnect();
  const homeData = await HomeModel.findOne().lean();
  const aboutData = await AboutModel.findOne().lean();
  const projectsData = await ProjectModel.find().lean();
  const blogsData = await BlogModel.find({ published: { $ne: false } }).sort({ createdAt: -1 }).limit(3).lean();
  const configData = await ConfigModel.findOne().lean();

  // Serialize data to plain objects
  const serializedHomeData = JSON.parse(JSON.stringify(homeData));
  const serializedAboutData = JSON.parse(JSON.stringify(aboutData));
  const serializedProjectsData = JSON.parse(JSON.stringify(projectsData));
  const serializedBlogsData = JSON.parse(JSON.stringify(blogsData));
  const serializedConfigData = JSON.parse(JSON.stringify(configData));

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  // Generate structured data
  const websiteSchema = generateWebsiteSchema(baseUrl, serializedConfigData?.siteTitle || 'Portfolio');
  const organizationSchema = generateOrganizationSchema(serializedConfigData, baseUrl);
  const personSchema = generatePersonSchema(serializedConfigData);

  return (
    <div>
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
      <TechStackCarousel data={serializedAboutData} />
      <Divider />
      <HomeAbout data={serializedAboutData} />
      <Divider />
      <HomeProjects data={serializedProjectsData} />
      <Divider />
      <HomeBlogs blogs={serializedBlogsData} />
    </div>
  );
}

