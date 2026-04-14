import dbConnect from "@/lib/db";
import Config from "@/models/Config";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import { isPredefinedTheme, getTheme } from "@/lib/themePresets";
import Theme from "@/models/Theme";
import cache, { CACHE_TTL, createCacheDebugHeaders } from "@/lib/cache";
import { createPublicCacheHeaders, RESPONSE_CACHE } from "@/lib/httpCache";

const CACHE_KEY_ACTIVE_THEME = 'db:themes:active';

// GET /api/themes/active - Get the currently active theme
export async function GET() {
    try {
        const { value: activeThemePayload, meta } = await cache.getOrSetWithMeta(
            CACHE_KEY_ACTIVE_THEME,
            async () => {
                await dbConnect();

                let config = await Config.findOne({}).lean();

                if (!config) {
                    const createdConfig = await Config.create({
                        activeTheme: 'vs-code-dark',
                        activeThemeVariant: 'dark',
                        allowThemeSwitching: true,
                    });
                    config = createdConfig.toObject();
                }

                const activeThemeSlug = config.activeTheme || 'vs-code-dark';
                const activeVariant = config.activeThemeVariant || 'dark';

                let themeData;
                if (isPredefinedTheme(activeThemeSlug)) {
                    themeData = getTheme(activeThemeSlug);
                } else {
                    themeData = await Theme.findOne({ slug: activeThemeSlug }).lean();
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

        await dbConnect();
        const body = await request.json();
        const { themeSlug, variant, perPageThemes } = body;

        // Get or create config
        let config = await Config.findOne({});
        if (!config) {
            config = new Config({});
        }

        // Handle standard theme update
        if (themeSlug) {
            // Verify the theme exists
            let themeExists = false;
            if (isPredefinedTheme(themeSlug)) {
                themeExists = true;
            } else {
                const customTheme = await Theme.findOne({ slug: themeSlug }).select('_id').lean();
                themeExists = !!customTheme;
            }

            if (!themeExists) {
                return NextResponse.json(
                    { success: false, error: "Theme not found" },
                    { status: 404 }
                );
            }
            config.activeTheme = themeSlug;
        }

        if (variant) {
            if (!['light', 'dark'].includes(variant)) {
                return NextResponse.json(
                    { success: false, error: "variant must be 'light' or 'dark'" },
                    { status: 400 }
                );
            }
            config.activeThemeVariant = variant;
        }

        // Handle per-page theme update
        if (perPageThemes) {
            if (!config.perPageThemes) {
                config.perPageThemes = { enabled: false, pages: {} };
            }
            // Ensure it's treated as a Mongoose object if needed, but simple assignment of properties works
            // if we mark it modified.

            if (typeof perPageThemes.enabled === 'boolean') {
                config.perPageThemes.enabled = perPageThemes.enabled;
            }
            if (perPageThemes.pages) {
                config.perPageThemes.pages = perPageThemes.pages;
            }
            config.markModified('perPageThemes');
        }

        await config.save();
        await cache.invalidatePrefixAsync('db:themes');
        await cache.invalidatePrefixAsync('db:config');

        return NextResponse.json({
            success: true,
            message: "Active theme updated successfully",
            data: {
                activeTheme: config.activeTheme,
                activeThemeVariant: config.activeThemeVariant,
                perPageThemes: config.perPageThemes
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
