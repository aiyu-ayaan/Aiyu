import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import LegalShell from '../components/legal/LegalShell';
import LegalShowcaseCards from '../components/legal/LegalShowcaseCards';
import { getPublicLegalApp, getLegalAppShowcase, legalAppPath, legalDocumentPath } from '@/lib/legal';
import { getConfigData } from '@/lib/dataFetchers';
import { getSiteUrl } from '@/lib/siteUrl';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * /<app> — the product's main page. When the legal app is linked to an /apps
 * entry this is the canonical home of the product (/apps/<slug> points its
 * canonical here), so it carries the product-level title, description, image
 * and SoftwareApplication entity, then links out to the app, project and
 * legal pages. Without a linked app it is a plain legal index.
 */
const loadPage = cache(async (slug) => {
    const app = await getPublicLegalApp(slug);
    if (!app) return null;
    const showcase = await getLegalAppShowcase(app);
    // Nothing to show: no linked product and no published legal pages.
    if (!showcase.app && app.documents.length === 0) return null;
    return { app, showcase };
});

function productLabel(type) {
    if (!type) return 'App';
    return /\bapp\b/i.test(type) ? type : `${type} App`;
}

function lede({ app, showcase }) {
    return app.description || showcase.app?.description || showcase.project?.description || '';
}

function describe(page) {
    const text = lede(page);
    if (text) return text.length > 160 ? `${text.slice(0, 157).trimEnd()}…` : text;
    const titles = page.app.documents.map((d) => d.title).join(', ');
    return `${page.app.name}: ${titles}.`.slice(0, 160);
}

function operatingSystem(type, packageName) {
    if (/android/i.test(type)) return 'Android';
    if (/\bios\b|iphone|ipad/i.test(type)) return 'iOS';
    if (/web|site|saas/i.test(type)) return 'Web';
    return packageName ? 'Android' : undefined;
}

export async function generateMetadata({ params }) {
    const { legalApp } = await params;
    const [config, page] = await Promise.all([getConfigData(), loadPage(legalApp)]);
    const siteName = config?.siteTitle || config?.logoText || 'Portfolio';

    if (!page) {
        return { title: `Not Found | ${siteName}`, robots: { index: false, follow: false } };
    }

    const { app, showcase } = page;
    const baseUrl = getSiteUrl();
    const url = `${baseUrl}${legalAppPath(app)}`;
    const title = showcase.app ? `${app.name} — ${productLabel(showcase.app.type)}` : `${app.name} — Legal`;
    const description = describe(page);
    const image = showcase.app?.image || showcase.project?.image || config?.ogImage || `${baseUrl}/og-image.png`;
    const keywords = [...new Set([
        app.name,
        `${app.name} app`,
        showcase.app?.type,
        ...(showcase.app?.techStack || []),
        ...app.documents.map((d) => `${app.name} ${d.title}`),
    ].filter(Boolean))];

    return {
        title: `${title} | ${siteName}`,
        description,
        keywords,
        alternates: { canonical: url },
        robots: {
            index: true,
            follow: true,
            googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large' },
        },
        openGraph: {
            title,
            description,
            url,
            type: 'website',
            siteName,
            images: [{ url: image, width: 1200, height: 630, alt: app.name }],
        },
        twitter: { card: 'summary_large_image', title, description, images: [image] },
    };
}

