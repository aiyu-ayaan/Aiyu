"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaCopy, FaKey, FaMagnifyingGlass, FaRotate, FaTrashCan } from 'react-icons/fa6';
import { useAdminFeedback } from '@/app/components/admin/feedback/AdminFeedbackProvider';
import { Badge, EmptyState, Field, Loading, PageHeader, Panel } from '@/app/components/admin/ui';
import '@/app/styles/admin-system.css';

function ApiCodeBlock({ code, language = 'text' }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(String(code || ''));
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
        } catch (error) {
            console.error('Failed to copy code', error);
        }
    };

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
                <Badge>{language}</Badge>
                <button type="button" onClick={handleCopy} className="adm-btn adm-btn-quiet">
                    <FaCopy aria-hidden="true" /> {copied ? 'Copied' : 'Copy'}
                </button>
            </div>
            <pre className="adm-code whitespace-pre-wrap">{String(code || '')}</pre>
        </div>
    );
}

const sections = [
    { id: 'token', label: 'API token' },
    { id: 'codemode-tokens', label: 'Code Mode agent tokens' },
    { id: 'codemode-api', label: 'Code Mode API', method: 'POST', path: '/api/codemode/*' },
    { id: 'create-blog', label: 'Create blog post', method: 'POST', path: '/api/blogs' },
    { id: 'upload-image', label: 'Upload image', method: 'POST', path: '/api/admin/images/upload' },
    { id: 'system-prompt', label: 'System prompt', method: 'GET', path: '/api/admin/system-prompt' },
    { id: 'ai-hub-sections', label: 'AI hub sections', method: 'REST', path: '/api/ai/*' },
    { id: 'examples', label: 'Examples' },
    { id: 'notes', label: 'Notes' },
];

function getCodeModeTokenStatus(token, now = Date.now()) {
    if (token?.revokedAt) return 'revoked';
    if (token?.expiresAt) {
        const expiresAtMs = new Date(token.expiresAt).getTime();
        if (!Number.isNaN(expiresAtMs) && expiresAtMs <= now) return 'expired';
    }
    return 'active';
}

