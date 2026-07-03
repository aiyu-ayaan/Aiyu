import Link from 'next/link';
import { getConfigData, getPublishedBlogs } from '@/lib/dataFetchers';
import { getSiteUrl } from '@/lib/siteUrl';
import { getBlogPath } from '@/lib/publicPaths';
import { getReadTime, stripMarkdown } from '../../components/blogs/blogUtils';

export const revalidate = 0;

const ROW_ACCENTS = ['var(--accent-pink)', 'var(--accent-cyan)', 'var(--accent-purple)', 'var(--accent-orange)'];

export async function generateMetadata() {
    const config = await getConfigData();
    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
    const baseUrl = getSiteUrl();
    const description = 'Every post as a plain editorial index — fast, server-rendered, no scripts. V2 edition.';

    return {
        title: `${baseName} | Writing — V2`,
        description,
        openGraph: {
            title: `${baseName} | Writing — V2`,
            description,
            url: `${baseUrl}/v2/blogs`,
            type: 'website',
        },
        alternates: {
            canonical: `${baseUrl}/v2/blogs`,
        },
    };
}

const formatDate = (blog) => {
    const parsed = new Date(blog?.date || blog?.createdAt || 0);
    if (Number.isNaN(parsed.getTime()) || parsed.getTime() === 0) return '';
    return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

/**
 * /v2/blogs — deliberately the simplest v2 page. Writing is meant to load
 * fast, so this is a pure server component: no GSAP, no filters, no client
 * bundle beyond the shared chrome. Just the full index as hairline ledger
 * rows in the v2 editorial voice, sorted newest first.
 */
export default async function BlogsV2Page() {
    const blogs = await getPublishedBlogs();

    const sortedBlogs = (Array.isArray(blogs) ? [...blogs] : []).sort(
        (a, b) => new Date(b?.date || b?.createdAt || 0) - new Date(a?.date || a?.createdAt || 0)
    );

    return (
        <div className="relative overflow-hidden">
            <div className="mx-auto w-full max-w-7xl px-6 pb-24 pt-32 sm:pt-40 lg:px-10">
                <div className="relative mb-14 sm:mb-20">
                    <span
                        aria-hidden="true"
                        className="pointer-events-none absolute -top-10 right-0 select-none text-[7rem] font-black leading-none tracking-tighter sm:-top-16 sm:text-[13rem]"
                        style={{
                            color: 'transparent',
                            WebkitTextStroke: '1.5px color-mix(in srgb, var(--accent-purple) 20%, transparent)',
                            opacity: 0.8,
                        }}
                    >
                        ¶
                    </span>

                    <p className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.35em]" style={{ color: 'var(--accent-purple)' }}>
                        ~/blogs — the index
                    </p>
                    <h1
                        className="max-w-4xl text-4xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl"
                        style={{ color: 'var(--text-bright)' }}
                    >
                        Notes from the workbench.
                    </h1>
                    <p className="mt-5 max-w-2xl text-base leading-relaxed sm:text-lg" style={{ color: 'var(--text-tertiary)' }}>
                        Practical notes, tutorials, and reflections. No scripts on this page — it&apos;s built to be read.
                    </p>
                    <p className="mt-8 font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
                        {sortedBlogs.length} {sortedBlogs.length === 1 ? 'post' : 'posts'} · newest first
                    </p>
                </div>

                {sortedBlogs.length > 0 ? (
                    <div style={{ borderTop: '1px solid var(--hairline)' }}>
                        {sortedBlogs.map((blog, index) => {
                            const accent = ROW_ACCENTS[index % ROW_ACCENTS.length];
                            const previewText = stripMarkdown(blog?.content || '').trim();
                            const displayText = previewText.length > 160 ? `${previewText.slice(0, 160)}…` : previewText;
                            const tags = Array.isArray(blog?.tags) ? blog.tags.slice(0, 3) : [];

                            return (
                                <Link
                                    key={blog?._id || blog?.slug || `${blog?.title}-${index}`}
                                    href={getBlogPath(blog)}
                                    className="group grid grid-cols-12 items-baseline gap-4 py-8 sm:py-10"
                                    style={{ borderBottom: '1px solid var(--hairline)' }}
                                >
                                    <span className="col-span-12 font-mono text-xs sm:col-span-2 sm:text-sm" style={{ color: 'var(--text-muted)' }}>
                                        {formatDate(blog)}
                                        <span className="mt-1 block" style={{ color: accent }}>
                                            {blog?.readTime || getReadTime(blog?.content)}
                                        </span>
                                    </span>

                                    <span className="col-span-12 sm:col-span-9">
                                        <span
                                            className="block text-2xl font-bold leading-tight tracking-tight transition-transform duration-300 group-hover:translate-x-2 sm:text-4xl"
                                            style={{ color: 'var(--text-bright)' }}
                                        >
                                            {blog?.title}
                                        </span>
                                        <span className="mt-3 block max-w-2xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-tertiary)' }}>
                                            {displayText || 'Open this article to read the full write-up.'}
                                        </span>
                                        {tags.length > 0 && (
                                            <span className="mt-3 block font-mono text-xs uppercase tracking-[0.15em]" style={{ color: `color-mix(in srgb, ${accent} 70%, var(--text-secondary))` }}>
                                                {tags.join(' / ')}
                                            </span>
                                        )}
                                    </span>

                                    <span
                                        className="col-span-1 hidden justify-self-end font-mono text-lg transition-transform duration-300 group-hover:translate-x-1.5 sm:block"
                                        style={{ color: accent }}
                                        aria-hidden="true"
                                    >
                                        →
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                ) : (
                    <p className="py-20 font-mono text-sm" style={{ color: 'var(--text-tertiary)' }}>
                        $ ls ~/blogs → nothing published yet. Check back soon.
                    </p>
                )}
            </div>
        </div>
    );
}
