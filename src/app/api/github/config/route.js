import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSingleton, upsertSingleton } from '@/lib/serialize';
import { withAuth } from '@/middleware/auth';
import { encrypt, decrypt } from '@/lib/encryption';
import cache from '@/lib/cache';

// Helper to get token
async function getDecryptedToken() {
    const config = await getSingleton(prisma, 'config', { withSecrets: true });
    if (config?.encryptedGithubToken) {
        return decrypt(config.encryptedGithubToken);
    }
    return process.env.GITHUB_TOKEN; // Fallback to env if not in DB
}

// GET: Fetch GitHub configuration or full repo list
async function getConfig(request) {
    try {
        // check for mode=repos
        const { searchParams } = new URL(request.url);
        const mode = searchParams.get('mode');

        let config = await getSingleton(prisma, 'github');

        // Create default if doesn't exist
        if (!config) {
            config = await upsertSingleton(prisma, 'github', { username: '', enabled: false });
        }

        // Get token from DB (encrypted) or Env
        const token = await getDecryptedToken();
        const hasToken = !!token;

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
                    console.error('[Debug] Token verify failed:', verifyRes.status);
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
                tokenStatus,
                hasToken // Tell frontend we have a token (without sending it)
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
        const body = await request.json();
        const { username, enabled, sections } = body;

        // Validate
        if (username !== undefined && typeof username !== 'string') {
            return NextResponse.json({
                success: false,
                error: 'Invalid username'
            }, { status: 400 });
        }

        const existing = await getSingleton(prisma, 'github');
        const patch = {};

        if (username !== undefined) patch.username = username;
        if (body.includePrivate !== undefined) patch.includePrivate = body.includePrivate;
        if (sections !== undefined) {
            patch.sections = { ...(existing?.sections || {}), ...sections };
        }
        if (body.hiddenRepos !== undefined) {
            patch.hiddenRepos = body.hiddenRepos;
        }
        // Match the create-time default: enabled defaults to true on first save.
        if (enabled !== undefined) {
            patch.enabled = enabled;
        } else if (!existing) {
            patch.enabled = true;
        }

        if (body.githubToken !== undefined) {
            // Update token in Config (stored encrypted in a dedicated secret column)
            const encryptedToken = body.githubToken ? encrypt(body.githubToken) : '';
            await upsertSingleton(prisma, 'config', { encryptedGithubToken: encryptedToken });
            await cache.invalidatePrefixAsync('db:github');
            await cache.invalidatePrefixAsync('db:config');
        }

        const config = await upsertSingleton(prisma, 'github', patch);
        await cache.invalidatePrefixAsync('db:github');

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
