import BlogDetailClient from '../../../components/blogs/BlogDetailClient';
import { cache } from 'react';
import { getBlogById, getConfigData, getPublishedBlogSlugs } from '@/lib/dataFetchers';

export const revalidate = 300;
const getBlogByIdentifier = cache(async (identifier) => getBlogById(identifier));

export async function generateStaticParams() {
    const slugs = await getPublishedBlogSlugs();
    return slugs.map((id) => ({ id }));
}

export async function generateMetadata({ params }) {
    const { id: identifier } = await params;
    const blog = await getBlogByIdentifier(identifier);
    const config = await getConfigData();

    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
    const baseUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const blogUrl = `${baseUrl}/blogs/${blog?.slug || identifier}`;
    const fallbackDescription = blog?.content?.substring(0, 160) || `Read ${baseName}`;
    const seoTitle = blog?.seoTitle || blog?.title || baseName;
    const description = blog?.seoDescription || blog?.excerpt || fallbackDescription;
    const socialTitle = blog?.socialTitle || seoTitle;
    const socialDescription = blog?.socialDescription || description;
    const ogImage = blog?.socialImage || blog?.image || config?.ogImage || `${baseUrl}/og-image.png`;
    const canonicalUrl = blog?.canonicalUrl || blogUrl;
    const keywords = Array.isArray(blog?.keywords) && blog.keywords.length > 0 ? blog.keywords : blog?.tags;

    if (!blog) {
        return {
            title: `Blog Not Found | ${baseName}`,
        };
    }

    const publishedDate = blog?.date ? new Date(blog.date) : null;
    const publishedTime = publishedDate && !Number.isNaN(publishedDate.getTime())
        ? publishedDate.toISOString()
        : undefined;

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

export default async function BlogDetailPage({ params }) {
    const { id: identifier } = await params;
    const [blog, config] = await Promise.all([getBlogByIdentifier(identifier), getConfigData()]);

    return <BlogDetailClient blog={blog} config={config} />;
}
