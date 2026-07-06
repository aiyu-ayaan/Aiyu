import { getSiteUrl } from '@/lib/siteUrl';

// Utility function to generate JSON-LD schema for SEO

export function generatePersonSchema(siteData) {
    return {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: siteData?.name || 'Portfolio Owner',
        url: getSiteUrl(),
        description: siteData?.description || 'Full Stack Developer & Designer',
        image: siteData?.profileImage || '/og-image.png',
        email: siteData?.email || 'contact@example.com',
        jobTitle: siteData?.title || 'Full Stack Developer',
        worksFor: siteData?.company || 'Self-employed',
        sameAs: siteData?.socialLinks || [],
    };
}

export function generateProjectSchema(project, siteUrl) {
    return {
        '@context': 'https://schema.org',
        '@type': 'SoftwareSourceCode',
        name: project.title,
        description: project.description,
        url: `${siteUrl}/projects/${project.slug}`,
        image: project.thumbnail || project.image,
        programmingLanguage: project.technologies || [],
        codeRepository: project.githubLink,
        datePublished: project.createdAt,
        dateModified: project.updatedAt,
        author: {
            '@type': 'Person',
            name: process.env.NEXT_PUBLIC_AUTHOR_NAME || 'Portfolio Owner',
        },
    };
}

export function generateBlogSchema(blog, siteUrl) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: blog.title,
        description: blog.description,
        image: blog.thumbnail || blog.image,
        datePublished: blog.createdAt,
        dateModified: blog.updatedAt,
        author: {
            '@type': 'Person',
            name: process.env.NEXT_PUBLIC_AUTHOR_NAME || 'Portfolio Owner',
        },
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': `${siteUrl}/blogs/${blog.slug}`,
        },
        wordCount: blog.content?.length || 0,
    };
}

export function generateWebsiteSchema(siteUrl, siteTitle) {
    return {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        url: siteUrl,
        name: siteTitle,
        description: 'Portfolio & Blog',
        potentialAction: {
            '@type': 'SearchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: `${siteUrl}/search?q={search_term_string}`,
            },
            query_input: 'required name=search_term_string',
        },
    };
}

/**
 * Structured data for the AI Hub (/ai). Returns an array of JSON-LD nodes: a
 * WebPage with a Home → AI Hub breadcrumb, and — when the page has a `skills`
 * section — an ItemList enumerating every skill (name, description, optional
 * url) so search engines can surface the catalog as rich results.
 */
export function generateAiHubSchema({ siteUrl, url, title, description, sections }) {
    const webPage = {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        '@id': url,
        url,
        name: title,
        description,
        isPartOf: {
            '@type': 'WebSite',
            url: siteUrl,
        },
        breadcrumb: {
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
                { '@type': 'ListItem', position: 2, name: 'AI Hub', item: url },
            ],
        },
    };

    const schemas = [webPage];

    const skillsSection = Array.isArray(sections)
        ? sections.find((section) => section?.type === 'skills' && section?.enabled !== false)
        : null;

    const skillItems = [];
    for (const category of skillsSection?.data?.categories || []) {
        for (const item of category?.items || []) {
            if (item?.name) skillItems.push(item);
        }
    }

    if (skillItems.length > 0) {
        schemas.push({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: skillsSection?.title || 'AI skills & specializations',
            numberOfItems: skillItems.length,
            itemListElement: skillItems.map((item, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                name: item.name,
                ...(item.description ? { description: item.description } : {}),
                ...(item.url ? { url: item.url } : {}),
            })),
        });
    }

    return schemas;
}

export function generateOrganizationSchema(siteData, siteUrl) {
    return {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: siteData?.siteName || siteData?.siteTitle || 'Portfolio',
        url: siteUrl,
        logo: siteData?.logo || '/logo.png',
        description: siteData?.siteDescription || 'Full Stack Developer Portfolio',
        contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'General Inquiries',
            email: siteData?.contactEmail || 'contact@example.com',
        },
        sameAs: [
            ...(siteData?.socialLinks || []),
        ],
    };
}
