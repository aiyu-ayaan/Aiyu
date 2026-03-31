"use client";

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';

const ROUTE_ALIASES = [
    ['/live-deployments', '/apps'],
    ['/deployments', '/apps'],
    ['/contact', '/contact-us'],
    ['/about', '/about-me'],
    ['/blog', '/blogs'],
];

const normalizePath = (value) => {
    const path = String(value || '').trim();
    if (!path) return '/';
    const stripped = path.split('?')[0].split('#')[0];
    if (stripped === '/') return '/';
    return stripped.endsWith('/') ? stripped.slice(0, -1) : stripped;
};

const canonicalizePath = (value) => {
    const normalized = normalizePath(value);

    for (const [from, to] of ROUTE_ALIASES) {
        if (normalized === from) return to;
        if (normalized.startsWith(`${from}/`)) {
            return `${to}${normalized.slice(from.length)}`;
        }
    }

    return normalized;
};

const matchesRouteOrChild = (currentPath, routePath) => {
    const current = canonicalizePath(currentPath);
    const route = canonicalizePath(routePath);

    if (route === '/') {
        return current === '/';
    }

    return current === route || current.startsWith(`${route}/`);
};

export default function RouteBetaBadge() {
    const pathname = usePathname();
    const [betaRoutes, setBetaRoutes] = useState([]);

    useEffect(() => {
        let isMounted = true;

        const loadHeader = async () => {
            try {
                const response = await fetch('/api/header', { cache: 'no-store' });
                if (!response.ok) return;

                const data = await response.json();
                if (!isMounted || !data?.navLinks) return;

                setBetaRoutes(
                    data.navLinks
                        .filter((link) => link?.beta === true && typeof link?.href === 'string')
                        .map((link) => link.href)
                );
            } catch (error) {
                console.error('Failed to load beta routes', error);
            }
        };

        loadHeader();

        return () => {
            isMounted = false;
        };
    }, []);

    const isBeta = useMemo(
        () => betaRoutes.some((route) => matchesRouteOrChild(pathname, route)),
        [betaRoutes, pathname]
    );

    if (!isBeta) return null;

    return (
        <span
            className="inline-flex rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] font-semibold"
            style={{
                borderColor: 'color-mix(in srgb, var(--accent-orange) 52%, var(--border-secondary))',
                color: 'var(--accent-orange-bright)',
                backgroundColor: 'color-mix(in srgb, var(--accent-orange) 12%, transparent)',
            }}
        >
            Beta
        </span>
    );
}
