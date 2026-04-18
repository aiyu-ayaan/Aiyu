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
                    {isBlogListPage && (
                        <Link
                            href="/"
                            className="text-sm font-medium hover:underline"
                            style={{ color: 'var(--accent-cyan)' }}
                        >
                            &larr; Back to site
                        </Link>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    <Link 
                        href="/blogs"
                        className="text-sm font-semibold hover:underline" 
                        style={{ color: 'var(--text-primary)' }}
                    >
                        Latest Insights
                    </Link>
                </div>
            </div>
        </header>
    );
}


