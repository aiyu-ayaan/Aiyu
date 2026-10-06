import SiteLayout from '../v1/layout';
import V2Layout from '../v2/layout';
import { getConfigData } from '@/lib/dataFetchers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Legal pages (/<app>, /<app>/<doc>) sit outside the /v1 and /v2 trees because
 * their URL must be short and version-free. They borrow the chrome of whichever
 * version is the site default so navigation, theme and footer links match the
 * rest of the site.
 */
export default async function LegalLayout({ children }) {
    const config = await getConfigData();
    const Layout = config?.defaultSiteVersion === 'v2' ? V2Layout : SiteLayout;
    return <Layout>{children}</Layout>;
}
