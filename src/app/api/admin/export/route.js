import dbConnect from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import About from "@/models/About";
import Blog from "@/models/Blog";
import Config from "@/models/Config";
import Gallery from "@/models/Gallery";
import Header from "@/models/Header";
import Home from "@/models/Home";
import Project from "@/models/Project";
import Social from "@/models/Social";

export async function GET(request) {
    try {
        await dbConnect();
        const session = await getSession();

        if (!session) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const data = {
            about: await About.find({}),
            blogs: await Blog.find({}),
            config: await Config.find({}),
            gallery: await Gallery.find({}),
            header: await Header.find({}),
            home: await Home.find({}),
            projects: await Project.find({}),
            socials: await Social.find({}),
            exportedAt: new Date().toISOString(),
        };

        return NextResponse.json(data);
    } catch (error) {
        console.error("Export error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
