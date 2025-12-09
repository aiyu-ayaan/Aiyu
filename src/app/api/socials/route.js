import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Social from '@/models/Social';
import { getSession } from '@/lib/auth';

export async function GET() {
    await dbConnect();
    try {
        const socials = await Social.find({});
        return NextResponse.json(socials);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch socials' }, { status: 500 });
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
        const social = await Social.create(body);
        return NextResponse.json(social, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create social link' }, { status: 500 });
    }
}
