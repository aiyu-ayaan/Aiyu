import dbConnect from '@/lib/db';
import ConfigModel from '@/models/Config';
import ContactPageClient from './ContactPageClient';

export async function generateMetadata() {
    await dbConnect();
    const config = await ConfigModel.findOne().lean();
    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';

    return {
        title: `${baseName} | Contact`,
        description: 'Let\'s collaborate on something amazing.',
    };
}

export default async function ContactPage() {
    await dbConnect();
    const config = await ConfigModel.findOne().lean();

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
