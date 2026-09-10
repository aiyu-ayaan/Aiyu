import ReactDOM from 'react-dom';
import Desktop from '@/app/components/desktop/Desktop';
import { DeviceModeProvider } from '@/app/context/DeviceModeContext';
import { prisma } from '@/lib/prisma';
import { getSingleton } from '@/lib/serialize';
import { getConfigData } from '@/lib/dataFetchers';
import { getSiteUrl } from '@/lib/siteUrl';

/**
 * Indexable since the SEO pass: this page was `noindex` while it was a toy, but
 * it is a genuine portfolio artefact and the strongest differentiator on the
 * site. Being in the sitemap is not enough on its own — the shell is a client
 * component that renders no text, so without the server-rendered summary below
 * there is nothing for a crawler to read, and the page would be indexed as
 * empty. Metadata + JSON-LD + that summary are one change, not three.
 */
export async function generateMetadata() {
    const config = await getConfigData().catch(() => null);
    const baseName = config?.siteTitle || config?.logoText || 'Aiyu Portfolio';
    const baseUrl = getSiteUrl();
    const title = `Aiyu OS — a desktop environment in the browser`;
    const description =
        'A Windows 11 style desktop built in the browser: file explorer, code editor, terminal, '
        + 'markdown viewer, photo gallery, widgets board and a working browser — all rendered in React.';

    return {
        title,
        description,
        keywords: [
            'browser desktop environment', 'web based operating system', 'Windows 11 clone',
            'React desktop UI', 'Next.js portfolio', 'interactive portfolio', 'Aiyu OS',
        ],
        robots: {
            index: true,
            follow: true,
            googleBot: {
                index: true,
                follow: true,
                'max-snippet': -1,
                'max-image-preview': 'large',
            },
        },
        openGraph: {
            title: `${title} | ${baseName}`,
            description,
            url: `${baseUrl}/desktop`,
            type: 'website',
            images: [{
                url: (typeof config?.ogImage === 'string' && config.ogImage.trim()) || `${baseUrl}/og-image.png`,
                width: 1200,
                height: 630,
                alt: 'Aiyu OS desktop environment',
            }],
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
        },
        alternates: { canonical: `${baseUrl}/desktop` },
    };
}

/**
 * What the desktop actually contains. Drives both the JSON-LD feature list and
 * the server-rendered summary, so the two can never drift apart.
 */
const DESKTOP_FEATURES = [
    ['File Explorer', 'Browse the portfolio as a file system — projects, blog posts, gallery images and the résumé as files.'],
    ['Code Editor', 'A syntax-highlighted viewer for this site’s own source.'],
    ['Terminal', 'A working shell with commands for navigating the portfolio.'],
    ['Browser', 'An in-desktop browser that opens the live portfolio pages.'],
    ['Widgets Board', 'A Windows 11 style feed of recent projects, open-source repositories, posts and photos.'],
    ['Markdown Viewer', 'Reads README and post files from the file explorer.'],
    ['Photos & Whiteboard', 'A gallery viewer and a freehand drawing surface.'],
];

// Default desktop wallpaper (admin can override from /admin/config). Used as a
// CSS background-image, so no next/image remote pattern is required.
export const DEFAULT_WALLPAPER =
    'https://images.unsplash.com/photo-1702539336564-b37d0f3276e7?q=80&w=2064&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';

// Only these config keys are read by the desktop shell and its apps. The full
// Config blob carries heavy fields (resume LaTeX source, long-form copy) that
// would otherwise be serialized into the RSC payload for every visitor.
const DESKTOP_CONFIG_KEYS = [
    'siteTitle',
    'authorName',
    'deviceName',
    'osVersion',
    'desktopDeviceName',
    'desktopOsVersion',
];

export default async function DesktopPage() {
    let wallpaper = DEFAULT_WALLPAPER;
    let configObj = {};
    try {
        const config = await getSingleton(prisma, 'config');
        if (config) {
            for (const key of DESKTOP_CONFIG_KEYS) {
                if (config[key] !== undefined) configObj[key] = config[key];
            }
            // Derived, matching sanitizeConfigForPublic(): the raw singleton has
            // no `hasCustomFavicon` field, only the `favicon` sub-object.
            configObj.hasCustomFavicon = Boolean(
                config?.favicon?.value || config?.favicon?.filename || config?.favicon?.mimeType
            );
            if (config.desktopWallpaper && typeof config.desktopWallpaper === 'string') {
                wallpaper = config.desktopWallpaper.trim();
            }
        }
    } catch {
        // Fall back to the default bloom if config is unavailable.
    }

    // The wallpaper is the LCP element but is applied as a CSS background on a
    // client component, so the preload scanner cannot see it until hydration.
    if (wallpaper) {
        ReactDOM.preload(wallpaper, { as: 'image', fetchPriority: 'high' });
    }

    const baseUrl = getSiteUrl();
    const applicationSchema = {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'Aiyu OS',
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Any (web browser)',
        url: `${baseUrl}/desktop`,
        description:
            'A Windows 11 style desktop environment running in the browser, built with React and Next.js.',
        browserRequirements: 'Requires JavaScript.',
        featureList: DESKTOP_FEATURES.map(([name]) => name),
        author: {
            '@type': 'Person',
            name: configObj.authorName || process.env.NEXT_PUBLIC_AUTHOR_NAME || 'Aiyu',
        },
        isPartOf: { '@type': 'WebSite', url: baseUrl },
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    };

    return (
        <DeviceModeProvider>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(applicationSchema) }}
            />

            {/*
              The indexable body of this page. The desktop shell below is a
              client component that paints canvas-like chrome and no prose, so
              without this a crawler sees an empty document. It is visually
              hidden rather than absent because it is also the page's only
              heading structure — screen readers and crawlers get the same
              honest description of what the app is.
            */}
            <div className="sr-only">
                <h1>Aiyu OS — a desktop environment in the browser</h1>
                <p>
                    Aiyu OS is an interactive Windows 11 style desktop built with React and
                    Next.js, running entirely in the browser. It presents this portfolio as a
                    working operating system rather than a set of pages.
                </p>
                <h2>Applications</h2>
                <ul>
                    {DESKTOP_FEATURES.map(([name, summary]) => (
                        <li key={name}>
                            <strong>{name}</strong>: {summary}
                        </li>
                    ))}
                </ul>
                <p>
                    Prefer the standard site? Visit the{' '}
                    <a href="/projects">projects archive</a>, the{' '}
                    <a href="/blogs">blog</a>, or the{' '}
                    <a href="/about-me">about page</a>.
                </p>
            </div>

            <noscript>
                <p>
                    Aiyu OS requires JavaScript to run. You can browse the standard portfolio
                    instead: <a href="/projects">projects</a>, <a href="/blogs">blog</a>,{' '}
                    <a href="/about-me">about</a>.
                </p>
            </noscript>

            <Desktop wallpaper={wallpaper} config={configObj} />
        </DeviceModeProvider>
    );
}
