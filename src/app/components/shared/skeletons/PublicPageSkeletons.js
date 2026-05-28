'use client';

const shellPanelStyle = {
    borderColor: 'color-mix(in srgb, var(--border-secondary) 74%, transparent)',
    background:
        'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 92%, transparent), color-mix(in srgb, var(--bg-secondary) 92%, transparent))',
    boxShadow: '0 14px 28px var(--shadow-sm)',
};

const blockStyle = {
    backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 84%, transparent)',
};

function SkeletonBlock({ className = '', style = {} }) {
    return (
        <div
            aria-hidden="true"
            className={`animate-pulse motion-reduce:animate-none rounded-lg ${className}`}
            style={{ ...blockStyle, ...style }}
        />
    );
}

function PageShell({ maxWidth = 'w-full max-w-[95%] lg:max-w-[80%]', children }) {
    return (
        <div className="min-h-screen p-4 lg:p-8">
            <div className={`mx-auto ${maxWidth} space-y-6`} aria-busy="true" aria-live="polite">
                {children}
            </div>
        </div>
    );
}

function HeroSkeleton({ stats = 3 }) {
    return (
        <section className="rounded-3xl border p-6 sm:p-8" style={shellPanelStyle}>
            <SkeletonBlock className="mb-3 h-5 w-40" />
            <SkeletonBlock className="mb-3 h-12 w-3/4" />
            <SkeletonBlock className="h-6 w-2/3" />

            <div className={`mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 ${stats > 3 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
                {Array.from({ length: stats }).map((_, index) => (
                    <div
                        key={`hero-stat-${index}`}
                        className="rounded-xl border p-3"
                        style={{
                            borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)',
                            backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 82%, transparent)',
                        }}
                    >
                        <SkeletonBlock className="mb-2 h-4 w-2/3" />
                        <SkeletonBlock className="h-6 w-1/2" />
                    </div>
                ))}
            </div>
        </section>
    );
}

function FilterBarSkeleton({ chips = 6 }) {
    return (
        <section className="rounded-2xl border p-4 sm:p-5" style={shellPanelStyle}>
            <SkeletonBlock className="mb-3 h-4 w-32" />
            <SkeletonBlock className="h-10 w-full" />
            <div className="mt-4 flex flex-wrap gap-2">
                {Array.from({ length: chips }).map((_, index) => (
                    <SkeletonBlock key={`chip-${index}`} className="h-8 w-24 rounded-full" />
                ))}
            </div>
        </section>
    );
}

function CardGridSkeleton({ cards = 6, minHeightClass = 'h-60' }) {
    return (
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: cards }).map((_, index) => (
                <article
                    key={`card-${index}`}
                    className="overflow-hidden rounded-2xl border"
                    style={{
                        borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)',
                        backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 82%, transparent)',
                    }}
                >
                    <SkeletonBlock className={`${minHeightClass} w-full rounded-none`} />
                    <div className="space-y-3 p-4">
                        <SkeletonBlock className="h-5 w-2/3" />
                        <SkeletonBlock className="h-4 w-full" />
                        <SkeletonBlock className="h-4 w-5/6" />
                    </div>
                </article>
            ))}
        </section>
    );
}

function DetailContentSkeleton() {
    return (
        <>
            <section className="rounded-2xl border p-5 sm:p-7" style={shellPanelStyle}>
                <SkeletonBlock className="mb-4 h-10 w-4/5" />
                <div className="mb-5 flex gap-3">
                    <SkeletonBlock className="h-6 w-28 rounded-full" />
                    <SkeletonBlock className="h-6 w-28 rounded-full" />
                </div>
                <SkeletonBlock className="h-72 w-full" />
            </section>

            <section className="rounded-2xl border p-5 sm:p-8" style={shellPanelStyle}>
                <div className="space-y-4">
                    <SkeletonBlock className="h-5 w-full" />
                    <SkeletonBlock className="h-5 w-full" />
                    <SkeletonBlock className="h-5 w-11/12" />
                    <SkeletonBlock className="h-5 w-full" />
                    <SkeletonBlock className="h-5 w-10/12" />
                    <SkeletonBlock className="h-5 w-full" />
                </div>
            </section>
        </>
    );
}

export function HomePageSkeleton() {
    return (
        <PageShell maxWidth="w-full max-w-[95%] lg:max-w-[80%]">
            <section className="rounded-3xl border p-6 sm:p-8 lg:p-10" style={shellPanelStyle}>
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                    <div>
                        <SkeletonBlock className="mb-4 h-14 w-4/5" />
                        <SkeletonBlock className="mb-3 h-8 w-3/5" />
                        <SkeletonBlock className="mb-3 h-8 w-2/3" />

                        <div
                            className="mt-6 rounded-2xl border p-5"
                            style={{
                                borderColor: 'color-mix(in srgb, var(--border-secondary) 70%, transparent)',
                                backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 80%, transparent)',
                            }}
                        >
                            <SkeletonBlock className="mb-3 h-4 w-4/5" />
                            <SkeletonBlock className="mb-3 h-4 w-11/12" />
                            <SkeletonBlock className="mb-3 h-4 w-3/4" />
                            <SkeletonBlock className="h-16 w-full" />
                        </div>
                    </div>

                    <div
                        className="rounded-2xl border p-4"
                        style={{
                            borderColor: 'color-mix(in srgb, var(--border-secondary) 70%, transparent)',
                            backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 80%, transparent)',
                        }}
                    >
                        <SkeletonBlock className="h-75 w-full rounded-xl sm:h-90" />
                    </div>
                </div>
            </section>

            <section className="rounded-3xl border p-5 sm:p-7" style={shellPanelStyle}>
                <SkeletonBlock className="mb-4 h-7 w-1/2" />
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div
                            key={`home-stat-${index}`}
                            className="rounded-xl border p-3"
                            style={{
                                borderColor: 'color-mix(in srgb, var(--border-secondary) 70%, transparent)',
                                backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 82%, transparent)',
                            }}
                        >
                            <SkeletonBlock className="mb-2 h-6 w-1/2" />
                            <SkeletonBlock className="h-4 w-3/4" />
                        </div>
                    ))}
                </div>
            </section>
        </PageShell>
    );
}

export function BlogListPageSkeleton() {
    return (
        <PageShell>
            <HeroSkeleton stats={3} />
            <FilterBarSkeleton chips={7} />
            <CardGridSkeleton cards={6} minHeightClass="h-44" />
        </PageShell>
    );
}

export function GalleryPageSkeleton() {
    return (
        <PageShell maxWidth="w-full max-w-[95%] lg:max-w-[80%]">
            <HeroSkeleton stats={4} />
            <FilterBarSkeleton chips={5} />
            <CardGridSkeleton cards={9} minHeightClass="h-52" />
        </PageShell>
    );
}

export function GitHubPageSkeleton() {
    return (
        <PageShell maxWidth="w-full max-w-[95%] lg:max-w-[80%]">
            <HeroSkeleton stats={5} />
            <section className="rounded-2xl border p-5" style={shellPanelStyle}>
                <SkeletonBlock className="mb-4 h-8 w-1/3" />
                <CardGridSkeleton cards={6} minHeightClass="h-36" />
            </section>
        </PageShell>
    );
}

export function ProjectsPageSkeleton() {
    return (
        <PageShell>
            <HeroSkeleton stats={3} />
            <FilterBarSkeleton chips={8} />
            <CardGridSkeleton cards={6} minHeightClass="h-44" />
        </PageShell>
    );
}

export function AboutPageSkeleton() {
    return (
        <PageShell>
            <HeroSkeleton stats={4} />
            <section className="rounded-2xl border p-5 sm:p-8" style={shellPanelStyle}>
                <SkeletonBlock className="mb-4 h-8 w-1/3" />
                <div className="space-y-3">
                    <SkeletonBlock className="h-5 w-full" />
                    <SkeletonBlock className="h-5 w-full" />
                    <SkeletonBlock className="h-5 w-4/5" />
                    <SkeletonBlock className="h-5 w-full" />
                </div>
            </section>
        </PageShell>
    );
}

export function ContactPageSkeleton() {
    return (
        <PageShell>
            <HeroSkeleton stats={3} />
            <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <section className="rounded-2xl border p-5 lg:col-span-2" style={shellPanelStyle}>
                    <SkeletonBlock className="mb-3 h-8 w-1/3" />
                    <SkeletonBlock className="mb-5 h-5 w-2/3" />
                    <div className="space-y-4">
                        <SkeletonBlock className="h-11 w-full" />
                        <SkeletonBlock className="h-11 w-full" />
                        <SkeletonBlock className="h-40 w-full" />
                        <SkeletonBlock className="h-11 w-40" />
                    </div>
                </section>

                <div className="space-y-4">
                    <section className="rounded-2xl border p-4" style={shellPanelStyle}>
                        <SkeletonBlock className="mb-2 h-4 w-24" />
                        <SkeletonBlock className="h-6 w-4/5" />
                    </section>
                    <section className="rounded-2xl border p-4" style={shellPanelStyle}>
                        <SkeletonBlock className="mb-2 h-4 w-24" />
                        <SkeletonBlock className="h-6 w-3/4" />
                    </section>
                </div>
            </section>
        </PageShell>
    );
}

export function BlogDetailPageSkeleton() {
    return (
        <PageShell>
            <DetailContentSkeleton />
        </PageShell>
    );
}

export function WorkInProgressPageSkeleton() {
    return (
        <PageShell>
            <section className="rounded-2xl border p-8 sm:p-10" style={shellPanelStyle}>
                <SkeletonBlock className="mb-4 h-10 w-2/3" />
                <SkeletonBlock className="mb-6 h-5 w-3/4" />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <SkeletonBlock className="h-36 w-full" />
                    <SkeletonBlock className="h-36 w-full" />
                </div>
            </section>
        </PageShell>
    );
}
