import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Project from '@/models/Project';
import { getSession } from '@/lib/auth';

export async function GET() {
    await dbConnect();
    try {
        const projects = await Project.find({}).sort({ year: -1 });
        return NextResponse.json(projects);
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
        return NextResponse.json(project, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
    }
}
