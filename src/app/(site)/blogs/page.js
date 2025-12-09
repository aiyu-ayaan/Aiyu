
import React from 'react';
import BlogList from '../../components/blogs/BlogList';

import dbConnect from '../../../lib/db';
import Config from '../../../models/Config';

async function getConfig() {
    try {
        await dbConnect();
        let config = await Config.findOne().lean();
        if (!config) return null;
        return config;
    } catch (error) {
        console.error('Failed to fetch config:', error);
        return null;
    }
}

export async function generateMetadata() {
    const config = await getConfig();
    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';

    return {
        title: `${baseName} | Blogs`,
        description: 'Read my latest blogs and articles on web development and technology.',
    };
}

export default function BlogsPage() {
    return (
        <div className="min-h-screen pt-20" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <BlogList />
        </div>
    );
}
