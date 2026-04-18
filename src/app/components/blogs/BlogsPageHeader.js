"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BlogsPageHeader() {
    const pathname = usePathname();
    const isBlogListPage = pathname === '/blogs';

    return (
        <header className="sticky top-0 z-40 border-b backdrop-blur" style={{ borderColor: 'color-mix(in srgb, var(--border-secondary) 78%, transparent)', backgroundColor: 'color-mix(in srgb, var(--bg-secondary) 92%, transparent)' }}>
            <div className={`mx-auto flex h-14 w-full max-w-6xl items-center px-4 sm:px-6 ${isBlogListPage ? 'justify-between' : 'justify-end'}`}>
                {isBlogListPage ? (
                    <Link
                        href="/"
                        className="inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide"
                        style={{
                            borderColor: 'color-mix(in srgb, var(--border-secondary) 74%, transparent)',
                            color: 'var(--text-secondary)',
                            backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 84%, transparent)',
                        }}
                    >
                        Back to site
                    </Link>
                ) : null}

                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Latest Insights
                </p>
            </div>
        </header>
    );
}
