
import dbConnect from "@/lib/db";
import Blog from "@/models/Blog";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET(request) {
    await dbConnect();
    const session = await getSession();
    const { searchParams } = new URL(request.url);
    const showAll = searchParams.get('all');

    try {
        let query = {};
        // Only show drafts if 'all' param is requested AND user is admin
        if (session && showAll === 'true') {
            query = {};
        } else {
            query = { published: { $ne: false } };
        }

        const blogs = await Blog.find(query).sort({ createdAt: -1 });
        return NextResponse.json({ success: true, data: blogs });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}



export async function POST(request) {
    await dbConnect();

    // Security Check
    // 1. Check for API Key (External tools like n8n)
    const apiKey = request.headers.get('x-api-key');
    const validApiKey = process.env.BLOG_API_KEY || process.env.JWT_SECRET;

    const isApiKeyValid = apiKey && validApiKey && apiKey === validApiKey;

    // 2. Check for Session (Admin Panel)
    const session = await getSession();
    const isSessionValid = !!session;

    if (!isApiKeyValid && !isSessionValid) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        console.log('POST /api/blogs - Body:', body);

        // Default date to now if not provided
        if (!body.date) {
            const now = new Date();
            body.date = now.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }

        // Validate basic fields
        if (!body.title || !body.content) {
            return NextResponse.json({ success: false, error: 'Title and content are required' }, { status: 400 });
        }

        // Use provided published status or default to false (Draft)
        const blogData = {
            ...body,
            published: body.published !== undefined ? body.published : false
        };

        const blog = await Blog.create(blogData);
        console.log('POST /api/blogs - Created:', blog);
        return NextResponse.json({ success: true, data: blog }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
