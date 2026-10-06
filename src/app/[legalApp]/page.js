import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import LegalShell from '../components/legal/LegalShell';
import { getPublicLegalApp, getLinkedDeployment, legalAppPath, legalDocumentPath } from '@/lib/legal';
import { getConfigData } from '@/lib/dataFetchers';
import { getSiteUrl } from '@/lib/siteUrl';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// A hub with no published documents is a dead end, so it 404s like a missing app.
const loadApp = cache(async (slug) => {
    const app = await getPublicLegalApp(slug);
    return app && app.documents.length > 0 ? app : null;
});

function describe(app) {
    if (app.description) return app.description.slice(0, 160);
    const titles = app.documents.map((d) => d.title).join(', ');
    return `Legal information for ${app.name}: ${titles}.`.slice(0, 160);
}

export async function generateMetadata({ params }) {
    const { legalApp } = await params;
    const [config, app] = await Promise.all([getConfigData(), loadApp(legalApp)]);
    const siteName = config?.siteTitle || config?.logoText || 'Portfolio';

    if (!app) {
        return { title: `Not Found | ${siteName}`, robots: { index: false, follow: false } };
    }

    const url = `${getSiteUrl()}${legalAppPath(app)}`;
    const title = `${app.name} — Legal`;
    return {
        title: `${title} | ${siteName}`,
        description: describe(app),
        alternates: { canonical: url },
        robots: { index: true, follow: true },
        openGraph: { title, description: describe(app), url, type: 'website', siteName },
        twitter: { card: 'summary', title, description: describe(app) },
    };
}

export default async function LegalAppPage({ params }) {
    const { legalApp } = await params;
    const app = await loadApp(legalApp);
    if (!app) notFound();

    const linkedApp = await getLinkedDeployment(app);
    const baseUrl = getSiteUrl();

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: `${app.name} — Legal`,
        description: describe(app),
        url: `${baseUrl}${legalAppPath(app)}`,
        hasPart: app.documents.map((doc) => ({
            '@type': 'WebPage',
            name: doc.title,
            url: `${baseUrl}${legalDocumentPath(app, doc)}`,
        })),
    };

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            <LegalShell
                eyebrow="~/legal"
                title={app.name}
                meta={app.packageName ? [`package: ${app.packageName}`] : []}
                app={app}
                linkedApp={linkedApp}
            >
                {app.description && (
                    <p className="mb-8 text-lg leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>{app.description}</p>
                )}
                <ul className="divide-y" style={{ borderColor: 'var(--border-primary)' }}>
                    {app.documents.map((doc, index) => (
                        <li key={doc.slug} className="border-t first:border-t-0" style={{ borderColor: 'var(--border-primary)' }}>
                            <Link href={legalDocumentPath(app, doc)} className="group flex items-baseline gap-4 py-5">
                                <span className="font-mono text-xs" style={{ color: 'var(--accent-cyan)' }}>{String(index + 1).padStart(2, '0')}</span>
                                <span className="flex-1">
                                    <span className="block text-xl font-semibold group-hover:underline underline-offset-4" style={{ color: 'var(--text-bright)' }}>{doc.title}</span>
                                    <span className="mt-1 block font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>{legalDocumentPath(app, doc)}</span>
                                </span>
                                <span aria-hidden="true" style={{ color: 'var(--accent-cyan)' }}>→</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </LegalShell>
        </>
    );
}
