import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Social from '@/models/Social';
import { getSession } from '@/lib/auth';

export async function PUT(request, { params }) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    try {
        const { id } = params;
        const body = await request.json();
        const social = await Social.findByIdAndUpdate(id, body, {
            new: true,
            runValidators: true,
        });
        if (!social) {
            return NextResponse.json({ error: 'Social link not found' }, { status: 404 });
        }
        return NextResponse.json(social);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update social link' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    try {
        const { id } = params;
        const social = await Social.findByIdAndDelete(id);
        if (!social) {
            return NextResponse.json({ error: 'Social link not found' }, { status: 404 });
        }
        return NextResponse.json({ message: 'Social link deleted successfully' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete social link' }, { status: 500 });
    }
}

export async function GET(request, { params }) {
    await dbConnect();
    try {
        const { id } = params;
        const social = await Social.findById(id);
        if (!social) {
            return NextResponse.json({ error: 'Social link not found' }, { status: 404 });
        }
        return NextResponse.json(social);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch social link' }, { status: 500 });
    }
}
