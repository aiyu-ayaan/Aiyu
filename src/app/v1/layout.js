import Header from "../components/Header";

import Footer from "../components/Footer";
import AnalyticsBeacon from "../components/shared/AnalyticsBeacon";
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
            <div aria-hidden="true" className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            'radial-gradient(circle at 50% -10%, color-mix(in srgb, var(--text-bright) 8%, transparent), transparent 34%), linear-gradient(180deg, color-mix(in srgb, var(--bg-tertiary) 78%, var(--bg-primary)), var(--bg-primary) 42%, color-mix(in srgb, var(--bg-secondary) 86%, var(--bg-primary)))',
                    }}
                />
                <div
                    className="absolute left-1/2 top-0 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full blur-3xl"
                    style={{
                        opacity: 0.08,
                        background: 'radial-gradient(circle, color-mix(in srgb, var(--apple-silver) 80%, var(--accent-cyan)), transparent 68%)',
                    }}
                />
                <div
                    className="absolute inset-x-0 top-0 h-px"
                    style={{
                        background: 'linear-gradient(90deg, transparent, color-mix(in srgb, var(--text-bright) 18%, transparent), transparent)',
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
            <AnalyticsBeacon />
        </div>
    );
}
