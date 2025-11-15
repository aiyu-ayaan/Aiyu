import About from "../components/about/About";
import { getAboutData } from "@/lib/api";

export default async function AboutPage() {
  const aboutData = await getAboutData();
  return <About aboutData={aboutData} />;
}