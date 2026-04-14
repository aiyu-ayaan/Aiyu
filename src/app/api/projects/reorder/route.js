import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Project from '@/models/Project';
import { getSession } from '@/lib/auth';
import cache, { CACHE_KEYS } from '@/lib/cache';

export async function PATCH(request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    try {
        const body = await request.json();
        const orderedIds = Array.isArray(body?.orderedIds) ? body.orderedIds : [];

        if (orderedIds.length === 0) {
            return NextResponse.json({ error: 'orderedIds must be a non-empty array' }, { status: 400 });
        }

        const hasDuplicates = new Set(orderedIds).size !== orderedIds.length;
        if (hasDuplicates) {
            return NextResponse.json({ error: 'orderedIds must not contain duplicates' }, { status: 400 });
        }

        const hasInvalidId = orderedIds.some((id) => !mongoose.Types.ObjectId.isValid(id));
        if (hasInvalidId) {
            return NextResponse.json({ error: 'orderedIds contains invalid project id values' }, { status: 400 });
        }

        const existingProjectsCount = await Project.countDocuments({
            _id: { $in: orderedIds },
        });

        if (existingProjectsCount !== orderedIds.length) {
            return NextResponse.json({ error: 'One or more projects were not found' }, { status: 404 });
        }

        const bulkOperations = orderedIds.map((id, index) => ({
            updateOne: {
                filter: { _id: id },
                update: {
                    $set: { displayOrder: index },
                },
            },
        }));

        await Project.bulkWrite(bulkOperations);

        await cache.invalidatePrefixAsync('db:projects');

        return NextResponse.json({ message: 'Project order updated successfully' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to reorder projects' }, { status: 500 });
    }
}
