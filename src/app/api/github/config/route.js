import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import GitHub from '@/models/GitHub';
import { withAuth } from '@/middleware/auth';

// GET: Fetch GitHub configuration or full repo list
async function getConfig(request) {
    try {
        await dbConnect();

        // check for mode=repos
        const { searchParams } = new URL(request.url);
        const mode = searchParams.get('mode');

        let config = await GitHub.findOne().lean();

        // Create default if doesn't exist
        if (!config) {
            config = await GitHub.create({ username: '', enabled: false });
        }

        // Check GITHUB_TOKEN status
        const rawToken = process.env.GITHUB_TOKEN;
        const token = rawToken ? rawToken.trim() : '';

        // If 'repos' mode is requested, fetch full list of repos (proxied to use token)
        if (mode === 'repos' && config.username) {
            try {
                const headers = {
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Portfolio-App'
                };
                if (token) {
                    headers['Authorization'] = `token ${token}`;
                }

                let repos = [];
                let fetchSuccess = false;

                // Determine if we should include private repos (query param overrides DB)
                const includePrivateParam = searchParams.get('includePrivate');
                const shouldIncludePrivate = includePrivateParam !== null
                    ? includePrivateParam === 'true'
                    : config.includePrivate;

                // Attempt to fetch all repos (including private) if enabled
                if (shouldIncludePrivate && token) {
                    try {
                        const identityRes = await fetch('https://api.github.com/user', { headers });
                        if (identityRes.ok) {
                            const identity = await identityRes.json();
                            if (identity.login.toLowerCase() === config.username.toLowerCase()) {
                                const privateRes = await fetch(`https://api.github.com/user/repos?per_page=100&sort=updated&type=all`, { headers });
                                if (privateRes.ok) {
                                    repos = await privateRes.json();
                                    fetchSuccess = true;
                                }
                            }
                        }
                    } catch (e) { console.error("Private fetch failed", e); }
                }

                // Fallback to public only
                if (!fetchSuccess) {
                    let publicRes = await fetch(`https://api.github.com/users/${config.username}/repos?per_page=100&sort=updated&type=public`, { headers });

                    // If token is invalid (401), retry without it
                    if (publicRes.status === 401 && headers['Authorization']) {
                        console.warn('Public repo fetch failed with token (401), retrying without token...');
                        const noTokenHeaders = { ...headers };
                        delete noTokenHeaders['Authorization'];
                        publicRes = await fetch(`https://api.github.com/users/${config.username}/repos?per_page=100&sort=updated&type=public`, { headers: noTokenHeaders });
                    }

                    if (publicRes.ok) {
                        repos = await publicRes.json();
                        fetchSuccess = true;
                    }
                }

                if (fetchSuccess) {
                    // Sort: Private first, then by name
                    const sorted = repos.sort((a, b) => {
                        if (a.private === b.private) return 0;
                        return a.private ? -1 : 1;
                    }).map(r => r.name);

                    return NextResponse.json({
                        success: true,
                        data: sorted
                    });
                }
            } catch (e) {
                console.error("Repo list fetch failed:", e);
            }
        }

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
            if (body.includePrivate !== undefined) config.includePrivate = body.includePrivate;
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
