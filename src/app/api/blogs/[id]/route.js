
import dbConnect from "@/lib/db";
import Blog from "@/models/Blog";
import { NextResponse } from "next/server";
import cache from '@/lib/cache';
import { createUniqueBlogSlug, resolveBlogByIdentifier } from '@/lib/blogSlugs';

export async function GET(request, { params }) {
    await dbConnect();
    const { id } = await params;
    try {
        const blog = await resolveBlogByIdentifier(Blog, id);
        if (!blog) {
            return NextResponse.json({ success: false, error: "Blog not found" }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: blog });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export async function PUT(request, { params }) {
    await dbConnect();
    const { id } = await params;
    try {
        const body = await request.json();
        console.log('PUT /api/blogs/[id] - Body:', body);

        const existingBlog = await Blog.findById(id).select('_id title slug').lean();
        if (!existingBlog) {
            return NextResponse.json({ success: false, error: "Blog not found" }, { status: 404 });
        }

        const nextTitle = typeof body?.title === 'string' && body.title.trim() ? body.title : existingBlog.title;
        const nextSlug = body?.title || !existingBlog.slug
            ? await createUniqueBlogSlug(Blog, nextTitle, existingBlog._id, existingBlog._id)
            : existingBlog.slug;

        const blog = await Blog.findByIdAndUpdate(id, { ...body, slug: nextSlug }, {
            new: true,
            runValidators: true,
            strict: false,
        });

        console.log('PUT /api/blogs/[id] - Updated Blog:', blog);
        // Cache invalidation removed - always fetches fresh data
        return NextResponse.json({ success: true, data: blog });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export async function DELETE(request, { params }) {
    await dbConnect();
    const { id } = await params;
    try {
        const blog = await Blog.findByIdAndDelete(id);
        if (!blog) {
            return NextResponse.json({ success: false, error: "Blog not found" }, { status: 404 });
        }
        // Cache invalidation removed - always fetches fresh data
        return NextResponse.json({ success: true, data: {} });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