export default async function LegalAppPage({ params }) {
    const { legalApp } = await params;
    const page = await loadPage(legalApp);
    if (!page) notFound();

    const { app, showcase } = page;
    const baseUrl = getSiteUrl();
    const url = `${baseUrl}${legalAppPath(app)}`;
    const text = lede(page);
    const product = showcase.app;
    const os = product ? operatingSystem(product.type, app.packageName) : undefined;
    const externalUrl = /^https?:\/\//i.test(product?.externalUrl || '') ? product.externalUrl : '';

    const graph = [
        {
            '@type': 'WebPage',
            '@id': `${url}#webpage`,
            url,
            name: product ? `${app.name} — ${productLabel(product.type)}` : `${app.name} — Legal`,
            description: describe(page),
            isPartOf: { '@type': 'WebSite', url: baseUrl },
            breadcrumb: { '@id': `${url}#breadcrumb` },
            ...(product ? { mainEntity: { '@id': `${url}#app` } } : {}),
            hasPart: app.documents.map((doc) => ({
                '@type': 'WebPage',
                name: doc.title,
                url: `${baseUrl}${legalDocumentPath(app, doc)}`,
            })),
        },
        {
            '@type': 'BreadcrumbList',
            '@id': `${url}#breadcrumb`,
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl || '/' },
                { '@type': 'ListItem', position: 2, name: app.name, item: url },
            ],
        },
        ...(product ? [{
            '@type': 'SoftwareApplication',
            '@id': `${url}#app`,
            name: app.name,
            url,
            ...(text ? { description: text } : {}),
            ...(product.image ? { image: product.image } : {}),
            applicationCategory: product.type || 'Application',
            ...(os ? { operatingSystem: os } : {}),
            ...(app.packageName ? { identifier: app.packageName } : {}),
            ...(product.techStack.length > 0 ? { softwareRequirements: product.techStack.join(', ') } : {}),
            sameAs: [`${baseUrl}${product.href}`, ...(externalUrl ? [externalUrl] : [])],
            ...(showcase.project ? {
                isBasedOn: { '@type': 'SoftwareSourceCode', name: showcase.project.name, url: `${baseUrl}${showcase.project.href}` },
            } : {}),
        }] : []),
    ];

    const meta = [
        product?.status,
        product?.type,
        app.packageName && `package: ${app.packageName}`,
    ].filter(Boolean);

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }) }}
            />
            <LegalShell
                eyebrow={product ? `~/${app.slug} — ${productLabel(product.type).toLowerCase()}` : '~/legal'}
                title={app.name}
                meta={meta}
                app={app}
            >
                {text && (
                    <p className="mb-8 text-lg leading-relaxed sm:text-xl" style={{ color: 'var(--text-tertiary)' }}>{text}</p>
                )}

                {(externalUrl || product || showcase.project) && (
                    <div className="mb-14 flex flex-wrap gap-3 font-mono text-sm">
                        {externalUrl && (
                            <a
                                href={externalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-full px-5 py-2 font-semibold transition-transform hover:-translate-y-0.5"
                                style={{ backgroundColor: 'var(--accent-cyan)', color: 'var(--bg-primary, #05070d)' }}
                            >
                                open --app ↗
                            </a>
                        )}
                        {app.documents.length > 0 && (
                            <a
                                href="#legal"
                                className="inline-flex items-center gap-2 rounded-full border px-5 py-2 transition-opacity hover:opacity-80"
                                style={{ borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                            >
                                legal --pages ↓
                            </a>
                        )}
                    </div>
                )}

                <LegalShowcaseCards app={showcase.app} project={showcase.project} />

                {app.documents.length > 0 && (
                    <section id="legal" aria-labelledby="legal-heading" className="scroll-mt-28">
                        <h2 id="legal-heading" className="mb-2 font-mono text-xs uppercase tracking-[0.25em]" style={{ color: 'var(--text-tertiary)' }}>
                            {`// ${app.name} legal`}
                        </h2>
                        <ul>
                            {app.documents.map((doc, index) => (
                                <li key={doc.slug} className="border-t first:border-t-0" style={{ borderColor: 'var(--border-primary)' }}>
                                    <Link href={legalDocumentPath(app, doc)} className="group flex items-baseline gap-4 py-5">
                                        <span className="font-mono text-xs" style={{ color: 'var(--accent-cyan)' }}>{String(index + 1).padStart(2, '0')}</span>
                                        <span className="flex-1 min-w-0">
                                            <span className="block text-xl font-semibold group-hover:underline underline-offset-4" style={{ color: 'var(--text-bright)' }}>
                                                {app.name} {doc.title}
                                            </span>
                                            <span className="mt-1 block truncate font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>{legalDocumentPath(app, doc)}</span>
                                        </span>
                                        <span aria-hidden="true" style={{ color: 'var(--accent-cyan)' }}>→</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </LegalShell>
        </>
    );
}
