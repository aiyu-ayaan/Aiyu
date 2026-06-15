import { prisma } from "@/lib/prisma";
import { getSingleton, toClient } from "@/lib/serialize";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import { isPredefinedTheme, getTheme } from "@/lib/themePresets";
import cache, { CACHE_TTL, createCacheDebugHeaders } from "@/lib/cache";
import { createPublicCacheHeaders, RESPONSE_CACHE } from "@/lib/httpCache";

const CACHE_KEY_THEME_DETAIL_PREFIX = 'db:theme:detail:';

// Match a custom theme by either its slug or its id.
function themeByIdentifier(id) {
    return prisma.theme.findFirst({ where: { OR: [{ slug: id }, { id }] } });
}

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
                return toClient('theme', await themeByIdentifier(id));
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

        const existing = await themeByIdentifier(id);
        if (!existing) {
            return NextResponse.json(
                { success: false, error: "Theme not found" },
                { status: 404 }
            );
        }

        const data = {};
        if (name) data.name = name;
        if (description !== undefined) data.description = description;
        if (variants) data.variants = variants;

        const theme = await prisma.theme.update({ where: { id: existing.id }, data });
        await cache.invalidatePrefixAsync('db:themes');
        await cache.invalidatePrefixAsync(CACHE_KEY_THEME_DETAIL_PREFIX);
        await cache.invalidatePrefixAsync('db:config');

        return NextResponse.json({ success: true, data: toClient('theme', theme) });
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

        const { id } = await params;

        // Cannot delete predefined themes
        if (isPredefinedTheme(id)) {
            return NextResponse.json(
                { success: false, error: "Cannot delete predefined themes" },
                { status: 403 }
            );
        }

        // Check if this is the active theme
        const config = await getSingleton(prisma, 'config');
        if (config && config.activeTheme === id) {
            return NextResponse.json(
                { success: false, error: "Cannot delete the active theme. Please activate another theme first." },
                { status: 400 }
            );
        }

        const existing = await themeByIdentifier(id);
        if (!existing) {
            return NextResponse.json(
                { success: false, error: "Theme not found" },
                { status: 404 }
            );
        }

        const theme = await prisma.theme.delete({ where: { id: existing.id } });

        await cache.invalidatePrefixAsync('db:themes');
        await cache.invalidatePrefixAsync(CACHE_KEY_THEME_DETAIL_PREFIX);
        await cache.invalidatePrefixAsync('db:config');

        return NextResponse.json({
            success: true,
            message: "Theme deleted successfully",
            data: toClient('theme', theme)
        });
    } catch (error) {
        console.error("Error deleting theme:", error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
