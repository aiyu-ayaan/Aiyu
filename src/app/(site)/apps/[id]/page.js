import { notFound, permanentRedirect } from 'next/navigation';
import { cache } from 'react';
import dbConnect from '@/lib/db';
import DeploymentModel from '@/models/Deployment';
import { getConfigData } from '@/lib/dataFetchers';
import { getDeploymentSlug, resolveDeploymentByIdentifier } from '@/lib/contentSlugs';
import { getSiteUrl } from '@/lib/siteUrl';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getBaseUrl() {
    return getSiteUrl();
}

function isExternalHttpUrl(value) {
    if (typeof value !== 'string' || value.trim().length === 0) {
        return false;
    }

    try {
        const parsed = new URL(value);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

const getDeploymentByIdentifier = cache(async (identifier) => {
    await dbConnect();
    return resolveDeploymentByIdentifier(DeploymentModel, identifier);
});

export async function generateMetadata({ params }) {
    const { id: identifier } = await params;
    const [config, deployment] = await Promise.all([getConfigData(), getDeploymentByIdentifier(identifier)]);

    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
    const baseUrl = getBaseUrl();

    if (!deployment) {
        return {
            title: `App Not Found | ${baseName}`,
            robots: { index: false, follow: false },
        };
    }

    const canonicalUrl = `${baseUrl}/apps/${getDeploymentSlug(deployment)}`;
    const description = String(deployment?.description || 'App details').slice(0, 160);
    const ogImage = (typeof deployment?.image === 'string' && deployment.image.trim())
        || (typeof config?.ogImage === 'string' && config.ogImage.trim())
        || `${baseUrl}/og-image.png`;

    return {
        title: `${baseName} | ${deployment.name}`,
        description,
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
            title: deployment.name,
            description,
            url: canonicalUrl,
            type: 'website',
            images: [{ url: ogImage, width: 1200, height: 630 }],
        },
        twitter: {
            card: 'summary_large_image',
            title: deployment.name,
            description,
            images: [ogImage],
        },
        alternates: {
            canonical: canonicalUrl,
        },
    };
}

export default async function AppDetailsPage({ params }) {
    const { id: identifier } = await params;
    const deployment = await getDeploymentByIdentifier(identifier);

    if (!deployment) {
        notFound();
    }

    const canonicalSlug = getDeploymentSlug(deployment);
    if (identifier !== canonicalSlug) {
        permanentRedirect(`/apps/${canonicalSlug}`);
    }

    const baseUrl = getBaseUrl();
    const stackList = Array.isArray(deployment?.techStack) ? deployment.techStack : [];

    const appSchema = {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: deployment.name,
        description: deployment.description || undefined,
        url: isExternalHttpUrl(deployment?.hostedUrl) ? deployment.hostedUrl : `${baseUrl}/apps/${canonicalSlug}`,
        applicationCategory: deployment?.appType || 'WebApplication',
        operatingSystem: 'Web',
        ...(deployment?.image ? { image: deployment.image } : {}),
        ...(stackList.length > 0 ? { softwareRequirements: stackList.join(', ') } : {}),
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': `${baseUrl}/apps/${canonicalSlug}`,
        },
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }}
            />
            <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
            <article className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 shadow-2xl backdrop-blur">
                {deployment?.image ? (
                    <img
                        src={deployment.image}
                        alt={deployment?.name || 'App image'}
                        className="h-64 w-full object-cover sm:h-80"
                        loading="eager"
                        decoding="async"
                    />
                ) : null}

                <div className="space-y-6 p-6 sm:p-8">
                    <header className="space-y-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-cyan-400">App Details</p>
                        <h1 className="text-3xl font-bold text-white sm:text-4xl">{deployment?.name}</h1>
                        <div className="flex flex-wrap gap-2 text-xs uppercase tracking-wide">
                            <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-cyan-300">
                                {deployment?.appType || 'Application'}
                            </span>
                            <span className="rounded-full border border-purple-400/30 bg-purple-400/10 px-3 py-1 text-purple-300">
                                {deployment?.status || 'Unknown'}
                            </span>
                            <span className="rounded-full border border-slate-400/30 bg-slate-400/10 px-3 py-1 text-slate-300">
                                {deployment?.environment || 'Environment not set'}
                            </span>
                        </div>
                    </header>

                    <section>
                        <h2 className="mb-2 text-lg font-semibold text-white">Overview</h2>
                        <p className="leading-7 text-slate-200">{deployment?.description || 'No description provided.'}</p>
                    </section>

                    <section className="grid grid-cols-1 gap-3 text-sm text-slate-200 sm:grid-cols-2">
                        <div className="rounded-lg border border-white/10 bg-slate-800/50 p-4">
                            <p className="mb-1 text-xs uppercase tracking-wider text-slate-400">Hosting Provider</p>
                            <p className="font-semibold">{deployment?.hostingProvider || 'N/A'}</p>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-slate-800/50 p-4">
                            <p className="mb-1 text-xs uppercase tracking-wider text-slate-400">Environment</p>
                            <p className="font-semibold">{deployment?.environment || 'N/A'}</p>
                        </div>
                    </section>

                    {stackList.length > 0 ? (
                        <section>
                            <h2 className="mb-2 text-lg font-semibold text-white">Tech Stack</h2>
                            <div className="flex flex-wrap gap-2">
                                {stackList.map((tech) => (
                                    <span
                                        key={`${deployment?._id}-${tech}`}
                                        className="rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-sm font-medium text-cyan-300"
                                    >
                                        {tech}
                                    </span>
                                ))}
                            </div>
                        </section>
                    ) : null}

                    <section className="flex flex-wrap gap-3 pt-2">
                        {isExternalHttpUrl(deployment?.hostedUrl) ? (
                            <a
                                href={deployment.hostedUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-black transition hover:bg-cyan-400"
                            >
                                Open Live App
                            </a>
                        ) : null}

                        {isExternalHttpUrl(deployment?.blogLink) ? (
                            <a
                                href={deployment.blogLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-lg border border-purple-400/40 bg-purple-500/10 px-4 py-2 font-semibold text-purple-200 transition hover:border-purple-300"
                            >
                                Read Related Blog
                            </a>
                        ) : null}
                    </section>
                </div>
            </article>
        </main>
        </>
    );
}
