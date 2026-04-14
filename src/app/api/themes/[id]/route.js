import dbConnect from "@/lib/db";
import Theme from "@/models/Theme";
import Config from "@/models/Config";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { isPredefinedTheme, getTheme } from "@/lib/themePresets";
import cache, { CACHE_TTL, createCacheDebugHeaders } from "@/lib/cache";
import { createPublicCacheHeaders, RESPONSE_CACHE } from "@/lib/httpCache";

const CACHE_KEY_THEME_DETAIL_PREFIX = 'db:theme:detail:';

// GET /api/themes/[id] - Get specific theme
export async function GET(_request, { params }) {
    try {
        const { id } = await params;
        const cacheKey = `${CACHE_KEY_THEME_DETAIL_PREFIX}${id}`;

        // Check if it's a predefined theme
        if (isPredefinedTheme(id)) {
            const theme = getTheme(id);
            return NextResponse.json({ success: true, data: theme }, {
                headers: createPublicCacheHeaders(RESPONSE_CACHE.PUBLIC_MEDIUM),
            });
        }

        const { value: theme, meta } = await cache.getOrSetWithMeta(
            cacheKey,
            async () => {
                await dbConnect();
                const query = mongoose.Types.ObjectId.isValid(id)
                    ? { $or: [{ slug: id }, { _id: id }] }
                    : { slug: id };
                return Theme.findOne(query).lean();
            },
            CACHE_TTL.MEDIUM
        );

        if (!theme) {
            return NextResponse.json(
                { success: false, error: "Theme not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: theme }, {
            headers: {
                ...createPublicCacheHeaders(RESPONSE_CACHE.PUBLIC_MEDIUM),
                ...createCacheDebugHeaders(meta),
            },
        });
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
        const session = await getSession();

        if (!session) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        await dbConnect();
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
        const query = mongoose.Types.ObjectId.isValid(id)
            ? { $or: [{ slug: id }, { _id: id }] }
            : { slug: id };
        const theme = await Theme.findOne(query);

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
        await cache.invalidatePrefixAsync('db:themes');
        await cache.invalidatePrefixAsync(CACHE_KEY_THEME_DETAIL_PREFIX);
        await cache.invalidatePrefixAsync('db:config');

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
export async function DELETE(_request, { params }) {
    try {
        const session = await getSession();

        if (!session) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        await dbConnect();
        const { id } = await params;

        // Cannot delete predefined themes
        if (isPredefinedTheme(id)) {
            return NextResponse.json(
                { success: false, error: "Cannot delete predefined themes" },
                { status: 403 }
            );
        }

        // Check if this is the active theme
        const config = await Config.findOne({}).select('activeTheme').lean();
        if (config && config.activeTheme === id) {
            return NextResponse.json(
                { success: false, error: "Cannot delete the active theme. Please activate another theme first." },
                { status: 400 }
            );
        }

        // Find and delete the theme
        const query = mongoose.Types.ObjectId.isValid(id)
            ? { $or: [{ slug: id }, { _id: id }] }
            : { slug: id };
        const theme = await Theme.findOneAndDelete(query);

        if (!theme) {
            return NextResponse.json(
                { success: false, error: "Theme not found" },
                { status: 404 }
            );
        }

        await cache.invalidatePrefixAsync('db:themes');
        await cache.invalidatePrefixAsync(CACHE_KEY_THEME_DETAIL_PREFIX);
        await cache.invalidatePrefixAsync('db:config');

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
