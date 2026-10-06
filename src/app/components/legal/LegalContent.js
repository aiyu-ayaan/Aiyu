/**
 * Server-rendered body of a legal page. `format` is "markdown" or "html".
 *
 * Both paths end in the same sanitized hast tree and the same styled element
 * map, so a policy reads identically whichever way it was authored:
 *   - markdown: react-markdown (GFM tables/lists) with inline HTML allowed via
 *     rehype-raw, then rehype-sanitize.
 *   - html: parsed as a whole document fragment with hast-util-raw (no markdown
 *     pass, so indentation in pasted HTML can never turn into code blocks),
 *     then sanitized with the same schema.
 *
 * The schema is rehype-sanitize's default (no <script>, <style>, <iframe>,
 * event handlers or javascript: URLs) plus a few harmless layout tags, so the
 * admin can paste a generated policy without it ever executing on this origin.
 * Rendering happens on the server, so the page ships zero client JS for this.
 */
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { raw } from 'hast-util-raw';
import { sanitize, defaultSchema } from 'hast-util-sanitize';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';

const LEGAL_SCHEMA = {
    ...defaultSchema,
    tagNames: [
        ...(defaultSchema.tagNames || []),
        'div', 'span', 'section', 'article', 'header', 'footer', 'address',
        'details', 'summary', 'mark', 'small', 'u', 'abbr', 'sub', 'sup',
    ],
    attributes: {
        ...defaultSchema.attributes,
        '*': [...(defaultSchema.attributes?.['*'] || []), 'id', 'align'],
        a: [...(defaultSchema.attributes?.a || []), 'target', 'rel'],
        details: ['open'],
        abbr: ['title'],
    },
};

const text = { color: 'var(--text-tertiary)' };
const bright = { color: 'var(--text-bright)' };

const components = {
    h1: ({ children, id }) => <h2 id={id} className="mt-12 mb-4 text-2xl font-bold tracking-tight sm:text-3xl" style={bright}>{children}</h2>,
    h2: ({ children, id }) => <h2 id={id} className="mt-12 mb-4 text-xl font-bold tracking-tight sm:text-2xl scroll-mt-24" style={bright}>{children}</h2>,
    h3: ({ children, id }) => <h3 id={id} className="mt-8 mb-3 text-lg font-semibold scroll-mt-24" style={{ color: 'var(--text-primary)' }}>{children}</h3>,
    h4: ({ children, id }) => <h4 id={id} className="mt-6 mb-2 font-semibold" style={{ color: 'var(--text-primary)' }}>{children}</h4>,
    p: ({ children }) => <p className="my-4 leading-relaxed" style={text}>{children}</p>,
    ul: ({ children }) => <ul className="my-4 list-disc space-y-2 pl-6 leading-relaxed" style={text}>{children}</ul>,
    ol: ({ children }) => <ol className="my-4 list-decimal space-y-2 pl-6 leading-relaxed" style={text}>{children}</ol>,
    a: ({ href, children }) => {
        const external = typeof href === 'string' && /^https?:\/\//i.test(href);
        return (
            <a
                href={href}
                className="underline decoration-1 underline-offset-4 transition-opacity hover:opacity-80 break-words"
                style={{ color: 'var(--accent-cyan)' }}
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
                {children}
            </a>
        );
    },
    strong: ({ children }) => <strong className="font-semibold" style={{ color: 'var(--text-primary)' }}>{children}</strong>,
    blockquote: ({ children }) => (
        <blockquote className="my-6 border-l-2 pl-4 italic" style={{ borderColor: 'var(--accent-cyan)', ...text }}>{children}</blockquote>
    ),
    hr: () => <hr className="my-10" style={{ borderColor: 'var(--border-primary)' }} />,
    code: ({ children }) => (
        <code className="rounded px-1.5 py-0.5 font-mono text-[0.9em]" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>{children}</code>
    ),
    table: ({ children }) => (
        <div className="my-6 overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm" style={text}>{children}</table>
        </div>
    ),
    th: ({ children }) => <th className="border-b px-3 py-2 font-semibold" style={{ borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}>{children}</th>,
    td: ({ children }) => <td className="border-b px-3 py-2 align-top" style={{ borderColor: 'var(--border-primary)' }}>{children}</td>,
    // Plain <img>: legal content may reference any host, which next/image would reject.
    img: ({ src, alt }) => (
        <img src={src} alt={alt || ''} loading="lazy" className="my-6 h-auto max-w-full rounded-lg" />
    ),
};

function HtmlBody({ html }) {
    const parsed = raw({ type: 'root', children: [{ type: 'raw', value: html }] });
    const clean = sanitize(parsed, LEGAL_SCHEMA);
    return toJsxRuntime(clean, { Fragment, jsx, jsxs, components });
}

export default function LegalContent({ content, format }) {
    const source = typeof content === 'string' ? content : '';
    if (!source.trim()) {
        return <p className="font-mono text-sm" style={text}>This document has no content yet.</p>;
    }

    return (
        <div className="legal-content text-base sm:text-[17px] break-words">
            {format === 'html' ? (
                <HtmlBody html={source} />
            ) : (
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw, [rehypeSanitize, LEGAL_SCHEMA]]}
                    components={components}
                >
                    {source}
                </ReactMarkdown>
            )}
        </div>
    );
}
