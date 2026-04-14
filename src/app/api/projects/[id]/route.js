import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Project from '@/models/Project';
import { getSession } from '@/lib/auth';
import cache, { CACHE_KEYS, CACHE_TTL, createCacheDebugHeaders } from '@/lib/cache';
import { createPublicCacheHeaders, RESPONSE_CACHE } from '@/lib/httpCache';

export async function PUT(request, { params }) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    try {
        const { id } = await params;
        const body = await request.json();
        const project = await Project.findByIdAndUpdate(id, body, {
            new: true,
            runValidators: true,
        });
        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }
        await cache.invalidatePrefixAsync('db:projects');
        return NextResponse.json(project);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    try {
        const { id } = await params;
        const project = await Project.findByIdAndDelete(id);
        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }
        await cache.invalidatePrefixAsync('db:projects');
        return NextResponse.json({ message: 'Project deleted successfully' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
    }
}

export async function GET(request, { params }) {
    try {
        const { id } = await params;
        const { value: project, meta } = await cache.getOrSetWithMeta(
            `db:projects:item:${id}`,
            async () => {
                await dbConnect();
                return Project.findById(id).lean();
            },
            CACHE_TTL.MEDIUM
        );

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        return NextResponse.json(project, {
            headers: {
                ...createPublicCacheHeaders(RESPONSE_CACHE.PUBLIC_MEDIUM),
                ...createCacheDebugHeaders(meta),
            },
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
    }
}
