import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import GitHub from '@/models/GitHub';
import { withAuth } from '@/middleware/auth';

// GET: Fetch GitHub configuration
async function getConfig(request) {
    try {
        await dbConnect();
        let config = await GitHub.findOne().lean();

        // Create default if doesn't exist
        if (!config) {
            config = await GitHub.create({ username: '', enabled: false });
        }

        // Check GITHUB_TOKEN status
        const rawToken = process.env.GITHUB_TOKEN;
        const token = rawToken ? rawToken.trim() : '';
        let tokenStatus = 'missing';

        console.log('[Debug] Token check:', {
            exists: !!token,
            length: token.length,
            prefix: token ? token.substring(0, 4) + '...' : 'none'
        });

        if (token) {
            try {
                const verifyRes = await fetch('https://api.github.com/user', {
                    headers: {
                        Authorization: `token ${token}`,
                        'User-Agent': 'Portfolio-App'
                    }
                });
                tokenStatus = verifyRes.ok ? 'valid' : 'invalid';

                if (!verifyRes.ok) {
                    console.error('[Debug] Token verify failed:', VerifyRes.status, await verifyRes.text());
                }
            } catch (error) {
                console.error('Token validation failed:', error);
                tokenStatus = 'unknown';
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                ...config,
                tokenStatus
            }
        });
    } catch (error) {
        console.error('[ERROR] Failed to fetch GitHub config:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to fetch configuration'
        }, { status: 500 });
    }
}

// PUT: Update GitHub configuration (Admin only)
async function updateConfig(request) {
    try {
        await dbConnect();
        const body = await request.json();
        const { username, enabled, sections } = body;

        console.log('[GitHub Config] Update request:', { username, enabled, sections });

        // Validate
        if (username !== undefined && typeof username !== 'string') {
            return NextResponse.json({
                success: false,
                error: 'Invalid username'
            }, { status: 400 });
        }

        // Find and update or create
        let config = await GitHub.findOne();

        if (!config) {
            config = new GitHub({
                username,
                enabled: enabled !== undefined ? enabled : true,
                sections: sections || {}
            });
        } else {
            if (username !== undefined) config.username = username;
            if (enabled !== undefined) config.enabled = enabled;
            if (sections !== undefined) {
                config.sections = { ...config.sections, ...sections };
                config.markModified('sections'); // Force Mongoose to detect change
            }
            if (body.hiddenRepos !== undefined) {
                config.hiddenRepos = body.hiddenRepos;
            }
        }

        await config.save();

        console.log('[GitHub Config] Updated successfully:', config);

        return NextResponse.json({
            success: true,
            data: config
        });
    } catch (error) {
        console.error('[ERROR] Failed to update GitHub config:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to update configuration'
        }, { status: 500 });
    }
}

export const GET = getConfig;
export const PUT = withAuth(updateConfig);
export const dynamic = 'force-dynamic';
