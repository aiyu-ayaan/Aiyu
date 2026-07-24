import Desktop from '@/app/components/desktop/Desktop';
import { prisma } from '@/lib/prisma';
import { getSingleton } from '@/lib/serialize';

export const metadata = {
    title: 'Desktop — Aiyu OS',
    description: 'A Windows 11 style desktop experience for the Aiyu portfolio: file explorer, code viewer, and browser.',
    robots: { index: false, follow: false },
};

// Windows 11 default is a copyrighted bloom render; we ship a CSS bloom that
// evokes it and let the admin override the wallpaper from /admin/config.
export const DEFAULT_WALLPAPER = '';

export default async function DesktopPage() {
    let wallpaper = DEFAULT_WALLPAPER;
    try {
        const config = await getSingleton(prisma, 'config');
        if (config?.desktopWallpaper && typeof config.desktopWallpaper === 'string') {
            wallpaper = config.desktopWallpaper.trim();
        }
    } catch {
        // Fall back to the default bloom if config is unavailable.
    }

    return <Desktop wallpaper={wallpaper} />;
}
