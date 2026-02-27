import Header from "../components/Header";

import Footer from "../components/Footer";
import N8nChat from "../components/shared/N8nChat";
import { getLayoutData } from "@/lib/dataFetchers";

// Use ISR instead of force-dynamic: revalidate every 60 seconds
// Pages are served from cache and re-generated in background
export const revalidate = 60;

export default async function SiteLayout({ children }) {
    const { headerData: serializedHeaderData, socialData: serializedSocialData, configData: serializedConfigData, aboutData: serializedAboutData } = await getLayoutData();
    // Default to empty string if config doesn't exist yet
    const n8nWebhookUrl = serializedConfigData?.n8nWebhookUrl || '';
    const logoText = serializedConfigData?.logoText || '< aiyu />';

    // Handle Resume Link Logic
    if (serializedHeaderData && serializedHeaderData.navLinks) {
        const resumeLinkIndex = serializedHeaderData.navLinks.findIndex(link => link.name === '_resume');

        const hasResume = serializedConfigData?.resume?.value;
        const resumeType = serializedConfigData?.resume?.type;

        if (hasResume) {
            const newResumeLink = {
                name: '_resume',
                href: resumeType === 'file' ? '/api/resume' : serializedConfigData.resume.value,
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
            <Header
                data={serializedHeaderData}
                logoText={logoText}
                socialData={serializedSocialData}
                config={serializedConfigData}
            />
            <main className="min-h-screen">
                {children}
            </main>
            <Footer socialData={serializedSocialData} name={serializedAboutData?.name} config={serializedConfigData} />
            <N8nChat webhookUrl={n8nWebhookUrl} />
        </>
    );
}
