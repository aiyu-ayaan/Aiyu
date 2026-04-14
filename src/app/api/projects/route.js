import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Project from '@/models/Project';
import { getSession } from '@/lib/auth';
import cache, { CACHE_KEYS, CACHE_TTL, createCacheDebugHeaders } from '@/lib/cache';
import { createPublicCacheHeaders, RESPONSE_CACHE } from '@/lib/httpCache';

const extractSortYear = (yearValue) => {
    const matches = String(yearValue || '').match(/\d{4}/g);
    if (!matches || matches.length === 0) return 0;
    const finalYear = Number.parseInt(matches[matches.length - 1], 10);
    return Number.isNaN(finalYear) ? 0 : finalYear;
};

const getDisplayOrderValue = (project) => {
    const parsedOrder = Number.parseInt(project?.displayOrder, 10);
    return Number.isNaN(parsedOrder) ? Number.MAX_SAFE_INTEGER : parsedOrder;
};

const sortProjects = (projects = []) => {
    return [...projects].sort((a, b) => {
        const orderDifference = getDisplayOrderValue(a) - getDisplayOrderValue(b);
        if (orderDifference !== 0) return orderDifference;
        return extractSortYear(b?.year) - extractSortYear(a?.year);
    });
};

export async function GET() {
    try {
        const { value: projects, meta } = await cache.getOrSetWithMeta(
            CACHE_KEYS.PROJECTS,
            async () => {
                await dbConnect();
                const allProjects = await Project.find({}).lean();
                return sortProjects(allProjects);
            },
            CACHE_TTL.MEDIUM
        );

        return NextResponse.json(projects, {
            headers: {
                ...createPublicCacheHeaders(RESPONSE_CACHE.PUBLIC_MEDIUM),
                ...createCacheDebugHeaders(meta),
            },
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }
}

export async function POST(request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    try {
        const body = await request.json();
        const payload = { ...body };

        if (!Number.isFinite(payload.displayOrder)) {
            const maxOrderedProject = await Project.findOne({ displayOrder: { $type: 'number' } })
                .sort({ displayOrder: -1 })
                .select('displayOrder')
                .lean();

            payload.displayOrder = Number.isFinite(maxOrderedProject?.displayOrder)
                ? maxOrderedProject.displayOrder + 1
                : 0;
        }

        const project = await Project.create(payload);
        await cache.invalidatePrefixAsync('db:projects');
        return NextResponse.json(project, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
    }
}
