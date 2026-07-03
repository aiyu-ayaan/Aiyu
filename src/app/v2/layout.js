import V2Header from "../components/landing/v2/V2Header";
import V2Footer from "../components/landing/v2/V2Footer";
import V2Backdrop from "../components/landing/v2/V2Backdrop";
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

/**
 * Dedicated layout for the /v2 experience: same data plumbing as the site
 * layout, but with the v2 editorial chrome (mono command-bar header and
 * ledger footer) instead of the classic header/footer.
 */
export default async function V2Layout({ children }) {
    const { socialData: serializedSocialData, configData: serializedConfigData, aboutData: serializedAboutData } = await getLayoutData();

    const logoText = serializedConfigData?.logoText || '< aiyu />';
    const packageVersion = await getPackageVersion();

    return (
        <div className="relative" data-v2-shell="true">
            <V2Backdrop />

            <div className="relative z-10">
                <V2Header logoText={logoText} config={serializedConfigData} socialData={serializedSocialData} />
                <main className="min-h-screen">
                    {children}
                </main>
                <V2Footer
                    name={serializedAboutData?.name}
                    config={serializedConfigData}
                    socialData={serializedSocialData}
                    packageVersion={packageVersion}
                />
            </div>
            <AnalyticsBeacon />
        </div>
    );
}
