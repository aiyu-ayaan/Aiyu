import V2Header from "./V2Header";
import V2Footer from "./V2Footer";
import V2Backdrop from "./V2Backdrop";
import AnalyticsBeacon from "../../shared/AnalyticsBeacon";

/**
 * Points the header's resume nav link at the configured resume (uploaded file
 * -> /api/resume, otherwise the URL) or removes it. Mutates `serializedHeaderData`.
 * Shared by the Next v2 layout and the Vite app shell.
 */
export function applyResumeLink(serializedHeaderData, serializedConfigData) {
    if (serializedHeaderData && serializedHeaderData.navLinks) {
        const resumeLinkIndex = serializedHeaderData.navLinks.findIndex(link => 
            link.name === '_resume' || 
            link.name === 'resume' || 
            link.href === '/api/resume' || 
            link.href === '/resume.pdf'
        );

        const hasResume = serializedConfigData?.resume?.value;
        const resumeType = serializedConfigData?.resume?.type;

        if (hasResume) {
            const existingLink = resumeLinkIndex !== -1 ? serializedHeaderData.navLinks[resumeLinkIndex] : null;
            const newResumeLink = {
                name: existingLink ? existingLink.name : '_resume',
                href: resumeType === 'file' ? '/api/resume' : serializedConfigData.resume.value,
                target: '_blank'
            };

            if (resumeLinkIndex !== -1) {
                // Update existing link
                serializedHeaderData.navLinks[resumeLinkIndex] = {
                    ...existingLink,
                    ...newResumeLink
                };
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

}

/** The v2 editorial chrome around every public page. */
export default function V2Chrome({ logoText, headerData, configData, socialData, aboutName, packageVersion, children }) {
    return (
        <div className="relative" data-v2-shell="true">
            <V2Backdrop />

            <div className="relative z-10">
                <V2Header logoText={logoText} data={headerData} config={configData} socialData={socialData} />
                <main className="min-h-screen">
                    {children}
                </main>
                <V2Footer
                    name={aboutName}
                    config={configData}
                    socialData={socialData}
                    packageVersion={packageVersion}
                />
            </div>
            <AnalyticsBeacon />
        </div>
    );
}
