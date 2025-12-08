import Header from "../components/Header";

import Footer from "../components/Footer";
import N8nChat from "../components/shared/N8nChat";
import dbConnect from "@/lib/db";
import HeaderModel from "@/models/Header";
import SocialModel from "@/models/Social";

import ConfigModel from "@/models/Config";

export default async function SiteLayout({ children }) {
    await dbConnect();
    // Fetch data for Header and Footer
    const headerData = await HeaderModel.findOne().lean();
    const socialData = await SocialModel.find().lean();
    const configData = await ConfigModel.findOne().lean();

    // Serialize data to plain objects to pass to client components
    const serializedHeaderData = JSON.parse(JSON.stringify(headerData));
    const serializedSocialData = JSON.parse(JSON.stringify(socialData));
    // Default to empty string if config doesn't exist yet
    const n8nWebhookUrl = configData?.n8nWebhookUrl || '';

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
            <Header data={serializedHeaderData} />
            <main className="min-h-screen">
                {children}
            </main>
            <Footer socialData={serializedSocialData} />
            <N8nChat webhookUrl={n8nWebhookUrl} />
        </>
    );
}