function formatTokenDate(value, fallback = '—') {
    if (!value) return fallback;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function CodeModeTokensPanel() {
    const { confirm } = useAdminFeedback();
    const [tokens, setTokens] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [actionError, setActionError] = useState('');
    const [name, setName] = useState('');
    const [nameError, setNameError] = useState('');
    const [scope, setScope] = useState('read');
    const [creating, setCreating] = useState(false);
    const [revokingId, setRevokingId] = useState(null);
    const [revealedToken, setRevealedToken] = useState(null);
    const [copiedToken, setCopiedToken] = useState(false);

    const fetchTokens = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
            const res = await fetch('/api/admin/codemode/tokens');
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success || !Array.isArray(data.tokens)) {
                throw new Error(data?.error || 'Failed to load Code Mode agent tokens.');
            }
            setTokens(data.tokens);
        } catch (error) {
            setLoadError(error?.message || 'Failed to load Code Mode agent tokens.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTokens();
    }, [fetchTokens]);

    const activeCount = useMemo(
        () => tokens.filter((token) => getCodeModeTokenStatus(token) === 'active').length,
        [tokens]
    );

    const handleCreate = async (event) => {
        event.preventDefault();
        const trimmedName = name.trim();
        if (!trimmedName) {
            setNameError('Enter a name for this agent token.');
            return;
        }
        setNameError('');
        setActionError('');
        setCreating(true);
        setCopiedToken(false);

        try {
            const res = await fetch('/api/admin/codemode/tokens', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: trimmedName, scope }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success || !data?.token) {
                throw new Error(data?.error || 'Failed to create agent token.');
            }

            setRevealedToken({
                id: data.item?.id ?? null,
                token: data.token,
                name: data.item?.name || trimmedName,
                scope: data.item?.scope || scope,
            });
            setName('');
            setScope('read');

            if (data.item) {
                setTokens((prev) => [data.item, ...prev.filter((item) => item.id !== data.item.id)]);
            } else {
                await fetchTokens();
            }
        } catch (error) {
            setActionError(error?.message || 'Failed to create agent token.');
        } finally {
            setCreating(false);
        }
    };

    const handleRevoke = async (token) => {
        const confirmed = await confirm({
            title: `Revoke "${token.name}"?`,
            message:
                'Any agent using this token will immediately lose access to POST /api/codemode/search and POST /api/codemode/execute.',
            confirmText: 'Revoke',
            danger: true,
        });
        if (!confirmed) return;

        setActionError('');
        setRevokingId(token.id);
        try {
            const res = await fetch(`/api/admin/codemode/tokens/${encodeURIComponent(token.id)}`, {
                method: 'DELETE',
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                throw new Error(data?.error || 'Failed to revoke agent token.');
            }

            const revokedAt = new Date().toISOString();
            setTokens((prev) =>
                prev.map((item) => (item.id === token.id ? { ...item, revokedAt } : item))
            );
            if (revealedToken?.id === token.id) {
                setRevealedToken(null);
            }
        } catch (error) {
            setActionError(error?.message || 'Failed to revoke agent token.');
        } finally {
            setRevokingId(null);
        }
    };

    const handleCopyRevealed = async () => {
        if (!revealedToken?.token) return;
        try {
            await navigator.clipboard.writeText(revealedToken.token);
            setCopiedToken(true);
            setTimeout(() => setCopiedToken(false), 1500);
        } catch (error) {
            console.error('Failed to copy agent token', error);
            setActionError('Could not copy to clipboard. Copy the token manually.');
        }
    };

    const renderStatusBadge = (status) => {
        if (status === 'active') return <Badge tone="ok">active</Badge>;
        if (status === 'expired') return <Badge tone="warn">expired</Badge>;
        return <Badge tone="error">revoked</Badge>;
    };

    const renderScopeBadge = (tokenScope) => (
        <Badge tone={tokenScope === 'write' ? 'warn' : 'info'}>{tokenScope}</Badge>
    );

    return (
        <Panel
            id="codemode-tokens"
            title="Code Mode agent tokens"
            className="scroll-mt-24"
            actions={
                !loading && !loadError ? (
                    <Badge tone={activeCount > 0 ? 'ok' : undefined}>
                        {activeCount} active
                    </Badge>
                ) : null
            }
        >
            <div className="space-y-5">
                <div className="space-y-3">
                    <p className="adm-help">
                        Issue short-lived bearer tokens for AI agents. Tokens expire automatically after{' '}
                        <strong className="text-[var(--text-primary)]">30 days</strong> and work{' '}
                        <strong className="text-[var(--text-primary)]">only</strong> on{' '}
                        <code className="adm-code">POST /api/codemode/search</code> and{' '}
                        <code className="adm-code">POST /api/codemode/execute</code> — they are rejected on
                        all other routes.
                    </p>

                    <div className="adm-notice adm-notice-warn space-y-1">
                        <p className="font-semibold text-[var(--text-bright)]">
                            Data sharing &amp; prompt-injection notice
                        </p>
                        <p className="text-xs leading-relaxed">
                            Agent tokens can read portfolio data including contact messages and visitor
                            analytics, which will be sent to your AI model provider. Because external
                            visitors write messages and referrer headers, untrusted content may contain
                            prompt injections — prefer <code className="adm-code">read</code> scope unless
                            write access is explicitly needed.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleCreate} className="space-y-4" noValidate>
                    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,15rem)]">
                        <Field
                            label="Token name"
                            help="A short label to identify which agent or workflow uses this token."
                            error={nameError || undefined}
                        >
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    if (nameError) setNameError('');
                                }}
                                placeholder="e.g. Claude agent, Weekly audit"
                                maxLength={80}
                                disabled={creating}
                                className="adm-input"
                            />
                        </Field>

                        <Field
                            label="Scope"
                            help="Default is read-only."
                        >
                            <select
                                value={scope}
                                onChange={(e) => setScope(e.target.value)}
                                disabled={creating}
                                className="adm-input"
                            >
                                <option value="read">read (recommended)</option>
                                <option value="write">write</option>
                            </select>
                        </Field>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="submit"
                            disabled={creating}
                            className="adm-btn adm-btn-primary"
                        >
                            {creating ? (
                                <FaRotate aria-hidden="true" className="animate-spin" />
                            ) : (
                                <FaKey aria-hidden="true" />
                            )}
                            {creating ? 'Creating token' : 'Create agent token'}
                        </button>
                    </div>
                </form>

                {actionError && (
                    <div role="alert" className="adm-notice adm-notice-error">
                        {actionError}
                    </div>
                )}

                {revealedToken && (
                    <div
                        role="status"
                        className="adm-notice adm-notice-warn space-y-2.5"
                    >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-semibold text-[var(--text-bright)]">
                                Copy this token now — shown once
                            </p>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-[var(--text-secondary)]">
                                    {revealedToken.name}
                                </span>
                                {renderScopeBadge(revealedToken.scope)}
                            </div>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)]">
                            Store it securely now. Once dismissed or reloaded, the full token cannot be
                            recovered.
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                            <code className="adm-code flex-1 break-all">{revealedToken.token}</code>
                            <button
                                type="button"
                                onClick={handleCopyRevealed}
                                className="adm-btn"
                            >
                                <FaCopy aria-hidden="true" />
                                {copiedToken ? 'Copied' : 'Copy token'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setRevealedToken(null)}
                                className="adm-btn adm-btn-quiet"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                )}

                {loading ? (
                    <Loading label="Loading Code Mode agent tokens" rows={3} className="!p-0" />
                ) : loadError ? (
                    <div
                        role="alert"
                        className="adm-notice adm-notice-error flex flex-wrap items-center justify-between gap-3"
                    >
                        <span>{loadError}</span>
                        <button type="button" onClick={fetchTokens} className="adm-btn">
                            <FaRotate aria-hidden="true" /> Retry
                        </button>
                    </div>
                ) : tokens.length === 0 ? (
                    <EmptyState
                        className="rounded-[10px] border border-[var(--hairline)] bg-[var(--bg-primary)]"
                        title="No Code Mode agent tokens yet"
                        description="Create a token above to allow an AI agent to call /api/codemode/search and /api/codemode/execute."
                    />
                ) : (
                    <>
                        <div className="hidden md:block adm-table-wrap rounded-[10px] border border-[var(--hairline)]">
                            <table className="adm-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Token</th>
                                        <th>Scope</th>
                                        <th>Created</th>
                                        <th>Expires</th>
                                        <th>Last used</th>
                                        <th>Status</th>
                                        <th className="text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tokens.map((token) => {
                                        const status = getCodeModeTokenStatus(token);
                                        const isActive = status === 'active';
                                        const isRevoking = revokingId === token.id;
                                        return (
                                            <tr key={token.id}>
                                                <td className="font-medium text-[var(--text-bright)]">
                                                    {token.name}
                                                </td>
                                                <td>
                                                    <code className="adm-code whitespace-nowrap">
                                                        aiyu_agent_…{token.lastFour || '****'}
                                                    </code>
                                                </td>
                                                <td>{renderScopeBadge(token.scope)}</td>
                                                <td className="text-xs text-[var(--text-secondary)] whitespace-nowrap">
                                                    {formatTokenDate(token.createdAt)}
                                                </td>
                                                <td className="text-xs text-[var(--text-secondary)] whitespace-nowrap">
                                                    {formatTokenDate(token.expiresAt)}
                                                </td>
                                                <td className="text-xs text-[var(--text-secondary)] whitespace-nowrap">
                                                    {formatTokenDate(token.lastUsedAt, 'Never')}
                                                </td>
                                                <td>{renderStatusBadge(status)}</td>
                                                <td className="text-right">
                                                    {isActive ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRevoke(token)}
                                                            disabled={isRevoking}
                                                            className="adm-btn adm-btn-danger"
                                                        >
                                                            <FaTrashCan aria-hidden="true" />
                                                            {isRevoking ? 'Revoking' : 'Revoke'}
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-[var(--adm-hint)]">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <ul className="adm-list md:hidden rounded-[10px] border border-[var(--hairline)] bg-[var(--bg-primary)]">
                            {tokens.map((token) => {
                                const status = getCodeModeTokenStatus(token);
                                const isActive = status === 'active';
                                const isRevoking = revokingId === token.id;
                                return (
                                    <li key={token.id} className="p-4 space-y-3">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div className="min-w-0 space-y-1">
                                                <p className="font-semibold text-[var(--text-bright)] break-words">
                                                    {token.name}
                                                </p>
                                                <code className="adm-code inline-block">
                                                    aiyu_agent_…{token.lastFour || '****'}
                                                </code>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {renderScopeBadge(token.scope)}
                                                {renderStatusBadge(status)}
                                            </div>
                                        </div>

                                        <dl className="adm-facts">
                                            <div>
                                                <dt>Created</dt>
                                                <dd>{formatTokenDate(token.createdAt)}</dd>
                                            </div>
                                            <div>
                                                <dt>Expires</dt>
                                                <dd>{formatTokenDate(token.expiresAt)}</dd>
                                            </div>
                                            <div>
                                                <dt>Last used</dt>
                                                <dd>{formatTokenDate(token.lastUsedAt, 'Never')}</dd>
                                            </div>
                                        </dl>

                                        {isActive && (
                                            <div className="pt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRevoke(token)}
                                                    disabled={isRevoking}
                                                    className="adm-btn adm-btn-danger w-full sm:w-auto"
                                                >
                                                    <FaTrashCan aria-hidden="true" />
                                                    {isRevoking ? 'Revoking' : 'Revoke'}
                                                </button>
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </>
                )}
            </div>
        </Panel>
    );
}

export default function AdminApiReferencePage() {
    const { confirm } = useAdminFeedback();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [revoking, setRevoking] = useState(false);
    const [tokenStatus, setTokenStatus] = useState({ hasToken: false, last4: '', createdAt: null });
    const [newToken, setNewToken] = useState('');
    const [copied, setCopied] = useState(false);
    const [activeSection, setActiveSection] = useState(sections[0].id);
    const [filterQuery, setFilterQuery] = useState('');

    const samplePayload = useMemo(
        () => ({
            title: 'How I Automated Blog Publishing',
            content: '## Intro\nThis post was created via API.',
            excerpt: 'A quick post generated from automation workflow.',
            tags: ['automation', 'api', 'blog'],
            keywords: ['automation', 'api blogging', 'workflow'],
            image: 'https://example.com/cover.jpg',
            imageAlt: 'Automation workflow diagram',
            socialTitle: 'API-Generated Blog Post',
            socialDescription: 'Create and publish blog posts from your own tools.',
            socialImage: 'https://example.com/social.jpg',
            socialImageAlt: 'Social preview image',
            published: true,
            date: 'April 18, 2026',
        }),
        []
    );
    const createBlogHeaders = `Authorization: Bearer <YOUR_BLOG_API_TOKEN>
Content-Type: application/json`;
    const uploadImageHeaders = `Content-Type: multipart/form-data
Authorization: Bearer <YOUR_BLOG_API_TOKEN>`;
    const uploadImageRequest = `file=@cover-image.jpg
name=blog-cover`;
    const uploadImageResponse = `{
  "success": true,
  "data": {
    "url": "/api/uploads/....webp",
    "thumbnailUrl": "/api/uploads/....-thumb.webp"
  }
}`;
    const systemPromptHeaders = `Authorization: Bearer <YOUR_BLOG_API_TOKEN>`;
    const systemPromptResponse = `You are an AI assistant representing <name>.

Your job is to answer using the latest website data from the portfolio database...

Identity
- Name: <name-from-db>
- Website: <site-title-from-db>
- Roles: <roles-from-db>

Website database context (JSON, indentation 2)
{
  "generatedAt": "...",
  "format": {
    "type": "json",
    "indentation": 2,
    "delimiter": ","
  },
  "websiteContext": { ... }
}`;
    const createBlogCurl = `curl -X POST "http://localhost:3000/api/blogs" \\
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(samplePayload)}'`;
    const uploadImageCurl = `curl -X POST "http://localhost:3000/api/admin/images/upload" \\
  -H "Cookie: token=<admin_session_token>" \\
  -F "file=@cover-image.jpg" \\
  -F "name=blog-cover"

# then use returned data.url in your /api/blogs request body`;
    const systemPromptCurl = `curl -X GET "http://localhost:3000/api/admin/system-prompt" \\
  -H "Cookie: token=<admin_session_token>"`;

    const codeModeHeaders = `Authorization: Bearer aiyu_agent_<YOUR_AGENT_TOKEN>
Content-Type: application/json`;
    const codeModeSearchCurl = `curl -X POST "http://localhost:3000/api/codemode/search" \\
  -H "Authorization: Bearer aiyu_agent_YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"code":"async () => Object.keys(codemode.spec().paths)"}'`;
    const codeModeExecuteJs = `async () => {
  const res = await codemode.request({
    method: "GET",
    path: "/api/blogs",
    query: { all: "true" },
  });
  return (res.data || [])
    .filter((post) => !post.published)
    .map((post) => ({ id: post.id, title: post.title }));
}`;
    const codeModeExecuteCurl = `curl -X POST "http://localhost:3000/api/codemode/execute" \\
  -H "Authorization: Bearer aiyu_agent_YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"code":"async () => (await codemode.request({ method: \\"GET\\", path: \\"/api/health\\" }))"}'`;

    // ── AI Hub · Sections ──
    const skillsShape = useMemo(
        () => ({
            categories: [
                {
                    id: 'cat_motion',
                    label: 'Motion & Animation',
                    accent: 'var(--accent-cyan)',
                    items: [
                        {
                            id: 'skill_gsap',
                            name: 'GSAP Core',
                            description:
                                'Framework-agnostic JavaScript animation — tweens, easing, stagger.',
                            url: 'https://gsap.com/docs/v3/',
                        },
                    ],
                },
            ],
        }),
        []
    );
    const aiSkillsGetCurl = `curl "http://localhost:3000/api/ai/skills"`;
    const createSkillCurl = `curl -X POST "http://localhost:3000/api/ai/skills/items" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify({
      categoryId: 'cat_motion',
      name: 'ScrollTrigger',
      description: 'Scroll-linked animation: pinning, scrub, parallax.',
      url: 'https://gsap.com/docs/v3/Plugins/ScrollTrigger/',
  })}'`;
    const createPromptCurl = `curl -X POST "http://localhost:3000/api/ai/prompts" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify({
      title: 'Grounded RAG Answerer',
      role: 'Retrieval',
      prompt: 'Answer ONLY from the provided <context>…',
  })}'`;
    useEffect(() => {
        const handleScroll = () => {
            const visible = sections
                .map((section) => {
                    const node = document.getElementById(section.id);
                    if (!node) return null;
                    const top = node.getBoundingClientRect().top;
                    return { id: section.id, top };
                })
                .filter(Boolean)
                .sort((a, b) => Math.abs(a.top - 130) - Math.abs(b.top - 130));

            if (visible[0]?.id) {
                setActiveSection(visible[0].id);
            }
        };

        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/blogs/token');
            const data = await res.json();
            if (data?.success && data?.data) {
                setTokenStatus(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch token status', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    const generateToken = async () => {
        setSaving(true);
        setCopied(false);
        try {
            const res = await fetch('/api/admin/blogs/token', { method: 'POST' });
            const data = await res.json();
            if (data?.success) {
                setNewToken(data.data.token);
                await fetchStatus();
            }
        } catch (error) {
            console.error('Failed to generate token', error);
        } finally {
            setSaving(false);
        }
    };

    const revokeToken = async () => {
        if (
            !(await confirm({
                title: 'Revoke blog API token?',
                message: 'Existing automations will fail until you generate a new token.',
                confirmText: 'Revoke',
                danger: true,
            }))
        )
            return;
        setRevoking(true);
        try {
            const res = await fetch('/api/admin/blogs/token', { method: 'DELETE' });
            const data = await res.json();
            if (data?.success) {
                setNewToken('');
                await fetchStatus();
            }
        } catch (error) {
            console.error('Failed to revoke token', error);
        } finally {
            setRevoking(false);
        }
    };

    const copyToken = async () => {
        if (!newToken) return;
        try {
            await navigator.clipboard.writeText(newToken);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch (error) {
            console.error('Failed to copy token', error);
        }
    };

    const matchesFilter = (keywords) => {
        const q = filterQuery.trim().toLowerCase();
        if (!q) return true;
        return keywords.toLowerCase().includes(q);
    };

    return (
        <div className="adm-page">
            <PageHeader
                command="man api"
                title="API reference"
                description="REST endpoints for blog automation, image uploads, system prompt generation, and AI hub sections."
            />

            <div className="adm-split">
                <div className="adm-stack">
                    {matchesFilter('token bearer auth key blog') && (
                        <Panel
                            id="token"
                            title="API token"
                            className="scroll-mt-24"
                            actions={
                                <Badge tone={tokenStatus.hasToken ? 'ok' : 'warn'}>
                                    {tokenStatus.hasToken ? 'Active' : 'Not generated'}
                                </Badge>
                            }
                        >
                            <div className="space-y-4">
                                {loading ? (
                                    <Loading label="Loading token status" rows={2} />
                                ) : (
                                    <div className="space-y-4">
                                        {tokenStatus.hasToken && (
                                            <p className="adm-help">
                                                Token ending:{' '}
                                                <code className="adm-code">****{tokenStatus.last4}</code>
                                                {tokenStatus.createdAt
                                                    ? ` · Created ${new Date(tokenStatus.createdAt).toLocaleString()}`
                                                    : ''}
                                            </p>
                                        )}

                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={generateToken}
                                                disabled={saving}
                                                className="adm-btn adm-btn-primary"
                                            >
                                                {saving ? (
                                                    <FaRotate aria-hidden="true" className="animate-spin" />
                                                ) : (
                                                    <FaKey aria-hidden="true" />
                                                )}
                                                {saving
                                                    ? 'Generating'
                                                    : tokenStatus.hasToken
                                                    ? 'Regenerate token'
                                                    : 'Generate token'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={revokeToken}
                                                disabled={revoking || !tokenStatus.hasToken}
                                                className="adm-btn adm-btn-danger"
                                            >
                                                <FaTrashCan aria-hidden="true" />
                                                {revoking ? 'Revoking' : 'Revoke token'}
                                            </button>
                                        </div>

                                        {newToken && (
                                            <div className="adm-notice adm-notice-warn space-y-2">
                                                <p className="font-semibold text-[var(--text-bright)]">
                                                    Copy now (shown once)
                                                </p>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <code className="adm-code flex-1 break-all">{newToken}</code>
                                                    <button
                                                        type="button"
                                                        onClick={copyToken}
                                                        className="adm-btn"
                                                    >
                                                        <FaCopy aria-hidden="true" />{' '}
                                                        {copied ? 'Copied' : 'Copy token'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </Panel>
                    )}

                    {matchesFilter(
                        'codemode code mode agent token bearer search execute read write revoke'
                    ) && <CodeModeTokensPanel />}

                    {matchesFilter(
                        'codemode code mode api search execute sandbox spec request upload limits curl js'
                    ) && (
                        <Panel
                            id="codemode-api"
                            title="Code Mode API"
                            className="scroll-mt-24"
                            actions={
                                <div className="flex items-center gap-2">
                                    <Badge tone="info">POST</Badge>
                                    <code className="adm-code">/api/codemode/*</code>
                                </div>
                            }
                        >
                            <div className="space-y-4">
                                <p className="adm-help">
                                    Agents send an <code className="adm-code">async () =&gt; {'{ ... }'}</code>{' '}
                                    JavaScript snippet in{' '}
                                    <code className="adm-code">{'{ "code": "..." }'}</code> to inspect the
                                    scope-filtered OpenAPI catalog or call allow-listed admin routes inside an
                                    isolated sandbox. Full agent docs live at{' '}
                                    <code className="adm-code">/.well-known/agent-skills/aiyu-codemode/SKILL.md</code>{' '}
                                    and <code className="adm-code">/auth.md</code>.
                                </p>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="rounded-[10px] border border-[var(--hairline)] bg-[var(--bg-primary)] p-3 space-y-2">
                                        <p className="font-semibold text-sm text-[var(--text-bright)]">
                                            Endpoints &amp; sandbox globals
                                        </p>
                                        <ul className="space-y-1.5 text-xs text-[var(--text-secondary)]">
                                            <li>
                                                <code className="adm-code">POST /api/codemode/search</code> — exposes{' '}
                                                <code className="adm-code">codemode.spec()</code> only.
                                            </li>
                                            <li>
                                                <code className="adm-code">POST /api/codemode/execute</code> — exposes{' '}
                                                <code className="adm-code">codemode.spec()</code>,{' '}
                                                <code className="adm-code">
                                                    codemode.request({'{ method, path, query, body }'})
                                                </code>
                                                , and (<code className="adm-code">write</code> scope){' '}
                                                <code className="adm-code">
                                                    codemode.upload({'{ name, type, base64 }'})
                                                </code>
                                                .
                                            </li>
                                            <li>
                                                No <code className="adm-code">fetch</code>,{' '}
                                                <code className="adm-code">process</code>,{' '}
                                                <code className="adm-code">require</code>, filesystem, or timers.
                                            </li>
                                        </ul>
                                    </div>

                                    <div className="rounded-[10px] border border-[var(--hairline)] bg-[var(--bg-primary)] p-3 space-y-2">
                                        <p className="font-semibold text-sm text-[var(--text-bright)]">
                                            Sandbox &amp; rate limits
                                        </p>
                                        <dl className="adm-facts">
                                            <div>
                                                <dt>Script / output</dt>
                                                <dd>64 KB / 24,000 chars</dd>
                                            </div>
                                            <div>
                                                <dt>Time / RAM</dt>
                                                <dd>30 s / 128 MB</dd>
                                            </div>
                                            <div>
                                                <dt>Requests / reply</dt>
                                                <dd>50 per run / 2 MB</dd>
                                            </div>
                                            <div>
                                                <dt>Concurrency / rate</dt>
                                                <dd>2 concurrent / 30 min⁻¹ IP</dd>
                                            </div>
                                        </dl>
                                    </div>
                                </div>

                                <div>
                                    <p className="adm-label mb-1.5">Headers</p>
                                    <ApiCodeBlock language="http" code={codeModeHeaders} />
                                </div>

                                <div>
                                    <p className="adm-label mb-1.5">Search catalog (cURL)</p>
                                    <ApiCodeBlock language="bash" code={codeModeSearchCurl} />
                                </div>

                                <div>
                                    <p className="adm-label mb-1.5">Execute script example (JS)</p>
                                    <ApiCodeBlock language="javascript" code={codeModeExecuteJs} />
                                </div>

                                <div>
                                    <p className="adm-label mb-1.5">Execute request (cURL)</p>
                                    <ApiCodeBlock language="bash" code={codeModeExecuteCurl} />
                                </div>
                            </div>
                        </Panel>
                    )}

                    {matchesFilter('create blog post /api/blogs post tags keywords published') && (
                        <Panel
                            id="create-blog"
                            title="Create blog post"
                            className="scroll-mt-24"
                            actions={
                                <div className="flex items-center gap-2">
                                    <Badge tone="info">POST</Badge>
                                    <code className="adm-code">/api/blogs</code>
                                </div>
                            }
                        >
                            <div className="space-y-4">
                                <div>
                                    <p className="adm-label mb-1.5">Headers</p>
                                    <ApiCodeBlock language="http" code={createBlogHeaders} />
                                </div>
                                <div>
                                    <p className="adm-label mb-1.5">Request body (example)</p>
                                    <ApiCodeBlock
                                        language="json"
                                        code={JSON.stringify(samplePayload, null, 2)}
                                    />
                                </div>
                            </div>
                        </Panel>
                    )}

                    {matchesFilter('upload image /api/admin/images/upload post multipart webp thumbnail') && (
                        <Panel
                            id="upload-image"
                            title="Upload image (independent)"
                            className="scroll-mt-24"
                            actions={
                                <div className="flex items-center gap-2">
                                    <Badge tone="info">POST</Badge>
                                    <code className="adm-code">/api/admin/images/upload</code>
                                </div>
                            }
                        >
                            <div className="space-y-4">
                                <p className="adm-help">
                                    Uploads and optimizes an image using the same pipeline as gallery uploads.
                                    This endpoint is independent and does not create or update any blog entry
                                    automatically.
                                </p>
                                <div>
                                    <p className="adm-label mb-1.5">Headers</p>
                                    <ApiCodeBlock language="http" code={uploadImageHeaders} />
                                </div>
                                <div>
                                    <p className="adm-label mb-1.5">Request body (multipart form fields)</p>
                                    <ApiCodeBlock language="bash" code={uploadImageRequest} />
                                </div>
                                <div>
                                    <p className="adm-label mb-1.5">Response (example)</p>
                                    <ApiCodeBlock language="json" code={uploadImageResponse} />
                                </div>
                            </div>
                        </Panel>
                    )}

                    {matchesFilter('system prompt /api/admin/system-prompt get context json') && (
                        <Panel
                            id="system-prompt"
                            title="System prompt (database-tuned)"
                            className="scroll-mt-24"
                            actions={
                                <div className="flex items-center gap-2">
                                    <Badge tone="ok">GET</Badge>
                                    <code className="adm-code">/api/admin/system-prompt</code>
                                </div>
                            }
                        >
                            <div className="space-y-4">
                                <p className="adm-help">
                                    Returns a prepared system prompt as plain text, tuned from your database
                                    content (name, roles, summary, and full website context JSON).
                                </p>
                                <div>
                                    <p className="adm-label mb-1.5">Headers</p>
                                    <ApiCodeBlock language="http" code={systemPromptHeaders} />
                                </div>
                                <div>
                                    <p className="adm-label mb-1.5">Response (plain text prompt excerpt)</p>
                                    <ApiCodeBlock language="text" code={systemPromptResponse} />
                                </div>
                            </div>
                        </Panel>
                    )}

                    {matchesFilter('ai hub sections skills recommendations credits prompts /api/ai') && (
                        <Panel
                            id="ai-hub-sections"
                            title="AI hub sections"
                            className="scroll-mt-24"
                            actions={<Badge>REST</Badge>}
                        >
                            <div className="space-y-5">
                                <p className="adm-help">
                                    The four <code className="adm-code">/ai</code> content sections —{' '}
                                    <strong className="text-[var(--text-bright)]">Skills</strong>,{' '}
                                    <strong className="text-[var(--text-bright)]">Recommendations</strong>,{' '}
                                    <strong className="text-[var(--text-bright)]">Free credits</strong>, and{' '}
                                    <strong className="text-[var(--text-bright)]">Prompt library</strong> — are
                                    each independent, shareable data with their own REST CRUD. Reads are
                                    public; writes take an admin session or a bearer token.
                                </p>

                                <div className="adm-notice adm-notice-warn">
                                    Write endpoints (POST, PUT, DELETE) accept either the admin session cookie or
                                    an <code className="adm-code">Authorization: Bearer &lt;token&gt;</code>{' '}
                                    header with the blog API token above. Reads need no auth.
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="rounded-[10px] border border-[var(--hairline)] bg-[var(--bg-primary)] p-3 space-y-2">
                                        <p className="font-semibold text-sm text-[var(--text-bright)]">
                                            Public reads (REST)
                                        </p>
                                        <ul className="space-y-1.5 font-mono text-xs text-[var(--text-secondary)]">
                                            <li className="flex items-center gap-2">
                                                <Badge tone="ok">GET</Badge> /api/ai/skills
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <Badge tone="ok">GET</Badge> /api/ai/recommendations
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <Badge tone="ok">GET</Badge> /api/ai/credits
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <Badge tone="ok">GET</Badge> /api/ai/prompts
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <Badge tone="ok">GET</Badge> /api/ai-page
                                            </li>
                                        </ul>
                                    </div>
                                    <div className="rounded-[10px] border border-[var(--hairline)] bg-[var(--bg-primary)] p-3 space-y-2">
                                        <p className="font-semibold text-sm text-[var(--text-bright)]">
                                            Writes (session or token)
                                        </p>
                                        <ul className="space-y-1.5 font-mono text-xs text-[var(--text-secondary)]">
                                            <li className="flex items-center gap-2">
                                                <Badge tone="info">POST</Badge> /api/ai/skills/categories[/id]
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <Badge tone="info">POST</Badge> /api/ai/skills/items[/id]
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <Badge tone="warn">CRUD</Badge> /api/ai/recommendations[/id]
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <Badge tone="warn">CRUD</Badge> /api/ai/credits[/id]
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <Badge tone="warn">CRUD</Badge> /api/ai/prompts[/id]
                                            </li>
                                        </ul>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="adm-label">Read the skills section (REST, public)</p>
                                        <div className="flex items-center gap-2">
                                            <Badge tone="ok">GET</Badge>
                                            <code className="adm-code">/api/ai/skills</code>
                                        </div>
                                    </div>
                                    <ApiCodeBlock language="bash" code={aiSkillsGetCurl} />
                                    <p className="adm-label">Response shape</p>
                                    <ApiCodeBlock
                                        language="json"
                                        code={JSON.stringify(skillsShape, null, 2)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="adm-label">Add a skill (REST write)</p>
                                        <div className="flex items-center gap-2">
                                            <Badge tone="info">POST</Badge>
                                            <code className="adm-code">/api/ai/skills/items</code>
                                        </div>
                                    </div>
                                    <ApiCodeBlock language="bash" code={createSkillCurl} />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="adm-label">Add a prompt (REST write)</p>
                                        <div className="flex items-center gap-2">
                                            <Badge tone="info">POST</Badge>
                                            <code className="adm-code">/api/ai/prompts</code>
                                        </div>
                                    </div>
                                    <ApiCodeBlock language="bash" code={createPromptCurl} />
                                </div>

                            </div>
                        </Panel>
                    )}

                    {matchesFilter('examples curl bash blog upload image system prompt') && (
                        <Panel id="examples" title="cURL examples" className="scroll-mt-24">
                            <div className="space-y-4">
                                <div>
                                    <p className="adm-label mb-1.5">Create blog (cURL)</p>
                                    <ApiCodeBlock language="bash" code={createBlogCurl} />
                                </div>
                                <div>
                                    <p className="adm-label mb-1.5">Upload image only (cURL)</p>
                                    <ApiCodeBlock language="bash" code={uploadImageCurl} />
                                </div>
                                <div>
                                    <p className="adm-label mb-1.5">Get database-tuned system prompt (cURL)</p>
                                    <ApiCodeBlock language="bash" code={systemPromptCurl} />
                                </div>
                            </div>
                        </Panel>
                    )}

                    {matchesFilter('notes seo metadata published date url text/plain') && (
                        <Panel id="notes" title="Notes" className="scroll-mt-24">
                            <ul className="list-disc space-y-2 pl-5 text-sm text-[var(--text-secondary)]">
                                <li>If SEO or social fields are omitted, metadata fallbacks are used.</li>
                                <li>
                                    <code className="adm-code">published: true</code> makes a post public
                                    immediately.
                                </li>
                                <li>
                                    <code className="adm-code">date</code> should be human-readable (e.g.
                                    &quot;April 18, 2026&quot;).
                                </li>
                                <li>
                                    Image upload response returns the optimized URL in{' '}
                                    <code className="adm-code">data.url</code>.
                                </li>
                                <li>
                                    The optional <code className="adm-code">name</code> form field helps control
                                    the generated filename base.
                                </li>
                                <li>
                                    The system prompt endpoint returns{' '}
                                    <code className="adm-code">text/plain</code>, not JSON.
                                </li>
                            </ul>
                        </Panel>
                    )}
                </div>

                <aside className="adm-stack adm-side order-first xl:order-none">
                    <Panel title="Filter reference">
                        <Field label="Search endpoints">
                            <div className="relative">
                                <FaMagnifyingGlass
                                    aria-hidden="true"
                                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--adm-hint)]"
                                />
                                <input
                                    type="search"
                                    value={filterQuery}
                                    onChange={(e) => setFilterQuery(e.target.value)}
                                    placeholder="e.g. /api/blogs, upload…"
                                    className="adm-input pl-9"
                                />
                            </div>
                        </Field>
                    </Panel>

                    <Panel title="On this page" flush>
                        <nav aria-label="API reference sections">
                            <ul className="adm-list">
                                {sections.map((section) => {
                                    const isActive = activeSection === section.id;
                                    return (
                                        <li key={section.id}>
                                            <a
                                                href={`#${section.id}`}
                                                aria-current={isActive ? 'location' : undefined}
                                                className={`adm-row justify-between ${
                                                    isActive
                                                        ? 'font-semibold text-[var(--text-bright)]'
                                                        : 'text-[var(--text-secondary)]'
                                                }`}
                                            >
                                                <span>{section.label}</span>
                                                {section.method && <Badge>{section.method}</Badge>}
                                            </a>
                                        </li>
                                    );
                                })}
                            </ul>
                        </nav>
                    </Panel>
                </aside>
            </div>
        </div>
    );
}
