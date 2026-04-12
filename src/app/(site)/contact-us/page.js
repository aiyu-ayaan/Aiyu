import { getConfigData } from '@/lib/dataFetchers';
import ContactPageClient from './ContactPageClient';

// Always fetch fresh data - no caching
export const revalidate = 0;
export const dynamic = 'force-dynamic';

export async function generateMetadata() {
    const config = await getConfigData();
    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const description = 'Let\'s collaborate on something amazing.';
    const ogImage = (typeof config?.ogImage === 'string' ? config.ogImage : typeof config?.ogImage?.value === 'string' && config.ogImage.value.length > 0 ? config.ogImage.value : null) || `${baseUrl}/og-image.png`;

    return {
        title: `${baseName} | Contact`,
        description,
        keywords: ['contact', 'collaborate', 'inquiry', 'email', 'reach out', 'get in touch'].join(', '),
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
