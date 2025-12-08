import About from "../../components/about/About";
import dbConnect from "@/lib/db";
import AboutModel from "@/models/About";

export default async function AboutPage() {
  await dbConnect();
  const aboutData = await AboutModel.findOne().lean();
  const serializedAboutData = JSON.parse(JSON.stringify(aboutData));
  return <About data={serializedAboutData} />;
}