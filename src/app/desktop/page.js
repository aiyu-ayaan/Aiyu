import ReactDOM from 'react-dom';
import Desktop from '@/app/components/desktop/Desktop';
import { DeviceModeProvider } from '@/app/context/DeviceModeContext';
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

// Only these config keys are read by the desktop shell and its apps. The full
// Config blob carries heavy fields (resume LaTeX source, long-form copy) that
// would otherwise be serialized into the RSC payload for every visitor.
const DESKTOP_CONFIG_KEYS = [
    'siteTitle',
    'authorName',
    'deviceName',
    'osVersion',
    'desktopDeviceName',
    'desktopOsVersion',
];

export default async function DesktopPage() {
    let wallpaper = DEFAULT_WALLPAPER;
    let configObj = {};
    try {
        const config = await getSingleton(prisma, 'config');
        if (config) {
            for (const key of DESKTOP_CONFIG_KEYS) {
                if (config[key] !== undefined) configObj[key] = config[key];
            }
            // Derived, matching sanitizeConfigForPublic(): the raw singleton has
            // no `hasCustomFavicon` field, only the `favicon` sub-object.
            configObj.hasCustomFavicon = Boolean(
                config?.favicon?.value || config?.favicon?.filename || config?.favicon?.mimeType
            );
            if (config.desktopWallpaper && typeof config.desktopWallpaper === 'string') {
                wallpaper = config.desktopWallpaper.trim();
            }
        }
    } catch {
        // Fall back to the default bloom if config is unavailable.
    }

    // The wallpaper is the LCP element but is applied as a CSS background on a
    // client component, so the preload scanner cannot see it until hydration.
    if (wallpaper) {
        ReactDOM.preload(wallpaper, { as: 'image', fetchPriority: 'high' });
    }

    return (
        <DeviceModeProvider>
            <Desktop wallpaper={wallpaper} config={configObj} />
        </DeviceModeProvider>
    );
}
