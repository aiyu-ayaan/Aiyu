import Header from "../components/Header";

import Footer from "../components/Footer";
import N8nChat from "../components/shared/N8nChat";
import dbConnect from "@/lib/db";
import HeaderModel from "@/models/Header";
import SocialModel from "@/models/Social";
import AboutModel from "@/models/About";

import ConfigModel from "@/models/Config";

// Force dynamic rendering for all site pages
// This prevents Next.js from trying to pre-render pages during Docker build
// Site pages require database access, so they must be rendered at runtime
export const dynamic = 'force-dynamic';

export default async function SiteLayout({ children }) {
    await dbConnect();
    // Fetch data for Header and Footer
    const headerData = await HeaderModel.findOne().lean();
    const socialData = await SocialModel.find().lean();
    const configData = await ConfigModel.findOne().lean();
    const aboutData = await AboutModel.findOne().lean();

    // Serialize data to plain objects to pass to client components
    const serializedHeaderData = JSON.parse(JSON.stringify(headerData));
    const serializedSocialData = JSON.parse(JSON.stringify(socialData));
    const serializedAboutData = JSON.parse(JSON.stringify(aboutData));
    // Default to empty string if config doesn't exist yet
    const n8nWebhookUrl = configData?.n8nWebhookUrl || '';
    const logoText = configData?.logoText || '< aiyu />';

    // Handle Resume Link Logic
    if (serializedHeaderData && serializedHeaderData.navLinks) {
        const resumeLinkIndex = serializedHeaderData.navLinks.findIndex(link => link.name === '_resume');

        const hasResume = configData?.resume?.value;
        const resumeType = configData?.resume?.type;

        if (hasResume) {
            const newResumeLink = {
                name: '_resume',
                href: resumeType === 'file' ? '/api/resume' : configData.resume.value,
                target: '_blank'
            };

            if (resumeLinkIndex !== -1) {
                // Update existing link
                serializedHeaderData.navLinks[resumeLinkIndex] = newResumeLink;
            } else {
                // Add new link
                serializedHeaderData.navLinks.push(newResumeLink);
            }
        } else {
            // Remove resume link if it exists but no resume configured
            if (resumeLinkIndex !== -1) {
                serializedHeaderData.navLinks.splice(resumeLinkIndex, 1);
            }
        }
    }

    return (
        <>
            <Header data={serializedHeaderData} logoText={logoText} />
            <main className="min-h-screen">
                {children}
            </main>
            <Footer socialData={serializedSocialData} name={serializedAboutData?.name} />
            <N8nChat webhookUrl={n8nWebhookUrl} />
        </>
    );
}
