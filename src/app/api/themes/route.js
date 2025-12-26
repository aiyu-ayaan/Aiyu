import dbConnect from "@/lib/db";
import Theme from "@/models/Theme";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import { themePresets, isPredefinedTheme } from "@/lib/themePresets";

// GET /api/themes - Fetch all themes (predefined + custom)
export async function GET() {
    try {
        await dbConnect();

        // Get custom themes from database
        const customThemes = await Theme.find({}).sort({ createdAt: -1 });

        // Convert predefined themes to array format
        const predefinedThemes = Object.values(themePresets);

        // Combine both
        const allThemes = [...predefinedThemes, ...customThemes];

        return NextResponse.json({
            success: true,
            data: allThemes,
            count: {
                predefined: predefinedThemes.length,
                custom: customThemes.length,
                total: allThemes.length
            }
        });
    } catch (error) {
        console.error("Error fetching themes:", error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

// POST /api/themes - Create new custom theme
export async function POST(request) {
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
        const { name, description, variants } = body;

        // Validation
        if (!name || !variants || !variants.light || !variants.dark) {
            return NextResponse.json(
                { success: false, error: "Name and both light/dark variants are required" },
                { status: 400 }
            );
        }

        // Check if slug would conflict with predefined theme
        const slug = name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');

        if (isPredefinedTheme(slug)) {
            return NextResponse.json(
                { success: false, error: "Theme name conflicts with a predefined theme" },
                { status: 400 }
            );
        }

        // Check if custom theme with this slug already exists
        const existing = await Theme.findOne({ slug });
        if (existing) {
            return NextResponse.json(
                { success: false, error: "A theme with this name already exists" },
                { status: 400 }
            );
        }

        // Create new theme
        const theme = await Theme.create({
            name,
            description: description || '',
            slug,
            isCustom: true,
            isPredefined: false,
            variants
        });

        return NextResponse.json(
            { success: true, data: theme },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error creating theme:", error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
