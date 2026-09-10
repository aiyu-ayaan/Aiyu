"use client";

/**
 * Rendered README for a synced project.
 *
 * The markdown arrives already absolutized and truncated by lib/githubProjects;
 * this component only renders it. Two rules shape the styling:
 *
 *  - It must read as part of the site, not as an embedded GitHub page, so
 *    headings/links/code use the same v2 tokens as the surrounding editorial
 *    layout rather than GitHub's palette.
 *  - Everything a README can contain must degrade safely. Long tables and code
 *    blocks scroll inside their own container so the page body never scrolls
 *    horizontally on a phone.
 *
 * README content is authored in the repo and rendered as data. `react-markdown`
 * does not evaluate raw HTML unless `rehype-raw` is added — it is deliberately
 * not added here, so embedded <script>/<iframe> in a README stay inert.
 */
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FaChevronDown } from 'react-icons/fa6';

// Roughly two screens of prose. Long READMEs are collapsed by default so the
// project's own framing stays above the fold instead of being buried.
const COLLAPSED_MAX_HEIGHT = 720;
const COLLAPSE_THRESHOLD_CHARS = 2600;

const markdownComponents = {
    h1: ({ children }) => (
        <h2 className="mt-10 mb-4 text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: 'var(--text-bright)' }}>
            {children}
        </h2>
    ),
    h2: ({ children }) => (
        <h3 className="mt-9 mb-3 text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-bright)' }}>
            {children}
        </h3>
    ),
    h3: ({ children }) => (
        <h4 className="mt-7 mb-2 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {children}
        </h4>
    ),
    p: ({ children }) => (
        <p className="my-4 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>{children}</p>
    ),
    a: ({ href, children }) => (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="underline underline-offset-4 transition-colors"
            style={{ color: 'var(--accent-cyan)' }}
        >
            {children}
        </a>
    ),
    ul: ({ children }) => (
        <ul className="my-4 list-disc space-y-1.5 pl-6" style={{ color: 'var(--text-tertiary)' }}>{children}</ul>
    ),
    ol: ({ children }) => (
        <ol className="my-4 list-decimal space-y-1.5 pl-6" style={{ color: 'var(--text-tertiary)' }}>{children}</ol>
    ),
    blockquote: ({ children }) => (
        <blockquote
            className="my-5 py-1 pl-4 italic"
            style={{ borderLeft: '2px solid var(--accent-cyan)', color: 'var(--text-secondary)' }}
        >
            {children}
        </blockquote>
    ),
    code: ({ inline, children }) => (inline ? (
        <code
            className="rounded px-1.5 py-0.5 font-mono text-[0.85em]"
            style={{
                backgroundColor: 'color-mix(in srgb, var(--accent-cyan) 10%, transparent)',
                color: 'var(--accent-cyan-bright, var(--accent-cyan))',
            }}
        >
            {children}
        </code>
    ) : (
        <code className="font-mono text-sm">{children}</code>
    )),
    pre: ({ children }) => (
        <pre
            className="my-5 overflow-x-auto rounded-xl p-4 text-sm"
            style={{
                border: '1px solid var(--hairline)',
                backgroundColor: 'color-mix(in srgb, var(--text-bright) 4%, transparent)',
                color: 'var(--text-secondary)',
            }}
        >
            {children}
        </pre>
    ),
    // Tables are the most common source of horizontal overflow in a README.
    table: ({ children }) => (
        <div className="my-5 overflow-x-auto">
            <table className="w-full border-collapse text-sm" style={{ color: 'var(--text-tertiary)' }}>
                {children}
            </table>
        </div>
    ),
    th: ({ children }) => (
        <th
            className="px-3 py-2 text-left font-mono text-xs uppercase tracking-wider"
            style={{ borderBottom: '1px solid var(--hairline-strong, var(--hairline))', color: 'var(--text-muted)' }}
        >
            {children}
        </th>
    ),
    td: ({ children }) => (
        <td className="px-3 py-2" style={{ borderBottom: '1px solid var(--hairline)' }}>{children}</td>
    ),
    hr: () => <hr className="my-8" style={{ borderColor: 'var(--hairline)' }} />,
    img: ({ src, alt }) => (
        // Remote README assets from arbitrary repos: plain <img> rather than
        // next/image, which would require every host in next.config remotePatterns.
        <img
            src={src}
            alt={alt || ''}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="my-4 inline-block h-auto max-w-full rounded-lg"
        />
    ),
};

export default function RepoReadme({ markdown, repoName }) {
    const content = typeof markdown === 'string' ? markdown.trim() : '';
    const isLong = content.length > COLLAPSE_THRESHOLD_CHARS;
    const [expanded, setExpanded] = useState(false);

    if (!content) return null;

    const collapsed = isLong && !expanded;

    return (
        <section aria-labelledby="repo-readme-heading" className="relative">
            <h2
                id="repo-readme-heading"
                className="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.3em]"
                style={{ color: 'var(--text-muted)' }}
            >
                {'// readme'}
                {repoName && <span className="ml-2 normal-case tracking-normal opacity-70">{repoName}</span>}
            </h2>

            <div
                className="relative"
                style={collapsed ? { maxHeight: COLLAPSED_MAX_HEIGHT, overflow: 'hidden' } : undefined}
            >
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {content}
                </ReactMarkdown>

                {collapsed && (
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-32"
                        style={{ background: 'linear-gradient(to bottom, transparent, var(--bg-primary, #05070d))' }}
                    />
                )}
            </div>

            {isLong && (
                <button
                    type="button"
                    onClick={() => setExpanded((value) => !value)}
                    aria-expanded={expanded}
                    className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 font-mono text-xs uppercase tracking-[0.2em] transition-colors"
                    style={{ border: '1px solid var(--hairline)', color: 'var(--accent-cyan)' }}
                >
                    {expanded ? 'collapse readme' : 'read full readme'}
                    <FaChevronDown
                        className={`h-3 w-3 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
                        aria-hidden="true"
                    />
                </button>
            )}
        </section>
    );
}
