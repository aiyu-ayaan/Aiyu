import Desktop from '@/app/components/desktop/Desktop';
import { prisma } from '@/lib/prisma';
import { getSingleton } from '@/lib/serialize';

export const metadata = {
    title: 'Desktop — Aiyu OS',
    description: 'A Windows 11 style desktop experience for the Aiyu portfolio: file explorer, code viewer, and browser.',
    robots: { index: false, follow: false },
};

// Default desktop wallpaper (admin can override from /admin/config). Used as a
// CSS background-image, so no next/image remote pattern is required.
export const DEFAULT_WALLPAPER =
    'https://images.unsplash.com/photo-1702539336564-b37d0f3276e7?q=80&w=2064&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';

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
