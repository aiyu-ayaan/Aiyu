"use client";
/**
 * Lightweight first-party analytics beacon for the public site.
 *
 * - Fires a `pageview` on initial load and on every client-side route change.
 * - Uses a single delegated click listener to capture outbound/CTA clicks
 *   (external links, or any element marked with `data-track-cta`) without
 *   having to edit every link in the app.
 *
 * Intentionally tiny and dependency-free so it can live outside the heavy
 * ClientEnhancements bundle.
 */
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageview, trackEvent } from '@/lib/track';

export default function AnalyticsBeacon() {
    const pathname = usePathname();
    const lastPath = useRef(null);

    // Pageview on mount + each route change.
    useEffect(() => {
        if (!pathname || lastPath.current === pathname) return;
        lastPath.current = pathname;
        trackPageview(pathname);
    }, [pathname]);

    // Delegated outbound / CTA click tracking.
    useEffect(() => {
        function onClick(e) {
            const el = e.target?.closest?.('a, [data-track-cta]');
            if (!el) return;

            const ctaLabel = el.getAttribute?.('data-track-cta');
            const href = el.getAttribute?.('href') || '';

            let isOutbound = false;
            let host = '';
            if (href) {
                try {
                    const url = new URL(href, window.location.href);
                    host = url.hostname.replace(/^www\./i, '');
                    isOutbound = url.host !== window.location.host
                        && (url.protocol === 'http:' || url.protocol === 'https:');
                } catch {
                    /* relative/non-URL href — not outbound */
                }
            }

            if (!isOutbound && !ctaLabel) return;

            trackEvent({
                type: 'outbound_click',
                path: window.location.pathname,
                meta: {
                    label: ctaLabel || undefined,
                    host: host || undefined,
                    href: href ? href.slice(0, 512) : undefined,
                },
            });
        }

        document.addEventListener('click', onClick, { capture: true, passive: true });
        return () => document.removeEventListener('click', onClick, { capture: true });
    }, []);

    return null;
}
