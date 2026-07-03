"use client";

import React from 'react';
import { usePathname } from 'next/navigation';

/**
 * The v2 shell's background. Most pages get the tinted depth gradient; the
 * blog index and articles stay on the plain theme background (dark in dark
 * mode, white in light) so reading is distraction-free. Blogs answer at
 * /v2/blogs normally and at /blogs when v2 is the admin default (proxy
 * rewrite keeps the classic URL), so both prefixes count as reading routes.
 */
const V2Backdrop = () => {
    const pathname = usePathname();
    const isReadingRoute = pathname.startsWith('/v2/blogs') || pathname.startsWith('/blogs');

    if (isReadingRoute) {
        return (
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-0"
                style={{ backgroundColor: 'var(--bg-primary)' }}
            />
        );
    }

    return (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
            <div
                className="absolute inset-0"
                style={{
                    background:
                        'radial-gradient(circle at 50% -10%, color-mix(in srgb, var(--text-bright) 8%, transparent), transparent 34%), linear-gradient(180deg, color-mix(in srgb, var(--bg-tertiary) 78%, var(--bg-primary)), var(--bg-primary) 42%, color-mix(in srgb, var(--bg-secondary) 86%, var(--bg-primary)))',
                }}
            />
            <div
                className="absolute inset-x-0 top-0 h-px"
                style={{
                    background: 'linear-gradient(90deg, transparent, color-mix(in srgb, var(--text-bright) 18%, transparent), transparent)',
                }}
            />
        </div>
    );
};

export default V2Backdrop;
