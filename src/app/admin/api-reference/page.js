"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const SyntaxHighlighter = dynamic(
    () => import('react-syntax-highlighter').then((module) => module.Prism),
    { ssr: false }
);

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
        <div className="rounded-lg border border-white/10 overflow-hidden bg-slate-950/80">
            <div className="px-3 py-2 border-b border-white/10 bg-slate-900/80 flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-widest text-cyan-300/90 font-semibold">{language}</span>
                <button
                    type="button"
                    onClick={handleCopy}
                    className="text-[11px] px-2 py-1 rounded border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 transition-colors"
                >
                    {copied ? 'Copied' : 'Copy'}
                </button>
            </div>
            <SyntaxHighlighter
                language={language}
                style={vscDarkPlus}
                customStyle={{
                    margin: 0,
                    borderRadius: 0,
                    padding: '12px',
                    fontSize: '12px',
                    background: 'transparent',
                }}
            >
                {String(code || '')}
            </SyntaxHighlighter>
        </div>
    );
}

const sections = [
    { id: 'token', label: 'API Token' },
    { id: 'create-blog', label: 'Create Blog Post' },
    { id: 'upload-image', label: 'Upload Image' },
    { id: 'system-prompt', label: 'System Prompt' },
    { id: 'ai-hub-skills', label: 'AI Hub · Skills' },
    { id: 'examples', label: 'Examples' },
    { id: 'notes', label: 'Notes' },
];

