
import dbConnect from "@/lib/db";
import Blog from "@/models/Blog";
import { NextResponse } from "next/server";

export async function GET() {
    await dbConnect();
    try {
        const blogs = await Blog.find({}).sort({ createdAt: -1 });
        return NextResponse.json({ success: true, data: blogs });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export async function POST(request) {
    await dbConnect();
    try {
        const body = await request.json();
        const blog = await Blog.create(body);
        return NextResponse.json({ success: true, data: blog }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
