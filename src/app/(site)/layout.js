import V2Chrome, { applyResumeLink } from "../components/landing/v2/V2Chrome";
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
    const { headerData: serializedHeaderData, socialData: serializedSocialData, configData: serializedConfigData, aboutData: serializedAboutData } = await getLayoutData();

    const logoText = serializedConfigData?.logoText || '< aiyu />';
    const packageVersion = await getPackageVersion();

    applyResumeLink(serializedHeaderData, serializedConfigData);

    return (
        <V2Chrome
            logoText={logoText}
            headerData={serializedHeaderData}
            configData={serializedConfigData}
            socialData={serializedSocialData}
            aboutName={serializedAboutData?.name}
            packageVersion={packageVersion}
        >
            {children}
        </V2Chrome>
    );
}
