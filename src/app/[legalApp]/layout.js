import V2Layout from '../v2/layout';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Legal pages (/<app>, /<app>/<doc>) sit outside the /v2 tree because their URL
 * must be short and version-free. They borrow the site chrome so navigation,
 * theme and footer links match the rest of the site.
 */
export default function LegalLayout({ children }) {
    return <V2Layout>{children}</V2Layout>;
}
