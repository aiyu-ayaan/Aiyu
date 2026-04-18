"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BlogsPageHeader() {
    const pathname = usePathname();
    const isBlogListPage = pathname === '/blogs';

    return (
        <header className="sticky top-0 z-40 border-b" style={{ borderColor: 'var(--border-secondary)', backgroundColor: 'var(--bg-secondary)' }}>
            <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
                <div className="flex items-center gap-4">
                    {isBlogListPage ? (
                        <Link
                            href="/"
                            className="text-sm font-medium hover:underline"
                            style={{ color: 'var(--accent-cyan)' }}
                        >
                            &larr; Back to site
                        </Link>
                    ) : (
                        <span className="text-xl font-bold" style={{ color: 'var(--accent-orange)' }}>
                            <Link href="/blogs">Blogger</Link>
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        Latest Insights
                    </p>
                </div>
            </div>
        </header>
    );
}


