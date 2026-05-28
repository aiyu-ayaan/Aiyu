"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaBolt } from 'react-icons/fa';

export default function BlogsPageHeader({ config }) {
    const pathname = usePathname();
    const isBlogListPage = pathname === '/blogs';

    const rawMessage = config?.blogAutomationMessage || 'These entries are synchronized dynamically.';
    const messageLines = rawMessage.split(/\r?\n/);

    return (
        <header
            className="sticky top-0 z-40 overflow-x-clip border-b"
            style={{ borderColor: 'var(--border-secondary)', backgroundColor: 'var(--bg-secondary)' }}
        >
            <div className="mx-auto flex h-14 w-full max-w-[95%] lg:max-w-[80%] xl:max-w-7xl items-center justify-between px-4 sm:px-6">
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

                <div className="flex items-center gap-4 relative">
                    <Link 
                        href="/blogs"
                        className="text-sm font-semibold hover:underline" 
                        style={{ color: 'var(--text-primary)' }}
                    >
                        {config?.blogsTitle || 'Latest Insights'}
                    </Link>
                    
                    {config?.isBlogAutomated && (
                        <div className="relative flex flex-col items-center justify-center cursor-help group">
                            <FaBolt className="w-3.5 h-3.5 transition-all duration-300 group-hover:scale-110" style={{ color: 'var(--accent-cyan)' }} />
                            
                            <div className="absolute top-8 left-1/2 -translate-x-1/2 lg:right-auto lg:left-1/2 lg:-translate-x-1/2 w-64 p-3 rounded-lg border text-xs opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-xl"
                                style={{
                                    backgroundColor: 'var(--bg-elevated)',
                                    borderColor: 'var(--border-secondary)',
                                    color: 'var(--text-secondary)'
                                }}
                            >
                                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 border-l border-t"
                                    style={{
                                        backgroundColor: 'var(--bg-elevated)',
                                        borderColor: 'var(--border-secondary)'
                                    }}
                                />
                                <div className="relative z-10 flex flex-col gap-1.5">
                                    <div className="flex items-center gap-2 font-bold mb-1" style={{ color: 'var(--accent-cyan)' }}>
                                        <FaBolt className="w-3.5 h-3.5" />
                                        <span>Automated Transmissions</span>
                                    </div>
                                    <div className="flex flex-col gap-1.5 leading-relaxed">
                                        {messageLines.map((line, idx) => {
                                            const trimmedLine = line.trim();
                                            if (!trimmedLine) return null;
                                            
                                            const isBullet = trimmedLine.startsWith('-') || trimmedLine.startsWith('*');
                                            const text = isBullet ? trimmedLine.substring(1).trim() : trimmedLine;
                                            
                                            if (isBullet) {
                                                return (
                                                    <div key={idx} className="flex items-start gap-2 ml-1">
                                                        <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: 'var(--accent-cyan)' }} />
                                                        <span className="flex-1">{text}</span>
                                                    </div>
                                                );
                                            }
                                            
                                            return <p key={idx}>{text}</p>;
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

