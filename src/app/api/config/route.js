import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Config from '@/models/Config';
import { getSession } from '@/lib/auth';
import cache, { CACHE_KEYS } from '@/lib/cache';

export async function GET() {
    await dbConnect();
    try {
        let config = await Config.findOne().lean();
        if (!config) {
            // Create default if not exists
            config = await Config.create({});
        }
        return NextResponse.json(config);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
    }
}

export async function PUT(request) {
    return updateConfig(request);
}

export async function POST(request) {
    return updateConfig(request);
}

async function updateConfig(request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    try {
        const body = await request.json();
        // Use $set to ensure partial updates don't overwrite other fields
        // This is critical since different admin pages update different parts of the config
        const config = await Config.findOneAndUpdate({}, { $set: body }, {
            new: true,
            upsert: true,
            runValidators: true,
        });
        cache.invalidate(CACHE_KEYS.CONFIG);
        return NextResponse.json(config);
    } catch (error) {
        console.error('Config update error:', error);
        return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
    }
}
