import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import About from '@/models/About';
import { getSession } from '@/lib/auth';

export async function GET() {
    await dbConnect();
    try {
        const about = await About.findOne();
        return NextResponse.json(about);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch about data' }, { status: 500 });
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
        const about = await About.findOneAndUpdate({}, body, {
            new: true,
            upsert: true,
            runValidators: true,
        });
        return NextResponse.json(about);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update about data' }, { status: 500 });
    }
}
