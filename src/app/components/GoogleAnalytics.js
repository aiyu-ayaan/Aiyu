"use client";
import { Suspense, useEffect, useRef } from 'react';
import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { gtag, pageview } from '@/lib/gtag';

// GA measurement IDs are only letters, digits and dashes (e.g. G-XXXXXXX);
// the ID can come from admin config, so validate before use.
const GA_ID_RE = /^[A-Za-z0-9-]+$/;

/**
 * Queues the GA base config once, then fires a page_view on the initial
 * load and every client-side navigation. Config uses `send_page_view:
 * false`, so this tracker is the single source of page views and nothing
 * is double counted. Commands queue in the dataLayer, so ordering is
 * correct even though the GA library itself loads lazily.
 */
function RouteChangeTracker({ gaId }) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const lastUrl = useRef(null);

    useEffect(() => {
        if (!pathname) return;
        if (!window.__gaConfigured) {
            window.__gaConfigured = true;
            window.gtag = gtag;
            gtag('js', new Date());
            gtag('config', gaId, { send_page_view: false });
        }
        const query = searchParams?.toString();
        const url = query ? `${pathname}?${query}` : pathname;
        if (lastUrl.current === url) return;
        lastUrl.current = url;
        pageview(url);
    }, [pathname, searchParams, gaId]);

    return null;
}

export default function GoogleAnalytics({ gaId }) {
    if (!gaId || !GA_ID_RE.test(gaId)) return null;

    return (
        <>
            <Script
                strategy="lazyOnload"
                src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            />
            <Suspense fallback={null}>
                <RouteChangeTracker gaId={gaId} />
            </Suspense>
        </>
    );
}
