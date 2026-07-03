import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getConfigData } from './dataFetchers';

export const SITE_VERSION_COOKIE = 'site-version';

/**
 * Server-side gate for classic routes that have a /v2 counterpart. When the
 * admin sets `defaultSiteVersion: 'v2'` (see /admin/version), visitors land
 * on the v2 page instead — unless they have explicitly opted back into the
 * classic site (the `site-version=classic` cookie, set by the v2 header's
 * [classic] link), so the classic pages stay reachable and don't bounce.
 *
 * Call at the top of a classic page's server component:
 *   await redirectToV2IfDefault('/v2/projects');
 */
export async function redirectToV2IfDefault(v2Path) {
    const config = await getConfigData();
    if (config?.defaultSiteVersion !== 'v2') return;

    const cookieStore = await cookies();
    if (cookieStore.get(SITE_VERSION_COOKIE)?.value === 'classic') return;

    redirect(v2Path);
}
