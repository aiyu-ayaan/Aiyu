import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Project from '@/models/Project';
import { getSession } from '@/lib/auth';
import cache, { CACHE_KEYS, CACHE_TTL } from '@/lib/cache';
import { createPublicCacheHeaders, RESPONSE_CACHE } from '@/lib/httpCache';

export async function GET() {
    await dbConnect();
    try {
        const projects = await cache.getOrSet(
            CACHE_KEYS.PROJECTS,
            () => Project.find({}).sort({ year: -1 }).lean(),
            CACHE_TTL.MEDIUM
        );

        return NextResponse.json(projects, {
            headers: createPublicCacheHeaders(RESPONSE_CACHE.PUBLIC_MEDIUM),
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
        const project = await Project.create(body);
        cache.invalidate(CACHE_KEYS.PROJECTS);
        cache.invalidatePrefix('db:projects');
        return NextResponse.json(project, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
    }
}
