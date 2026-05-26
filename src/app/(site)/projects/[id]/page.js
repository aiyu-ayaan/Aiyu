import { notFound, permanentRedirect } from 'next/navigation';
import { cache } from 'react';
import dbConnect from '@/lib/db';
import ProjectModel from '@/models/Project';
import { getConfigData } from '@/lib/dataFetchers';
import { getProjectSlug, resolveProjectByIdentifier } from '@/lib/contentSlugs';
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

const getProjectByIdentifier = cache(async (identifier) => {
    await dbConnect();
    return resolveProjectByIdentifier(ProjectModel, identifier);
});

export async function generateMetadata({ params }) {
    const { id: identifier } = await params;
    const [config, project] = await Promise.all([getConfigData(), getProjectByIdentifier(identifier)]);

    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
    const baseUrl = getBaseUrl();

    if (!project) {
        return {
            title: `Project Not Found | ${baseName}`,
            robots: { index: false, follow: false },
        };
    }

    const canonicalUrl = `${baseUrl}/projects/${getProjectSlug(project)}`;
    const description = String(project?.description || 'Project details').slice(0, 160);
    const ogImage = (typeof project?.image === 'string' && project.image.trim())
        || (typeof config?.ogImage === 'string' && config.ogImage.trim())
        || `${baseUrl}/og-image.png`;

    return {
        title: `${baseName} | ${project.name}`,
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
            title: project.name,
            description,
            url: canonicalUrl,
            type: 'article',
            images: [{ url: ogImage, width: 1200, height: 630 }],
        },
        twitter: {
            card: 'summary_large_image',
            title: project.name,
            description,
            images: [ogImage],
        },
        alternates: {
            canonical: canonicalUrl,
        },
    };
}

export default async function ProjectDetailsPage({ params }) {
    const { id: identifier } = await params;
    const project = await getProjectByIdentifier(identifier);

    if (!project) {
        notFound();
    }

    const canonicalSlug = getProjectSlug(project);
    if (identifier !== canonicalSlug) {
        permanentRedirect(`/projects/${canonicalSlug}`);
    }

    const baseUrl = getBaseUrl();
    const stackList = Array.isArray(project?.techStack) ? project.techStack : [];

    const projectSchema = {
        '@context': 'https://schema.org',
        '@type': 'SoftwareSourceCode',
        name: project.name,
        description: project.description || undefined,
        url: `${baseUrl}/projects/${canonicalSlug}`,
        ...(project?.image ? { image: project.image } : {}),
        ...(stackList.length > 0 ? { programmingLanguage: stackList } : {}),
        ...(isExternalHttpUrl(project?.codeLink) ? { codeRepository: project.codeLink } : {}),
        author: {
            '@type': 'Person',
            name: process.env.NEXT_PUBLIC_AUTHOR_NAME || 'Portfolio Owner',
        },
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': `${baseUrl}/projects/${canonicalSlug}`,
        },
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(projectSchema) }}
            />
            <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
            <article className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 shadow-2xl backdrop-blur">
                {project?.image ? (
                    <img
                        src={project.image}
                        alt={project?.name || 'Project image'}
                        className="h-64 w-full object-cover sm:h-80"
                        loading="eager"
                        decoding="async"
                    />
                ) : null}

                <div className="space-y-6 p-6 sm:p-8">
                    <header className="space-y-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-cyan-400">Project Details</p>
                        <h1 className="text-3xl font-bold text-white sm:text-4xl">{project?.name}</h1>
                        <div className="flex flex-wrap gap-2 text-xs uppercase tracking-wide">
                            <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-cyan-300">
                                {project?.projectType || 'Project'}
                            </span>
                            <span className="rounded-full border border-purple-400/30 bg-purple-400/10 px-3 py-1 text-purple-300">
                                {project?.status || 'Unknown'}
                            </span>
                            <span className="rounded-full border border-slate-400/30 bg-slate-400/10 px-3 py-1 text-slate-300">
                                {project?.year || 'Year not set'}
                            </span>
                        </div>
                    </header>

                    <section>
                        <h2 className="mb-2 text-lg font-semibold text-white">Overview</h2>
                        <p className="leading-7 text-slate-200">{project?.description || 'No description provided.'}</p>
                    </section>

                    {stackList.length > 0 ? (
                        <section>
                            <h2 className="mb-2 text-lg font-semibold text-white">Tech Stack</h2>
                            <div className="flex flex-wrap gap-2">
                                {stackList.map((tech) => (
                                    <span
                                        key={`${project?._id}-${tech}`}
                                        className="rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-sm font-medium text-cyan-300"
                                    >
                                        {tech}
                                    </span>
                                ))}
                            </div>
                        </section>
                    ) : null}

                    <section className="flex flex-wrap gap-3 pt-2">
                        {isExternalHttpUrl(project?.codeLink) ? (
                            <a
                                href={project.codeLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-black transition hover:bg-cyan-400"
                            >
                                View Code
                            </a>
                        ) : null}

                        {isExternalHttpUrl(project?.blogLink) ? (
                            <a
                                href={project.blogLink}
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
