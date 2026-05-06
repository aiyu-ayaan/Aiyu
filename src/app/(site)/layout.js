import Header from "../components/Header";

import Footer from "../components/Footer";
import { getLayoutData } from "@/lib/dataFetchers";
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

let packageVersionPromise;

async function getPackageVersion() {
    if (packageVersionPromise) {
        return packageVersionPromise;
    }

    packageVersionPromise = (async () => {
        try {
            const packageJsonPath = path.join(process.cwd(), 'package.json');
            const packageJsonRaw = await fs.readFile(packageJsonPath, 'utf8');
            const packageJson = JSON.parse(packageJsonRaw);
            return packageJson?.version ? String(packageJson.version) : null;
        } catch {
            return null;
        }
    })();

    return packageVersionPromise;
}

export default async function SiteLayout({ children }) {
    const { headerData: serializedHeaderData, socialData: serializedSocialData, configData: serializedConfigData, aboutData: serializedAboutData } = await getLayoutData();
    // Default to empty string if config doesn't exist yet

    const logoText = serializedConfigData?.logoText || '< aiyu />';

    const packageVersion = await getPackageVersion();

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
        <div className="relative">
            <div aria-hidden="true" className="absolute inset-0 pointer-events-none z-0">
                <div
                    className="absolute inset-0"
                    style={{
                        opacity: 0.075,
                        backgroundImage: 'linear-gradient(color-mix(in srgb, var(--accent-cyan) 24%, var(--border-secondary)) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--accent-cyan) 24%, var(--border-secondary)) 1px, transparent 1px)',
                        backgroundSize: '40px 40px',
                    }}
                />
            </div>

            <div className="relative z-10">
                <Header
                    data={serializedHeaderData}
                    logoText={logoText}
                    socialData={serializedSocialData}
                    config={serializedConfigData}
                />
                <main className="min-h-screen">
                    {children}
                </main>
                <Footer socialData={serializedSocialData} name={serializedAboutData?.name} config={serializedConfigData} packageVersion={packageVersion} />
            </div>
        </div>
    );
}
