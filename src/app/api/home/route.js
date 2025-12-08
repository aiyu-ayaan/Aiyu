import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Home from '@/models/Home';
import { getSession } from '@/lib/auth';

export async function GET() {
    await dbConnect();
    try {
        const home = await Home.findOne();
        return NextResponse.json(home);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch home data' }, { status: 500 });
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
        const home = await Home.findOneAndUpdate({}, body, {
            new: true,
            upsert: true, // Create if doesn't exist
            runValidators: true,
        });
        return NextResponse.json(home);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update home data' }, { status: 500 });
    }
}
