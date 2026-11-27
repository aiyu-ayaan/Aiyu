"use client";

import { useEffect, useMemo, useState } from 'react';
import { FaCopy, FaKey, FaMagnifyingGlass, FaRotate, FaTrashCan } from 'react-icons/fa6';
import { useAdminFeedback } from '@/app/components/admin/feedback/AdminFeedbackProvider';
import { Badge, Field, Loading, PageHeader, Panel } from '@/app/components/admin/ui';
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
    { id: 'create-blog', label: 'Create blog post', method: 'POST', path: '/api/blogs' },
    { id: 'upload-image', label: 'Upload image', method: 'POST', path: '/api/admin/images/upload' },
    { id: 'system-prompt', label: 'System prompt', method: 'GET', path: '/api/admin/system-prompt' },
    { id: 'ai-hub-sections', label: 'AI hub sections', method: 'REST', path: '/api/ai/*' },
    { id: 'examples', label: 'Examples' },
    { id: 'notes', label: 'Notes' },
];

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
