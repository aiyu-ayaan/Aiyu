import BlogDetailClient from '../../../components/blogs/BlogDetailClient';
import TrackView from '../../../components/shared/TrackView';
import { cache } from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import { getBlogById, getConfigData } from '@/lib/dataFetchers';
import { getAdsData } from '@/lib/adsDataFetcher';
import { generateBlogSchema } from '@/app/schema';
import { getSafeCanonicalUrl, getSiteUrl } from '@/lib/siteUrl';
import { v2PublicPath } from '@/lib/siteVersion';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
const getBlogByIdentifier = cache(async (identifier) => getBlogById(identifier));

function toIsoString(value) {
    const parsed = value ? new Date(value) : null;
    if (!parsed || Number.isNaN(parsed.getTime())) {
        return undefined;
    }
    return parsed.toISOString();
}

export async function generateMetadata({ params }) {
    const { id: identifier } = await params;
    const blog = await getBlogByIdentifier(identifier);
    const config = await getConfigData();

    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
    const baseUrl = getSiteUrl();
    const canonicalSlug = blog?.slug || identifier;
    const fallbackDescription = blog?.content?.substring(0, 160) || `Read ${baseName}`;
    const seoTitle = blog?.seoTitle || blog?.title || baseName;
    const description = blog?.seoDescription || blog?.excerpt || fallbackDescription;
    const socialTitle = blog?.socialTitle || seoTitle;
    const socialDescription = blog?.socialDescription || description;
    const ogImage = blog?.socialImage || blog?.image || config?.ogImage || `${baseUrl}/og-image.png`;
    const canonicalUrl = getSafeCanonicalUrl(blog?.canonicalUrl, v2PublicPath(config, `/blogs/${canonicalSlug}`));
    const keywords = Array.isArray(blog?.keywords) && blog.keywords.length > 0 ? blog.keywords : blog?.tags;

    if (!blog) {
        return {
            title: `Blog Not Found | ${baseName}`,
            robots: { index: false, follow: false },
        };
    }

    const publishedTime = toIsoString(blog?.date) || toIsoString(blog?.createdAt);
    const modifiedTime = toIsoString(blog?.updatedAt) || publishedTime;

    return {
        title: `${baseName} | ${seoTitle}`,
        description,
        keywords,
        robots: blog?.noIndex
            ? { index: false, follow: true, nocache: true }
            : { index: true, follow: true },
        openGraph: {
            title: socialTitle,
            description: socialDescription,
            url: canonicalUrl,
            siteName: baseName,
            images: [{
                url: ogImage,
                width: 1200,
                height: 630,
                alt: blog?.socialImageAlt || blog?.imageAlt || blog?.title || 'Blog cover image',
            }],
            type: 'article',
            publishedTime,
            modifiedTime,
        },
        twitter: {
            card: 'summary_large_image',
            title: socialTitle,
            description: socialDescription,
            images: [ogImage],
        },
        alternates: {
            canonical: canonicalUrl,
        },
    };
}

/**
 * /v2/blogs/[id] — the same article experience as the classic detail page
 * (shared BlogDetailClient, schema, view tracking) rendered under the v2
 * chrome so readers arriving from /v2/blogs stay inside the v2 shell.
 */
export default async function BlogDetailV2Page({ params }) {
    const { id: identifier } = await params;
    const [blog, config, adsConfig] = await Promise.all([
        getBlogByIdentifier(identifier),
        getConfigData(),
        getAdsData(),
    ]);

    if (!blog) {
        notFound();
    }

    const canonicalSlug = blog?.slug || identifier;
    if (identifier !== canonicalSlug) {
        permanentRedirect(v2PublicPath(config, `/blogs/${canonicalSlug}`));
    }

    const baseUrl = getSiteUrl();
    const canonicalUrl = getSafeCanonicalUrl(blog?.canonicalUrl, v2PublicPath(config, `/blogs/${canonicalSlug}`));
    const fallbackDescription = blog?.content?.substring(0, 160) || 'Blog article';
    const description = blog?.seoDescription || blog?.excerpt || fallbackDescription;
    const blogSchema = generateBlogSchema(
        {
            title: blog?.title,
            description,
            image: blog?.socialImage || blog?.image,
            createdAt: blog?.createdAt,
            updatedAt: blog?.updatedAt,
            slug: canonicalSlug,
            content: blog?.content,
        },
        baseUrl
    );

    blogSchema.mainEntityOfPage = {
        '@type': 'WebPage',
        '@id': canonicalUrl,
    };

    return (
        <div className="pt-16">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(blogSchema) }}
            />
            <TrackView entityType="blog" entityId={blog?._id} entitySlug={canonicalSlug} />
            <BlogDetailClient blog={blog} config={config} adsConfig={adsConfig} backHref={v2PublicPath(config, '/blogs')} />
        </div>
    );
}
