"use client";
import React from 'react';
import Link from 'next/link';
import { Monitor, Palette, ExternalLink } from 'lucide-react';

// Lightweight Settings > Personalization pane. Wallpaper is managed from the
// admin config panel; this surfaces the current one and points there.
export default function Settings({ wallpaper }) {
    return (
        <div className="flex h-full w-full overflow-y-auto bg-[#f3f3f3] text-neutral-800 dark:bg-[#202020] dark:text-neutral-100">
            <aside className="hidden w-52 shrink-0 border-r border-black/10 p-3 dark:border-white/10 sm:block">
                <div className="mb-4 px-2 text-sm font-semibold">Settings</div>
                <div className="flex items-center gap-2 rounded bg-blue-500/15 px-2 py-1.5 text-sm text-blue-600 dark:text-blue-300">
                    <Palette className="h-4 w-4" /> Personalization
                </div>
                <div className="mt-1 flex items-center gap-2 rounded px-2 py-1.5 text-sm opacity-70">
                    <Monitor className="h-4 w-4" /> System
                </div>
            </aside>

            <div className="min-w-0 flex-1 p-6">
                <h2 className="mb-1 text-xl font-semibold">Personalization</h2>
                <p className="mb-6 text-sm opacity-60">Background</p>

                <div className="mb-6 overflow-hidden rounded-lg border border-black/10 dark:border-white/10">
                    <div
                        className="flex h-40 items-end bg-cover bg-center p-3"
                        style={
                            wallpaper
                                ? { backgroundImage: `url(${wallpaper})` }
                                : { background: 'radial-gradient(120% 120% at 30% 20%, #4a9eff 0%, #2b6fd6 35%, #1b3a8f 70%, #0b1d54 100%)' }
                        }
                    >
                        <span className="rounded bg-black/40 px-2 py-1 text-xs text-white">Current background</span>
                    </div>
                </div>

                <div className="rounded-lg border border-black/10 bg-white p-4 text-sm dark:border-white/10 dark:bg-white/5">
                    <p className="mb-3 opacity-80">
                        The desktop wallpaper is controlled from the admin panel. Set an image URL there to personalize
                        this background. Leave it blank to use the default Windows-style bloom.
                    </p>
                    <Link
                        href="/admin/config"
                        className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                    >
                        Open Admin Config <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
