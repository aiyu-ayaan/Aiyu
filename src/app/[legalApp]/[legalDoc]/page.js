import { notFound } from 'next/navigation';
import { cache } from 'react';
import LegalContent from '../../components/legal/LegalContent';
import LegalShell from '../../components/legal/LegalShell';
import { getPublicLegalDocument, getLinkedDeployment, legalAppPath, legalDocumentPath } from '@/lib/legal';
import { getConfigData } from '@/lib/dataFetchers';
import { getSiteUrl } from '@/lib/siteUrl';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const loadDocument = cache(async (appSlug, docSlug) => getPublicLegalDocument(appSlug, docSlug));

function describe(app, document) {
    if (document.seoDescription) return document.seoDescription;
    const pkg = app.packageName ? ` (${app.packageName})` : '';
    return `${document.title} for ${app.name}${pkg}: how the app handles your information, your rights, and how to get in touch.`.slice(0, 160);
}

function formatDate(value) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

export async function generateMetadata({ params }) {
    const { legalApp, legalDoc } = await params;
    const [config, found] = await Promise.all([getConfigData(), loadDocument(legalApp, legalDoc)]);
    const siteName = config?.siteTitle || config?.logoText || 'Portfolio';

    if (!found) {
        return { title: `Not Found | ${siteName}`, robots: { index: false, follow: false } };
    }

    const { app, document } = found;
    const url = `${getSiteUrl()}${legalDocumentPath(app, document)}`;
    const title = `${document.title} — ${app.name}`;
    const description = describe(app, document);

    return {
        title: `${title} | ${siteName}`,
        description,
        alternates: { canonical: url },
        robots: document.noIndex
            ? { index: false, follow: true }
            : { index: true, follow: true, googleBot: { index: true, follow: true, 'max-snippet': -1 } },
        openGraph: {
            title,
            description,
            url,
            type: 'article',
            siteName,
            modifiedTime: document.updatedAt ? new Date(document.updatedAt).toISOString() : undefined,
        },
        twitter: { card: 'summary', title, description },
    };
}

export default async function LegalDocumentPage({ params }) {
    const { legalApp, legalDoc } = await params;
    const found = await loadDocument(legalApp, legalDoc);
    if (!found) notFound();

    const { app, document } = found;
    const linkedApp = await getLinkedDeployment(app);
    const baseUrl = getSiteUrl();
    const url = `${baseUrl}${legalDocumentPath(app, document)}`;
    const updated = formatDate(document.updatedAt);

    const meta = [
        document.effectiveDate && `effective: ${document.effectiveDate}`,
        updated && `last updated: ${updated}`,
        app.packageName && `package: ${app.packageName}`,
    ].filter(Boolean);

    const jsonLd = [
        {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: `${document.title} — ${app.name}`,
            description: describe(app, document),
            url,
            inLanguage: 'en',
            ...(document.updatedAt ? { dateModified: new Date(document.updatedAt).toISOString() } : {}),
            ...(document.createdAt ? { datePublished: new Date(document.createdAt).toISOString() } : {}),
            about: {
                '@type': 'SoftwareApplication',
                name: app.name,
                ...(linkedApp ? { url: `${baseUrl}${linkedApp.href}` } : {}),
                ...(app.packageName ? { identifier: app.packageName } : {}),
            },
            isPartOf: { '@type': 'WebSite', url: baseUrl },
        },
        {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl || '/' },
                { '@type': 'ListItem', position: 2, name: app.name, item: `${baseUrl}${legalAppPath(app)}` },
                { '@type': 'ListItem', position: 3, name: document.title, item: url },
            ],
        },
    ];

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            <LegalShell
                eyebrow={`~/${app.slug} — legal`}
                title={document.title}
                meta={meta}
                app={app}
                documents={app.documents}
                activeSlug={document.slug}
                linkedApp={linkedApp}
            >
                <LegalContent content={document.content} format={document.format} />
                {app.contactEmail && (
                    <p className="mt-10 font-mono text-sm" style={{ color: 'var(--text-tertiary)' }}>
                        Questions? Contact{' '}
                        <a href={`mailto:${app.contactEmail}`} className="underline underline-offset-4" style={{ color: 'var(--accent-cyan)' }}>
                            {app.contactEmail}
                        </a>
                    </p>
                )}
            </LegalShell>
        </>
    );
}
