import GitHubStatsClient from '@/app/components/github/GitHubStatsClient';
import dbConnect from '@/lib/db';
import ConfigModel from '@/models/Config';

export const dynamic = 'force-dynamic';
export const revalidate = 300; // Revalidate every 5 minutes

async function getGitHubStats() {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/github/stats`, {
            cache: 'no-store'
        });

        const data = await res.json();
        return data;
    } catch (error) {
        console.error('Failed to fetch GitHub stats:', error);
        return { success: false, error: 'Failed to load stats' };
    }
}

export async function generateMetadata() {
    await dbConnect();
    const config = await ConfigModel.findOne().lean();
    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';

    return {
        title: `${baseName} | GitHub`,
        description: 'Check out my open source contributions, repositories, and GitHub statistics.',
    };
}

export default async function GitHubPage() {
    const result = await getGitHubStats();

    return <GitHubStatsClient data={result} />;
}
