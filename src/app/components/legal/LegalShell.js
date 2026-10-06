import Link from 'next/link';

/**
 * Shared frame for the legal hub and document pages: eyebrow, title, meta row,
 * and the cross-links that tie a legal page back to its app and siblings.
 */
export default function LegalShell({ eyebrow, title, meta = [], app, documents = [], activeSlug, linkedApp, children }) {
    return (
        <article className="mx-auto w-full max-w-3xl px-4 pt-28 pb-24 sm:px-6 md:pt-36">
            <nav aria-label="Breadcrumb" className="mb-6 font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>
                <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <li><Link href="/" className="hover:underline">home</Link></li>
                    <li aria-hidden="true">/</li>
                    <li>
                        {activeSlug ? (
                            <Link href={`/${app.slug}`} className="hover:underline">{app.slug}</Link>
                        ) : (
                            <span aria-current="page">{app.slug}</span>
                        )}
                    </li>
                    {activeSlug && (
                        <>
                            <li aria-hidden="true">/</li>
                            <li aria-current="page">{activeSlug}</li>
                        </>
                    )}
                </ol>
            </nav>

            <header className="mb-10 border-b pb-8" style={{ borderColor: 'var(--border-primary)' }}>
                <p className="mb-3 font-mono text-xs uppercase tracking-[0.25em]" style={{ color: 'var(--accent-cyan)' }}>{eyebrow}</p>
                <h1 className="text-3xl font-bold tracking-tight sm:text-5xl" style={{ color: 'var(--text-bright)' }}>{title}</h1>
                {meta.length > 0 && (
                    <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {meta.map((item) => <span key={item}>{item}</span>)}
                    </p>
                )}
            </header>

            {children}

            {(documents.length > 1 || linkedApp) && (
                <footer className="mt-16 border-t pt-8" style={{ borderColor: 'var(--border-primary)' }}>
                    {documents.length > 1 && (
                        <>
                            <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.25em]" style={{ color: 'var(--text-tertiary)' }}>
                                More from {app.name}
                            </h2>
                            <ul className="flex flex-wrap gap-2">
                                {documents.filter((d) => d.slug !== activeSlug).map((doc) => (
                                    <li key={doc.slug}>
                                        <Link
                                            href={`/${app.slug}/${doc.slug}`}
                                            className="inline-block rounded-full border px-3 py-1.5 font-mono text-xs transition-colors hover:opacity-80"
                                            style={{ borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                                        >
                                            {doc.title}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                    {linkedApp && (
                        <p className="mt-6 font-mono text-sm" style={{ color: 'var(--text-tertiary)' }}>
                            About the app:{' '}
                            <Link href={linkedApp.href} className="underline underline-offset-4" style={{ color: 'var(--accent-cyan)' }}>
                                {linkedApp.name} →
                            </Link>
                        </p>
                    )}
                </footer>
            )}
        </article>
    );
}
