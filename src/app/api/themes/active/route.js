import { prisma } from "@/lib/prisma";
import { getSingleton, upsertSingleton, toClient } from "@/lib/serialize";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import { isPredefinedTheme, getTheme } from "@/lib/themePresets";
import cache, { CACHE_TTL, createCacheDebugHeaders } from "@/lib/cache";
import { createPublicCacheHeaders, RESPONSE_CACHE } from "@/lib/httpCache";

const CACHE_KEY_ACTIVE_THEME = 'db:themes:active';

// GET /api/themes/active - Get the currently active theme
export async function GET() {
    try {
        const { value: activeThemePayload, meta } = await cache.getOrSetWithMeta(
            CACHE_KEY_ACTIVE_THEME,
            async () => {
                let config = await getSingleton(prisma, 'config');

                if (!config) {
                    config = await upsertSingleton(prisma, 'config', {
                        activeTheme: 'vs-code-dark',
                        activeThemeVariant: 'dark',
                        allowThemeSwitching: true,
                    });
                }

                const activeThemeSlug = config.activeTheme || 'vs-code-dark';
                const activeVariant = config.activeThemeVariant || 'dark';

                let themeData;
                if (isPredefinedTheme(activeThemeSlug)) {
                    themeData = getTheme(activeThemeSlug);
                } else {
                    themeData = toClient('theme', await prisma.theme.findFirst({ where: { slug: activeThemeSlug } }));
                }

                if (!themeData) {
                    themeData = getTheme('vs-code-dark');
                }

                return {
                    theme: themeData,
                    activeVariant,
                    allowThemeSwitching: config.allowThemeSwitching,
                    perPageThemes: config.perPageThemes || { enabled: false, pages: {} },
                };
            },
            CACHE_TTL.SHORT
        );

        return NextResponse.json({
            success: true,
            data: activeThemePayload,
        }, {
            headers: {
                ...createPublicCacheHeaders(RESPONSE_CACHE.PUBLIC_SHORT),
                ...createCacheDebugHeaders(meta),
            },
        });
    } catch (error) {
        console.error("Error fetching active theme:", error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

// PATCH /api/themes/active - Set the active theme
export async function PATCH(request) {
    try {
        const session = await getSession();

        if (!session) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { themeSlug, variant, perPageThemes } = body;

        const config = (await getSingleton(prisma, 'config')) || {};
        const patch = {};

        // Handle standard theme update
        if (themeSlug) {
            // Verify the theme exists
            let themeExists = false;
            if (isPredefinedTheme(themeSlug)) {
                themeExists = true;
            } else {
                const customTheme = await prisma.theme.findUnique({ where: { slug: themeSlug }, select: { id: true } });
                themeExists = !!customTheme;
            }

            if (!themeExists) {
                return NextResponse.json(
                    { success: false, error: "Theme not found" },
                    { status: 404 }
                );
            }
            patch.activeTheme = themeSlug;
        }

        if (variant) {
            if (!['light', 'dark'].includes(variant)) {
                return NextResponse.json(
                    { success: false, error: "variant must be 'light' or 'dark'" },
                    { status: 400 }
                );
            }
            patch.activeThemeVariant = variant;
        }

        // Handle per-page theme update (merge with existing)
        if (perPageThemes) {
            const current = config.perPageThemes || { enabled: false, pages: {} };
            const merged = { ...current };
            if (typeof perPageThemes.enabled === 'boolean') {
                merged.enabled = perPageThemes.enabled;
            }
            if (perPageThemes.pages) {
                merged.pages = perPageThemes.pages;
            }
            patch.perPageThemes = merged;
        }

        const updated = await upsertSingleton(prisma, 'config', patch);
        await cache.invalidatePrefixAsync('db:themes');
        await cache.invalidatePrefixAsync('db:config');

        return NextResponse.json({
            success: true,
            message: "Active theme updated successfully",
            data: {
                activeTheme: updated.activeTheme,
                activeThemeVariant: updated.activeThemeVariant,
                perPageThemes: updated.perPageThemes,
            }
        });
    } catch (error) {
        console.error("Error setting active theme:", error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
