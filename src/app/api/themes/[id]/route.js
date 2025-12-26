import dbConnect from "@/lib/db";
import Theme from "@/models/Theme";
import Config from "@/models/Config";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import { isPredefinedTheme, getTheme } from "@/lib/themePresets";

// GET /api/themes/[id] - Get specific theme
export async function GET(request, { params }) {
    try {
        await dbConnect();
        const { id } = await params;

        // Check if it's a predefined theme
        if (isPredefinedTheme(id)) {
            const theme = getTheme(id);
            return NextResponse.json({ success: true, data: theme });
        }

        // Otherwise, look in database
        const theme = await Theme.findOne({ $or: [{ slug: id }, { _id: id }] });

        if (!theme) {
            return NextResponse.json(
                { success: false, error: "Theme not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: theme });
    } catch (error) {
        console.error("Error fetching theme:", error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

// PUT /api/themes/[id] - Update custom theme
export async function PUT(request, { params }) {
    try {
        await dbConnect();
        const session = await getSession();

        if (!session) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { id } = await params;

        // Cannot update predefined themes
        if (isPredefinedTheme(id)) {
            return NextResponse.json(
                { success: false, error: "Cannot modify predefined themes" },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { name, description, variants } = body;

        // Find the theme
        const theme = await Theme.findOne({ $or: [{ slug: id }, { _id: id }] });

        if (!theme) {
            return NextResponse.json(
                { success: false, error: "Theme not found" },
                { status: 404 }
            );
        }

        // Update fields
        if (name) theme.name = name;
        if (description !== undefined) theme.description = description;
        if (variants) theme.variants = variants;

        await theme.save();

        return NextResponse.json({ success: true, data: theme });
    } catch (error) {
        console.error("Error updating theme:", error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

// DELETE /api/themes/[id] - Delete custom theme
export async function DELETE(request, { params }) {
    try {
        await dbConnect();
        const session = await getSession();

        if (!session) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { id } = await params;

        // Cannot delete predefined themes
        if (isPredefinedTheme(id)) {
            return NextResponse.json(
                { success: false, error: "Cannot delete predefined themes" },
                { status: 403 }
            );
        }

        // Check if this is the active theme
        const config = await Config.findOne({});
        if (config && config.activeTheme === id) {
            return NextResponse.json(
                { success: false, error: "Cannot delete the active theme. Please activate another theme first." },
                { status: 400 }
            );
        }

        // Find and delete the theme
        const theme = await Theme.findOneAndDelete({ $or: [{ slug: id }, { _id: id }] });

        if (!theme) {
            return NextResponse.json(
                { success: false, error: "Theme not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Theme deleted successfully",
            data: theme
        });
    } catch (error) {
        console.error("Error deleting theme:", error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
