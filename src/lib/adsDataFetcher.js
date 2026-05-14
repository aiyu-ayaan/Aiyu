import dbConnect from '@/lib/db';
import cache, { CACHE_TTL } from '@/lib/cache';
import AdsModel from '@/models/Ads';
import { decrypt } from '@/lib/encryption';

const IS_PRODUCTION_BUILD = process.env.NEXT_PHASE === 'phase-production-build';
const ALLOW_DB_DURING_BUILD = process.env.ALLOW_DB_DURING_BUILD === 'true';
const LOG_BUILD_FALLBACKS = process.env.LOG_BUILD_FALLBACKS === 'true';
const SKIP_DB_DURING_BUILD = IS_PRODUCTION_BUILD && !ALLOW_DB_DURING_BUILD;

if (!global.__adsDataFetcherFallbackWarnings) {
    global.__adsDataFetcherFallbackWarnings = new Set();
}

function warnAdsFetcherFallback(error = null) {
    const warningKey = error ? 'getAdsData:error' : 'getAdsData:build';
    if (global.__adsDataFetcherFallbackWarnings.has(warningKey)) {
        return;
    }
    global.__adsDataFetcherFallbackWarnings.add(warningKey);

    if (error) {
        console.warn(`[adsDataFetcher] getAdsData fallback used: ${error?.message || 'Unknown error'}`);
        return;
    }

    if (LOG_BUILD_FALLBACKS) {
        console.warn(
            '[adsDataFetcher] getAdsData fallback used during production build. Set ALLOW_DB_DURING_BUILD=true to enable DB reads at build time.'
        );
    }
}

export async function getAdsData() {
    if (SKIP_DB_DURING_BUILD) {
        warnAdsFetcherFallback();
        return null;
    }

    try {
        const adsData = await cache.getOrSet(
            'db:ads',
            async () => {
                await dbConnect();
                return AdsModel.findOne().select(
                    '+encryptedClientId ' +
                    '+placements.top.encryptedSlotId ' +
                    '+placements.middle.encryptedSlotId ' +
                    '+placements.bottom.encryptedSlotId ' +
                    '+placements.sidebar.encryptedSlotId ' +
                    '+placements.footer.encryptedSlotId'
                ).lean();
            },
            CACHE_TTL.LONG
        );

        if (!adsData || !adsData.adsenseEnabled) {
            return null;
        }

        const placements = {};
        const placementKeys = ['top', 'middle', 'bottom', 'sidebar', 'footer'];

        placementKeys.forEach((key) => {
            const placement = adsData.placements?.[key] || {};
            placements[key] = {
                enabled: placement.enabled || false,
                slotId: decrypt(placement.encryptedSlotId) || '',
                adType: placement.adType || 'display',
                adLayoutKey: placement.adLayoutKey || '',
            };
        });

        return {
            adsenseEnabled: adsData.adsenseEnabled,
            clientId: decrypt(adsData.encryptedClientId) || '',
            placements,
        };
    } catch (error) {
        warnAdsFetcherFallback(error);
        return null;
    }
}
