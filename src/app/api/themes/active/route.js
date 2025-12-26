import dbConnect from "@/lib/db";
import Config from "@/models/Config";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import { isPredefinedTheme, getTheme } from "@/lib/themePresets";
import Theme from "@/models/Theme";

// GET /api/themes/active - Get the currently active theme
export async function GET() {
    try {
        await dbConnect();

        // Get config
        let config = await Config.findOne({});

        if (!config) {
            // Create default config if none exists
            config = await Config.create({
                activeTheme: 'vs-code-dark',
                activeThemeVariant: 'dark',
                allowThemeSwitching: true
            });
        }

        const activeThemeSlug = config.activeTheme || 'vs-code-dark';
        const activeVariant = config.activeThemeVariant || 'dark';

        // Get the theme data
        let themeData;
        if (isPredefinedTheme(activeThemeSlug)) {
            themeData = getTheme(activeThemeSlug);
        } else {
            themeData = await Theme.findOne({ slug: activeThemeSlug });
        }

        if (!themeData) {
            // Fallback to default theme if active theme not found
            themeData = getTheme('vs-code-dark');
        }

        return NextResponse.json({
            success: true,
            data: {
                theme: themeData,
                activeVariant,
                allowThemeSwitching: config.allowThemeSwitching
            }
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
        await dbConnect();
        const session = await getSession();

        if (!session) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { themeSlug, variant } = body;

        if (!themeSlug) {
            return NextResponse.json(
                { success: false, error: "themeSlug is required" },
                { status: 400 }
            );
        }

        // Validate variant if provided
        if (variant && !['light', 'dark'].includes(variant)) {
            return NextResponse.json(
                { success: false, error: "variant must be 'light' or 'dark'" },
                { status: 400 }
            );
        }

        // Verify the theme exists
        let themeExists = false;
        if (isPredefinedTheme(themeSlug)) {
            themeExists = true;
        } else {
            const customTheme = await Theme.findOne({ slug: themeSlug });
            themeExists = !!customTheme;
        }

        if (!themeExists) {
            return NextResponse.json(
                { success: false, error: "Theme not found" },
                { status: 404 }
            );
        }

        // Get or create config
        let config = await Config.findOne({});
        if (!config) {
            config = new Config({});
        }

        // Update active theme
        config.activeTheme = themeSlug;
        if (variant) {
            config.activeThemeVariant = variant;
        }

        await config.save();

        return NextResponse.json({
            success: true,
            message: "Active theme updated successfully",
            data: {
                activeTheme: config.activeTheme,
                activeThemeVariant: config.activeThemeVariant
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
