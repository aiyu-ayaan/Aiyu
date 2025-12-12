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

export async function POST(request) {
    try {
        await dbConnect();
        const session = await getSession();

        if (!session) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const data = await request.json();

        // Basic validation
        if (!data || typeof data !== 'object') {
            return NextResponse.json({ success: false, error: "Invalid data format" }, { status: 400 });
        }

        // List of models and their keys in the JSON
        const models = [
            { model: About, key: 'about' },
            { model: Blog, key: 'blogs' },
            { model: Config, key: 'config' },
            { model: Header, key: 'header' },
            { model: Home, key: 'home' },
            { model: Project, key: 'projects' },
            { model: Social, key: 'socials' },
        ];

        // Process import in transaction or just sequentially
        // For simplicity in this context, we'll do cleared -> insert
        // Note: MongoDB transactions require replica set. If standalone, we can't use transactions.
        // We'll proceed with sequential delete/insert for now.

        const results = {};

        for (const { model, key } of models) {
            if (data[key] && Array.isArray(data[key])) {
                await model.deleteMany({}); // Clear existing
                if (data[key].length > 0) {
                    await model.insertMany(data[key]); // Insert new
                }
                results[key] = { count: data[key].length, status: 'imported' };
            } else {
                results[key] = { status: 'skipped', reason: 'missing_or_invalid' };
            }
        }

        return NextResponse.json({ success: true, results });
    } catch (error) {
        console.error("Import error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
