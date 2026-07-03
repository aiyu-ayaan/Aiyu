import ContactV2 from '../../components/contact/v2/ContactV2';
import { getConfigData } from '@/lib/dataFetchers';
import { getSiteUrl } from '@/lib/siteUrl';
import { v2PublicPath } from '@/lib/siteVersion';

export const revalidate = 0;

export async function generateMetadata() {
    const config = await getConfigData();
    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
    const baseUrl = getSiteUrl();
    const description = "Let's collaborate on something amazing.";

    return {
        title: `${baseName} | Contact — V2`,
        description,
        openGraph: {
            title: `${baseName} | Contact — V2`,
            description,
            url: `${baseUrl}${v2PublicPath(config, '/contact-us')}`,
            type: 'website',
        },
        alternates: {
            canonical: `${baseUrl}${v2PublicPath(config, '/contact-us')}`,
        },
    };
}

export default async function ContactV2Page() {
    const config = await getConfigData();

    const location = config?.contactLocation || 'Remote / Worldwide';
    const status = config?.contactStatus || 'Open to opportunities';
    const email = config?.contactEmail;

    let resumeHref = '#';
    let hasResume = false;

    if (config?.resume?.value) {
        hasResume = true;
        resumeHref = config.resume.type === 'file' ? '/api/resume' : config.resume.value;
    }

    return (
        <ContactV2
            location={location}
            status={status}
            email={email}
            hasResume={hasResume}
            resumeHref={resumeHref}
        />
    );
}
