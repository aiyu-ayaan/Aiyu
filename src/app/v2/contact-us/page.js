import ContactV2 from '../../components/contact/v2/ContactV2';
import BreadcrumbSchema from '../../components/shared/BreadcrumbSchema';
import { getConfigData } from '@/lib/dataFetchers';
import { getSiteUrl } from '@/lib/siteUrl';
import { v2PublicPath } from '@/lib/siteVersion';
import { getSocialMeta, applySocialOverrides } from '@/lib/socialMeta';

export const revalidate = 0;

export async function generateMetadata() {
    const [config, social] = await Promise.all([getConfigData(), getSocialMeta()]);
    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
    const baseUrl = getSiteUrl();
    const description = "Let's collaborate on something amazing.";

    const base = {
        title: `${baseName} | Contact`,
        description,
        openGraph: {
            title: `${baseName} | Contact`,
            description,
            url: `${baseUrl}${v2PublicPath(config, '/contact-us')}`,
            type: 'website',
        },
        alternates: {
            canonical: `${baseUrl}${v2PublicPath(config, '/contact-us')}`,
        },
    };

    return applySocialOverrides(base, social, '/contact-us', { baseUrl, fallbackImage: config?.ogImage });
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
        <>
            <BreadcrumbSchema path="/contact-us" name="Contact" />
            <ContactV2
                location={location}
                status={status}
                email={email}
                hasResume={hasResume}
                resumeHref={resumeHref}
            />
        </>
    );
}
