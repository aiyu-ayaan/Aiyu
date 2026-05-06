const isProductionBuild = process.env.NEXT_PHASE === 'phase-production-build';
const isWarmupDisabled = process.env.DISABLE_STARTUP_CACHE_WARMUP === 'true';

async function warmPublicDataCache() {
    if (isProductionBuild || isWarmupDisabled) {
        return;
    }

    const {
        getAboutData,
        getConfigData,
        getDeploymentsData,
        getGalleryData,
        getHomePageData,
        getLayoutData,
        getProjectsData,
        getPublishedBlogsPage,
    } = await import('@/lib/dataFetchers');

    const results = await Promise.allSettled([
        getLayoutData(),
        getHomePageData(),
        getConfigData(),
        getAboutData(),
        getProjectsData(),
        getDeploymentsData(),
        getPublishedBlogsPage({ page: 1, limit: 6 }),
        getGalleryData(),
    ]);

    const failedWarmups = results.filter((result) => result.status === 'rejected');
    if (failedWarmups.length > 0) {
        console.warn(`[startup-cache] ${failedWarmups.length} public data warmup task(s) failed.`);
    }
}

export async function register() {
    if (process.env.NEXT_RUNTIME !== 'nodejs') {
        return;
    }

    setTimeout(() => {
        warmPublicDataCache().catch((error) => {
            console.warn(`[startup-cache] warmup skipped: ${error?.message || 'unknown error'}`);
        });
    }, 1000);
}
