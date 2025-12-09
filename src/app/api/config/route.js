import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Config from '@/models/Config';
import { getSession } from '@/lib/auth';

export async function GET() {
    await dbConnect();
    try {
        let config = await Config.findOne();
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
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    try {
        const body = await request.json();
        const config = await Config.findOneAndUpdate({}, body, {
            new: true,
            upsert: true,
            runValidators: true,
        });
        return NextResponse.json(config);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
    }
}