export default function AdminApiReferencePage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [revoking, setRevoking] = useState(false);
    const [tokenStatus, setTokenStatus] = useState({ hasToken: false, last4: '', createdAt: null });
    const [newToken, setNewToken] = useState('');
    const [copied, setCopied] = useState(false);
    const [activeSection, setActiveSection] = useState(sections[0].id);

    const samplePayload = useMemo(() => ({
        title: "How I Automated Blog Publishing",
        content: "## Intro\\nThis post was created via API.",
        excerpt: "A quick post generated from automation workflow.",
        tags: ["automation", "api", "blog"],
        keywords: ["automation", "api blogging", "workflow"],
        image: "https://example.com/cover.jpg",
        imageAlt: "Automation workflow diagram",
        socialTitle: "API-Generated Blog Post",
        socialDescription: "Create and publish blog posts from your own tools.",
        socialImage: "https://example.com/social.jpg",
        socialImageAlt: "Social preview image",
        published: true,
        date: "April 18, 2026"
    }), []);
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

    // ── AI Hub · Skills section ──
    const skillsSectionShape = useMemo(() => ({
        id: 'skills',
        type: 'skills',
        enabled: true,
        eyebrow: 'Agent skills',
        title: 'AI skills & specializations',
        subtitle: 'Filter by category to explore what each one does.',
        accent: 'var(--accent-purple)',
        data: {
            categories: [
                {
                    id: 'motion',
                    label: 'Motion & Animation',
                    accent: 'var(--accent-cyan)',
                    items: [
                        {
                            name: 'GSAP Core',
                            description: 'Framework-agnostic JavaScript animation — tweens, easing, stagger.',
                            url: 'https://gsap.com/docs/v3/',
                        },
                    ],
                },
            ],
        },
    }), []);
    const skillsData = skillsSectionShape.data;
    const aiPageGetCurl = `curl "http://localhost:3000/api/ai-page"`;
    const mcpAccept = `Content-Type: application/json
Accept: application/json, text/event-stream`;
    const getSkillsCurl = `curl -X POST "http://localhost:3000/api/mcp" \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json, text/event-stream" \\
  -d '${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'get_ai_section', arguments: { id: 'skills' } } })}'`;
    const updateSkillsCurl = `curl -X POST "http://localhost:3000/api/mcp" \\
  -H "Authorization: Bearer YOUR_MCP_TOKEN" \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json, text/event-stream" \\
  -d '${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'update_ai_section', arguments: { id: 'skills', data: skillsData } } })}'`;

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
        if (!confirm('Revoke blog API token? Existing automations will fail until you generate a new token.')) return;
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

    return (
        <div className="p-6 md:p-8 max-w-5xl xl:max-w-7xl mx-auto min-h-screen text-slate-200">
            <div className="mb-8">
                <Link href="/admin/blogs" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors mb-4 text-sm font-mono opacity-70 hover:opacity-100">
                    ← BACK_TO_BLOGS
                </Link>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Admin API Reference</h1>
                <p className="text-slate-400">Central API docs for blog automation and media updates.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px] gap-8 items-start">
                <div className="space-y-8">
                    <section id="token" className="scroll-mt-24 rounded-2xl border border-white/10 bg-slate-900/60 p-6">
                        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-4">API Token</h2>

                        {loading ? (
                            <p className="text-slate-400 text-sm">Loading token status...</p>
                        ) : (
                            <div className="space-y-4">
                                <div className="text-sm text-slate-300">
                                    <p>
                                        Status: {tokenStatus.hasToken ? (
                                            <span className="text-emerald-400 font-semibold">Active</span>
                                        ) : (
                                            <span className="text-amber-400 font-semibold">Not generated</span>
                                        )}
                                    </p>
                                    {tokenStatus.hasToken ? (
                                        <p className="text-slate-400 mt-1">
                                            Token ending: <span className="font-mono text-slate-300">****{tokenStatus.last4}</span>
                                            {tokenStatus.createdAt ? ` • Created: ${new Date(tokenStatus.createdAt).toLocaleString()}` : ''}
                                        </p>
                                    ) : null}
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    <button
                                        type="button"
                                        onClick={generateToken}
                                        disabled={saving}
                                        className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold disabled:opacity-50"
                                    >
                                        {saving ? 'Generating...' : tokenStatus.hasToken ? 'Regenerate Token' : 'Generate Token'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={revokeToken}
                                        disabled={revoking || !tokenStatus.hasToken}
                                        className="px-4 py-2 rounded-lg border border-red-500/40 text-red-300 hover:bg-red-500/10 text-sm font-semibold disabled:opacity-50"
                                    >
                                        {revoking ? 'Revoking...' : 'Revoke Token'}
                                    </button>
                                </div>

                                {newToken ? (
                                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                                        <p className="text-amber-300 text-xs font-semibold uppercase tracking-widest mb-2">
                                            Copy now (shown once)
                                        </p>
                                        <code className="block break-all text-sm text-slate-100 bg-black/30 p-3 rounded border border-white/10">
                                            {newToken}
                                        </code>
                                        <button
                                            type="button"
                                            onClick={copyToken}
                                            className="mt-3 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-sm"
                                        >
                                            {copied ? 'Copied' : 'Copy token'}
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                        )}
                    </section>

                    <section id="create-blog" className="scroll-mt-24 rounded-2xl border border-white/10 bg-slate-900/60 p-6 space-y-4">
                        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Create Blog Post</h2>
                        <code className="text-sm text-cyan-300">POST /api/blogs</code>

                        <div>
                            <p className="text-slate-300 text-sm mb-2">Headers</p>
                            <ApiCodeBlock language="http" code={createBlogHeaders} />
                        </div>

                        <div>
                            <p className="text-slate-300 text-sm mb-2">Request Body (example)</p>
                            <ApiCodeBlock language="json" code={JSON.stringify(samplePayload, null, 2)} />
                        </div>
                    </section>

                    <section id="upload-image" className="scroll-mt-24 rounded-2xl border border-white/10 bg-slate-900/60 p-6 space-y-4">
                        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Upload Image (Independent)</h2>
                        <code className="text-sm text-cyan-300">POST /api/admin/images/upload</code>
                        <p className="text-sm text-slate-300">
                            Uploads and optimizes an image using the same pipeline as gallery uploads. This endpoint is independent and does not
                            create or update any blog entry automatically.
                        </p>
                        <div>
                            <p className="text-slate-300 text-sm mb-2">Headers</p>
                            <ApiCodeBlock language="http" code={uploadImageHeaders} />
                        </div>
                        <div>
                            <p className="text-slate-300 text-sm mb-2">Request Body (multipart form fields)</p>
                            <ApiCodeBlock language="bash" code={uploadImageRequest} />
                        </div>
                        <div>
                            <p className="text-slate-300 text-sm mb-2">Response (example)</p>
                            <ApiCodeBlock language="json" code={uploadImageResponse} />
                        </div>
                    </section>

                    <section id="system-prompt" className="scroll-mt-24 rounded-2xl border border-white/10 bg-slate-900/60 p-6 space-y-4">
                        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">System Prompt (DB-Tuned)</h2>
                        <code className="text-sm text-cyan-300">GET /api/admin/system-prompt</code>
                        <p className="text-sm text-slate-300">
                            Returns a fully prepared system prompt as plain text, tuned from your database content (name, roles, summary, and full website context JSON).
                        </p>
                        <div>
                            <p className="text-slate-300 text-sm mb-2">Headers</p>
                            <ApiCodeBlock language="http" code={systemPromptHeaders} />
                        </div>
                        <div>
                            <p className="text-slate-300 text-sm mb-2">Response (plain text prompt excerpt)</p>
                            <ApiCodeBlock language="text" code={systemPromptResponse} />
                        </div>
                    </section>

                    <section id="ai-hub-skills" className="scroll-mt-24 rounded-2xl border border-white/10 bg-slate-900/60 p-6 space-y-5">
                        <div>
                            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">AI Hub · Skills</h2>
                            <p className="text-sm text-slate-300 mt-2">
                                The <code className="text-cyan-300">/ai</code> page is schema-driven: an ordered array of <em>section</em>
                                objects. The <code className="text-cyan-300">skills</code> section lists the AI skills your agents can use.
                                Read it over public REST or the MCP read tools; edit it with the guarded MCP write tools.
                            </p>
                        </div>

                        <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 text-xs text-amber-200/90">
                            Writes go through the MCP endpoint and require <strong>write access</strong> enabled in{' '}
                            <Link href="/admin/mcp" className="underline text-amber-200 hover:text-amber-100">/admin/mcp</Link>{' '}
                            plus an <code>Authorization: Bearer &lt;token&gt;</code> header (generate the token there). Read tools are public.
                        </div>

                        <div>
                            <p className="text-slate-300 text-sm mb-2">Read the whole page config (REST, public)</p>
                            <code className="text-sm text-cyan-300 block mb-2">GET /api/ai-page</code>
                            <ApiCodeBlock language="bash" code={aiPageGetCurl} />
                        </div>

                        <div>
                            <p className="text-slate-300 text-sm mb-2">The <code>skills</code> section shape</p>
                            <ApiCodeBlock language="json" code={JSON.stringify(skillsSectionShape, null, 2)} />
                            <p className="text-xs text-slate-500 mt-2">
                                Each category holds <code>items</code> of <code>{'{ name, description, url? }'}</code>. <code>url</code> is
                                optional — when set, the skill name links out on the public page.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                                <p className="text-xs font-mono uppercase tracking-widest text-cyan-400 mb-1">Read tools (public)</p>
                                <ul className="list-disc pl-4 space-y-1 text-xs text-slate-400">
                                    <li><code>get_ai_page</code> — full config</li>
                                    <li><code>list_ai_sections</code> — id/type/title summaries</li>
                                    <li><code>get_ai_section {'{ id }'}</code> — one section + data</li>
                                </ul>
                            </div>
                            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                                <p className="text-xs font-mono uppercase tracking-widest text-fuchsia-400 mb-1">Write tools (token)</p>
                                <ul className="list-disc pl-4 space-y-1 text-xs text-slate-400">
                                    <li><code>create_ai_section {'{ type, data, … }'}</code></li>
                                    <li><code>update_ai_section {'{ id, data, … }'}</code></li>
                                    <li><code>delete_ai_section {'{ id }'}</code></li>
                                    <li><code>reorder_ai_sections {'{ order }'}</code></li>
                                </ul>
                            </div>
                        </div>

                        <div>
                            <p className="text-slate-300 text-sm mb-2">MCP request headers</p>
                            <ApiCodeBlock language="http" code={mcpAccept} />
                        </div>

                        <div>
                            <p className="text-slate-300 text-sm mb-2">Get the skills section (MCP, no token)</p>
                            <code className="text-sm text-cyan-300 block mb-2">POST /api/mcp → tools/call · get_ai_section</code>
                            <ApiCodeBlock language="bash" code={getSkillsCurl} />
                        </div>

                        <div>
                            <p className="text-slate-300 text-sm mb-2">Update the skills section (MCP, requires token)</p>
                            <code className="text-sm text-cyan-300 block mb-2">POST /api/mcp → tools/call · update_ai_section</code>
                            <ApiCodeBlock language="bash" code={updateSkillsCurl} />
                            <p className="text-xs text-slate-500 mt-2">
                                <code>data</code> replaces the section payload wholesale — send the full <code>categories</code> array, not a diff.
                                Read first with <code>get_ai_section</code>, edit, then send it back.
                            </p>
                        </div>
                    </section>

                    <section id="examples" className="scroll-mt-24 rounded-2xl border border-white/10 bg-slate-900/60 p-6 space-y-4">
                        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Examples</h2>
                        <div>
                            <p className="text-slate-300 text-sm mb-2">Create blog (cURL)</p>
                            <ApiCodeBlock language="bash" code={createBlogCurl} />
                        </div>
                        <div>
                            <p className="text-slate-300 text-sm mb-2">Upload image only (cURL)</p>
                            <ApiCodeBlock language="bash" code={uploadImageCurl} />
                        </div>
                        <div>
                            <p className="text-slate-300 text-sm mb-2">Get DB-tuned system prompt (cURL)</p>
                            <ApiCodeBlock language="bash" code={systemPromptCurl} />
                        </div>
                    </section>

                    <section id="notes" className="scroll-mt-24 rounded-2xl border border-white/10 bg-slate-900/60 p-6">
                        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-3">Notes</h2>
                        <ul className="list-disc pl-5 space-y-1 text-xs text-slate-400">
                            <li>If SEO/social fields are omitted, metadata fallbacks are used.</li>
                            <li>`published: true` makes a post public immediately.</li>
                            <li>`date` should be human-readable (e.g. &quot;April 18, 2026&quot;).</li>
                            <li>Image upload response returns the optimized URL in `data.url`.</li>
                            <li>The optional `name` form field helps control generated filename base.</li>
                            <li>System prompt endpoint returns `text/plain`, not JSON.</li>
                        </ul>
                    </section>
                </div>

                <aside className="hidden xl:block sticky top-24 self-start rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                    <p className="mb-3 text-xs uppercase tracking-widest text-slate-500 font-semibold">On this page</p>
                    <nav className="space-y-2">
                        {sections.map((section) => {
                            const isActive = activeSection === section.id;
                            return (
                                <a
                                    key={section.id}
                                    href={`#${section.id}`}
                                    className={`block text-sm rounded-md px-2 py-1.5 transition-colors ${isActive ? 'text-cyan-300 bg-cyan-500/10 border border-cyan-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                                >
                                    {section.label}
                                </a>
                            );
                        })}
                    </nav>
                </aside>
            </div>
        </div>
    );
}
