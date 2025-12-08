import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Header from '@/models/Header';
import { getSession } from '@/lib/auth';

export async function GET() {
    await dbConnect();
    try {
        const header = await Header.findOne();
        return NextResponse.json(header);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch header data' }, { status: 500 });
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
        const header = await Header.findOneAndUpdate({}, body, {
            new: true,
            upsert: true,
            runValidators: true,
        });
        return NextResponse.json(header);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update header data' }, { status: 500 });
    }
}
