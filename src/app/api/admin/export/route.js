import dbConnect from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import About from "@/models/About";
import Blog from "@/models/Blog";
import Config from "@/models/Config";
import Header from "@/models/Header";
import Home from "@/models/Home";
import Project from "@/models/Project";
import Social from "@/models/Social";
import GitHub from "@/models/GitHub";
import ContactMessage from "@/models/ContactMessage";

export async function GET(request) {
    try {
        await dbConnect();
        const session = await getSession();

        if (!session) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const includeGithub = searchParams.get('includeGithub') === 'true';
        const includeContact = searchParams.get('includeContact') === 'true';

        const data = {
            about: await About.find({}),
            blogs: await Blog.find({}),
            config: await Config.find({}),
            header: await Header.find({}),
            home: await Home.find({}),
            projects: await Project.find({}),
            socials: await Social.find({}),
            exportedAt: new Date().toISOString(),
        };

        if (includeGithub) {
            data.github = await GitHub.find({});
        }

        if (includeContact) {
            data.contactMessages = await ContactMessage.find({});
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Export error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
