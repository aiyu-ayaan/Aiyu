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

export default async function Home() {
  await dbConnect();
  const homeData = await HomeModel.findOne().lean();
  const aboutData = await AboutModel.findOne().lean();
  const projectsData = await ProjectModel.find().lean();
  const blogsData = await BlogModel.find({ published: { $ne: false } }).sort({ createdAt: -1 }).limit(3).lean();

  // Serialize data to plain objects
  const serializedHomeData = JSON.parse(JSON.stringify(homeData));
  const serializedAboutData = JSON.parse(JSON.stringify(aboutData));
  const serializedProjectsData = JSON.parse(JSON.stringify(projectsData));
  const serializedBlogsData = JSON.parse(JSON.stringify(blogsData));

  return (
    <div>
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
