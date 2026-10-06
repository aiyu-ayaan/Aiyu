import Link from 'next/link';

/**
 * App + project cards on the legal hub (/<app>), so the hub is a real entry
 * point into the product rather than a dead-end list of policies. Each card is
 * one internal link to its canonical page; the external button (live app /
 * source) sits outside that link so the two never nest.
 */
export default function LegalShowcaseCards({ app, project }) {
    const cards = [
        app && { ...app, kind: 'app', eyebrow: '~/apps', cta: 'view app', externalLabel: 'open --app' },
        project && { ...project, kind: 'project', eyebrow: '~/projects', cta: 'view project', externalLabel: 'view --source' },
    ].filter(Boolean);

    if (cards.length === 0) return null;

    return (
        <section aria-labelledby="legal-related" className="mb-14">
            <h2 id="legal-related" className="mb-4 font-mono text-xs uppercase tracking-[0.25em]" style={{ color: 'var(--text-tertiary)' }}>
                {'// about this app'}
            </h2>
            <div className={`grid grid-cols-1 gap-5 ${cards.length > 1 ? 'sm:grid-cols-2' : ''}`}>
                {cards.map((card) => <ShowcaseCard key={card.kind} card={card} />)}
            </div>
        </section>
    );
}

function ShowcaseCard({ card }) {
    const meta = [
        card.status,
        card.type,
        card.language,
        card.stars > 0 ? `★ ${card.stars}` : '',
    ].filter(Boolean);
    const isExternal = /^https?:\/\//i.test(card.externalUrl || '');

    return (
        <article
            className="group relative flex flex-col overflow-hidden rounded-2xl border transition-colors hover:border-[color:var(--accent-cyan)]"
            style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-tile, var(--bg-secondary))' }}
        >
            {card.image ? (
                <div className="aspect-video overflow-hidden border-b" style={{ borderColor: 'var(--border-primary)' }}>
                    {/* Plain <img>: admin-supplied images may live on any host. */}
                    <img
                        src={card.image}
                        alt={card.name}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                </div>
            ) : null}

            <div className="flex flex-1 flex-col p-5">
                <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.25em]" style={{ color: 'var(--accent-cyan)' }}>
                    {card.eyebrow}
                </p>
                <h3 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-bright)' }}>
                    {/* Stretched link: the whole card opens the canonical page. */}
                    <Link href={card.href} className="after:absolute after:inset-0 after:content-['']">
                        {card.name}
                    </Link>
                </h3>
                {meta.length > 0 && (
                    <p className="mt-1 font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>{meta.join(' · ')}</p>
                )}
                {card.description && (
                    <p className="mt-3 line-clamp-3 text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                        {card.description}
                    </p>
                )}
                {card.techStack.length > 0 && (
                    <ul className="mt-4 flex flex-wrap gap-1.5">
                        {card.techStack.slice(0, 6).map((tech) => (
                            <li
                                key={tech}
                                className="rounded-full border px-2.5 py-0.5 font-mono text-[11px]"
                                style={{ borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                            >
                                {tech}
                            </li>
                        ))}
                    </ul>
                )}

                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5 font-mono text-xs">
                    <span style={{ color: 'var(--accent-cyan)' }}>{card.cta} →</span>
                    {isExternal && (
                        <a
                            href={card.externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="relative z-10 rounded-full border px-3 py-1 transition-opacity hover:opacity-80"
                            style={{ borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                        >
                            {card.externalLabel} ↗
                        </a>
                    )}
                </div>
            </div>
        </article>
    );
}
