import { getConfigData } from '@/lib/dataFetchers';
import ContactPageClient from './ContactPageClient';
import { getSiteUrl } from '@/lib/siteUrl';

export const revalidate = 0;

export async function generateMetadata() {
    const config = await getConfigData();
    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
    const baseUrl = getSiteUrl();
    const description = 'Let\'s collaborate on something amazing.';
    const ogImage = (typeof config?.ogImage === 'string' ? config.ogImage : typeof config?.ogImage?.value === 'string' && config.ogImage.value.length > 0 ? config.ogImage.value : null) || `${baseUrl}/og-image.png`;

    return {
        title: `${baseName} | Contact`,
        description,
        keywords: ['contact', 'collaborate', 'inquiry', 'email', 'reach out', 'get in touch'].join(', '),
        robots: {
            index: true,
            follow: true,
            googleBot: {
                index: true,
                follow: true,
                'max-snippet': -1,
                'max-image-preview': 'large',
                'max-video-preview': -1,
            },
        },
        openGraph: {
            title: `${baseName} | Contact`,
            description,
            url: `${baseUrl}/contact-us`,
            type: 'website',
            images: [{ url: ogImage, width: 1200, height: 630 }],
        },
        twitter: {
            card: 'summary_large_image',
            title: `${baseName} | Contact`,
            description,
            images: [ogImage],
        },
        alternates: {
            canonical: `${baseUrl}/contact-us`,
        },
    };
}

export default async function ContactPage() {
    const config = await getConfigData();

    const location = config?.contactLocation || 'Remote / Worldwide';
    const status = config?.contactStatus || 'Open to opportunities';
    const email = config?.contactEmail;

    // Resume Logic
    let resumeHref = '#';
    let hasResume = false;

    if (config?.resume?.value) {
        hasResume = true;
        resumeHref = config.resume.type === 'file' ? '/api/resume' : config.resume.value;
    }

    return (
        <ContactPageClient
            location={location}
            status={status}
            email={email}
            hasResume={hasResume}
            resumeHref={resumeHref}
        />
    );
}
