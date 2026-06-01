"use client";

import React, { useEffect, useState, useMemo, memo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Script from 'next/script';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import dynamic from 'next/dynamic';
import { FaArrowLeft, FaCalendarAlt, FaClock, FaShareAlt, FaTag, FaBolt } from 'react-icons/fa';
import { IoCheckmark } from 'react-icons/io5';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import LinkPreview from './LinkPreview';
import {
  formatBlogDate,
  getBlogInitials,
  getBlogPlaceholderGradient,
  getReadTime,
  extractLinksFromContent,
} from './blogUtils';
import RouteBetaBadge from '../shared/RouteBetaBadge';
import '../../styles/blog-detail.css';

const SyntaxHighlighter = dynamic(
  () => import('react-syntax-highlighter').then((module) => module.Prism),
  { ssr: false, loading: () => <div style={{ minHeight: '200px' }} /> }
);

const isOptimizableImage = (src) =>
  typeof src === 'string' && (src.startsWith('/') || src.startsWith('https://'));

function stripH1Content(markdown = '') {
  if (typeof markdown !== 'string') return '';

  return markdown
    .replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi, '')
    .replace(/^#(?!#)\s+.*$/gm, '')
    .trim();
}

function slugifyHeading(value = '') {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

function extractToc(markdown = '') {
  if (typeof markdown !== 'string' || markdown.trim().length === 0) return [];
  const lines = markdown.split('\n');
  const headings = [];

  for (const line of lines) {
    const match = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
    if (!match) continue;
    const level = match[1].length;
    const text = match[2].replace(/#+\s*$/, '').trim();
    if (!text) continue;
    headings.push({ level, text });
  }

  const seen = new Map();
  return headings.map((h) => {
    const base = slugifyHeading(h.text) || 'section';
    const count = (seen.get(base) || 0) + 1;
    seen.set(base, count);
    const id = count === 1 ? base : `${base}-${count}`;
    return { ...h, id };
  });
}

const AdUnit = memo(({ adsConfig, positionKey }) => {
  const placement = adsConfig?.placements?.[positionKey];
  if (!adsConfig?.adsenseEnabled || !adsConfig.clientId || !placement?.enabled || !placement?.slotId) return null;

  return (
    <div className="my-6 w-full flex justify-center overflow-hidden border border-white/10 rounded-xl bg-slate-900/20 p-2 relative min-h-[120px]">
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800/80 text-slate-400 font-mono text-xs z-10 border border-dashed border-green-500/50 rounded-lg m-2 backdrop-blur-sm">
          <span className="text-green-400 font-bold mb-1">Google AdSense Enabled</span>
          <span>Client: {adsConfig.clientId}</span>
          <span>Slot: {placement.slotId}</span>
          <span className="mt-2 text-[10px] text-slate-500">Position: {positionKey} ({placement.adType})</span>
        </div>
      )}
      <ins
        className="adsbygoogle"
        style={{ display: "block", width: "100%" }}
        data-ad-client={adsConfig.clientId}
        data-ad-slot={placement.slotId}
        data-ad-format={
            placement.adType === 'display' ? 'auto' :
            placement.adType === 'in-article' ? 'fluid' :
            placement.adType === 'in-feed' ? 'fluid' :
            placement.adType === 'multiplex' ? 'autorelaxed' : 'auto'
        }
        {...(placement.adType === 'in-article' ? { 'data-ad-layout': 'in-article' } : {})}
        {...(placement.adType === 'in-feed' ? { 'data-ad-layout-key': placement.adLayoutKey } : {})}
        {...(placement.adType === 'display' ? { 'data-full-width-responsive': 'true' } : {})}
        {...(process.env.NODE_ENV === 'development' ? { 'data-adtest': 'on' } : {})}
      ></ins>
      <Script id={`adsense-init-${positionKey}`} strategy="afterInteractive">
        {`(adsbygoogle = window.adsbygoogle || []).push({});`}
      </Script>
    </div>
  );
});

AdUnit.displayName = 'AdUnit';

export default memo(function BlogDetailClient({ blog, config, adsConfig }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [showShareToast, setShowShareToast] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [activeId, setActiveId] = useState('');

  const sanitizedContent = useMemo(() => stripH1Content(blog?.content), [blog?.content]);

  // Use useMemo to prevent re-extracting links on every render
  const extractedLinks = useMemo(() => {
    return extractLinksFromContent(sanitizedContent);
  }, [sanitizedContent]);

  // Memoize tag array
  const tags = useMemo(() => {
    return Array.isArray(blog?.tags) ? blog.tags : [];
  }, [blog?.tags]);

  const toc = useMemo(() => extractToc(sanitizedContent), [sanitizedContent]);
  const hasToc = toc.length >= 2;

  const authorName = useMemo(() => {
    return config?.authorName || config?.author || config?.name || 'Author';
  }, [config]);

  // Memoize image checks
  const hasImage = useMemo(() => Boolean(blog?.image && String(blog.image).trim() !== ''), [blog?.image]);
  const showPlaceholder = !hasImage || imageError;

  useEffect(() => {
    setImageError(false);
  }, [blog?.image]);

  useEffect(() => {
    if (!hasToc || toc.length === 0) return;

    const handleScroll = () => {
      const headingElements = toc.map(item => document.getElementById(item.id)).filter(Boolean);
      if (headingElements.length === 0) return;

      let currentActiveId = headingElements[0].id;
      for (const el of headingElements) {
        const bounds = el.getBoundingClientRect();
        if (bounds.top <= 200) {
          currentActiveId = el.id;
        } else {
          break;
        }
      }
      setActiveId(currentActiveId);
    };

    // Delay initial check slightly to ensure ReactMarkdown has painted the elements
    const timeoutId = setTimeout(handleScroll, 150);

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [toc, hasToc]); // Note: excluding activeId to prevent re-binding observer

  const handleShare = useCallback(async () => {
    if (typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    url.searchParams.set('utm_source', 'portfolio_share');
    url.searchParams.set('utm_medium', 'social');
    url.searchParams.set('utm_campaign', 'blog_share');

    try {
      await navigator.clipboard.writeText(url.toString());
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 2500);
    } catch (error) {
      console.error('Failed to copy blog URL', error);
    }
  }, []);

  const handleImageSelect = useCallback((image) => {
    setSelectedImage(image);
  }, []);

  const handleImageClose = useCallback(() => {
    setSelectedImage(null);
  }, []);

  const handleImageError = useCallback(async () => {
    setImageError(true);
    if (blog?._id) {
      try {
        await fetch(`/api/blogs/${blog._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: null })
        });
      } catch (error) {
        console.error('Failed to auto-cleanup broken image:', error);
      }
    }
  }, [blog?._id]);

  // We use a ref to track paragraph count during the synchronous ReactMarkdown render pass
  const pCountRef = React.useRef(0);
  pCountRef.current = 0; // Reset before every render of the markdown

  if (!blog) {
    return (
      <div className="min-h-screen p-4 lg:p-8">
        <div className="mx-auto max-w-3xl rounded-2xl border p-8 text-center"
          style={{
            borderColor: 'color-mix(in srgb, var(--border-secondary) 76%, transparent)',
            background:
              'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 94%, transparent), color-mix(in srgb, var(--bg-secondary) 94%, transparent))',
          }}
        >
          <h2 className="mb-3 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Blog Not Found
          </h2>
          <p className="mb-5" style={{ color: 'var(--text-secondary)' }}>
            This article might have been removed or is no longer available.
          </p>
          <Link
            href="/blogs"
            className="inline-flex items-center hover:underline gap-2 text-sm font-semibold"
            style={{ color: 'var(--accent-cyan)' }}
          >
            &larr; Back to Blogs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="blog-detail-container p-4 lg:p-8">
      <div className="blog-detail-backdrop" />

      <div className="relative mx-auto w-full max-w-[95%] lg:max-w-[80%] xl:max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/blogs"
            className="inline-flex items-center hover:underline gap-2 text-sm font-semibold"
            style={{ color: 'var(--text-secondary)' }}
          >
            &larr; Back to Blogs
          </Link>

          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-2 text-sm font-semibold hover:underline"
            style={{ color: 'var(--accent-cyan)' }}
          >
            {showShareToast ? <IoCheckmark className="h-4 w-4" /> : <FaShareAlt className="h-4 w-4" />}
            {showShareToast ? 'Copied' : 'Share'}
          </button>
        </div>

        {<AdUnit adsConfig={adsConfig} positionKey="top" />}

        <header className="mb-10 mt-6 text-center border-b pb-8" style={{ borderColor: 'var(--border-primary)' }}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <p
              className="inline-flex rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em]"
              style={{
                borderColor: 'color-mix(in srgb, var(--accent-cyan) 44%, var(--border-secondary))',
                color: 'var(--accent-cyan)',
              }}
            >
              Article
            </p>
            <RouteBetaBadge />
          </div>

          <h1 className="mb-4 text-4xl sm:text-5xl font-normal tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {blog.title}
          </h1>

          <div className="mb-4 flex flex-wrap items-center justify-center gap-4 text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>
            <span>{formatBlogDate(blog.date || blog.createdAt)}</span>
            <span>&bull;</span>
            <span>{getReadTime(sanitizedContent)}</span>
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={`${blog?._id}-${tag}`}
                  className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--accent-purple) 45%, var(--border-secondary))',
                    color: 'var(--accent-purple)',
                    backgroundColor: 'color-mix(in srgb, var(--accent-purple) 10%, transparent)',
                  }}
                >
                  <FaTag className="h-3 w-3" /> {tag}
                </span>
              ))}
            </div>
          )}
        </header>

        {!showPlaceholder && (
          <section
            className="mb-6 overflow-hidden rounded-2xl border"
            style={{
              borderColor: 'color-mix(in srgb, var(--border-secondary) 74%, transparent)',
              backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 82%, transparent)',
            }}
          >
            <button type="button" onClick={() => handleImageSelect(blog.image)} className="relative block w-full cursor-zoom-in" style={{ maxHeight: '620px' }}>
              <Image
                src={blog.image}
                alt={blog?.imageAlt || blog.title}
                fill
                className="object-cover"
                sizes="(max-width: 1200px) 95vw, 80vw"
                priority
                onError={handleImageError}
              />
            </button>
          </section>
        )}

        <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] items-start">
          <article className="min-w-0 w-full lg:pr-8">
            <div
              className="prose prose-lg lg:prose-xl max-w-none mt-6"
              style={{
                '--tw-prose-body': 'var(--text-primary)',
                '--tw-prose-headings': 'var(--text-bright)',
                '--tw-prose-links': 'var(--accent-cyan)',
                '--tw-prose-bold': 'var(--text-bright)',
                '--tw-prose-quotes': 'var(--text-secondary)',
                '--tw-prose-code': 'var(--accent-cyan)',
                '--tw-prose-pre-bg': 'var(--bg-elevated)',
                '--tw-prose-pre-code': 'var(--text-bright)',
              }}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  img: ({ src, alt, title, ...props }) => {
                    const resolvedSrc = typeof src === 'string' ? src : '';
                    const resolvedAlt = alt || title || 'Blog image';

                    if (!resolvedSrc) return null;

                    return (
                      <span
                        className="my-6 block overflow-hidden rounded-xl border"
                        style={{
                          borderColor: 'var(--border-secondary)',
                          backgroundColor: 'var(--bg-elevated)',
                        }}
                      >
                        <img
                          src={resolvedSrc}
                          alt={resolvedAlt}
                          className="h-auto w-full object-contain"
                          loading="lazy"
                          decoding="async"
                          {...props}
                        />
                      </span>
                    );
                  },
                  a: ({ className, href, children, ...props }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${className || ''} hover:underline`}
                      style={{ color: 'var(--accent-cyan)' }}
                      {...props}
                    >
                      {children}
                    </a>
                  ),
                  h2: ({ children, ...props }) => {
                    const text = Array.isArray(children) ? children.join('') : String(children || '');
                    const id = toc.find((entry) => entry.text === text)?.id || slugifyHeading(text);
                    return (
                      <h2 id={id} {...props}>
                        {children}
                      </h2>
                    );
                  },
                  h3: ({ children, ...props }) => {
                    const text = Array.isArray(children) ? children.join('') : String(children || '');
                    const id = toc.find((entry) => entry.text === text)?.id || slugifyHeading(text);
                    return (
                      <h3 id={id} {...props}>
                        {children}
                      </h3>
                    );
                  },
                  code({ inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <div className="my-6 overflow-hidden rounded-lg border" style={{ borderColor: 'var(--border-secondary)' }}>
                        <div
                          className="flex items-center justify-between gap-3 px-4 py-1 text-xs uppercase tracking-wide"
                          style={{
                            backgroundColor: 'var(--bg-elevated)',
                            color: 'var(--text-tertiary)',
                            borderBottom: '1px solid var(--border-secondary)',
                          }}
                        >
                          <span>{match[1]}</span>
                        </div>
                        <SyntaxHighlighter
                          style={vscDarkPlus}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{ margin: 0, borderRadius: 0 }}
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      </div>
                    ) : (
                      <code
                        className={className}
                        style={{
                          backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 85%, transparent)',
                          padding: '0.16em 0.45em',
                          borderRadius: '4px',
                        }}
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  p: ({ children, ...props }) => {
                    pCountRef.current += 1;
                    const showMiddleAd = pCountRef.current === 2 && adsConfig?.placements?.middle?.enabled;
                    
                    return (
                      <>
                        <p {...props}>{children}</p>
                        {showMiddleAd && (
                          <div className="not-prose my-8">
                            <AdUnit adsConfig={adsConfig} positionKey="middle" />
                          </div>
                        )}
                      </>
                    );
                  },
                  pre: ({ children }) => <>{children}</>,
                }}
              >
                {sanitizedContent}
              </ReactMarkdown>

              {blog?.isAutomated && (
                <div
                  className="mt-12 flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 rounded-2xl border relative overflow-hidden"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--accent-cyan) 20%, var(--border-secondary))',
                    backgroundColor: 'color-mix(in srgb, var(--accent-cyan) 3%, transparent)',
                  }}
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1"
                    style={{ backgroundColor: 'var(--accent-cyan)' }} />

                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--accent-cyan) 15%, transparent)',
                      color: 'var(--accent-cyan)'
                    }}
                  >
                    <FaBolt className="w-4 h-4 ml-[1px]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold mb-1 tracking-wide uppercase" style={{ color: 'var(--accent-cyan)' }}>
                      Automated Transmission
                    </p>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      This entry was synthesized and populated dynamically using native API integrations.
                    </p>
                  </div>
                </div>
              )}
            </div>
            {<AdUnit adsConfig={adsConfig} positionKey="bottom" />}
          </article>

          {hasToc ? (
            <aside className="hidden min-w-0 lg:block sticky top-24 self-start max-h-[calc(100vh-8rem)] overflow-y-auto scrollbar-hide">
              <div className="pt-4 pb-12 pr-4">
                <p className="mb-3 text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                  On this page
                </p>
                <nav className="space-y-2">
                  {toc.map((item) => {
                    const isActive = activeId === item.id;
                    return (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        className={`block py-1.5 text-sm transition-colors ${isActive ? 'font-semibold' : 'hover:underline'}`}
                        style={{
                          color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                          marginLeft: item.level === 3 ? 12 : 0,
                          paddingLeft: isActive ? '8px' : '0',
                          borderLeft: isActive ? '2px solid var(--accent-cyan)' : '0px solid transparent',
                        }}
                      >
                        {item.text}
                      </a>
                    );
                  })}
                </nav>
                {<div className="mt-8">
                    <AdUnit adsConfig={adsConfig} positionKey="sidebar" />
                  </div>}
              </div>
            </aside>
          ) : null}
        </div>

        {extractedLinks.length > 0 && (
          <section className="mt-8 rounded-2xl border p-5 sm:p-6"
            style={{
              borderColor: 'var(--border-secondary)',
              contentVisibility: 'auto',
              containIntrinsicSize: '1px 540px',
            }}
          >
            <h2 className="mb-5 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Resources & Links
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {extractedLinks.map((link) => (
                <LinkPreview key={link} url={link} />
              ))}
            </div>
          </section>
        )}
        
        {<AdUnit adsConfig={adsConfig} positionKey="footer" />}
      </div>

      {showShareToast && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          className="fixed bottom-6 right-6 z-50 rounded-lg border px-4 py-2 text-sm font-semibold"
          style={{
            borderColor: 'color-mix(in srgb, var(--accent-cyan) 48%, var(--border-secondary))',
            color: 'var(--accent-cyan)',
            backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 90%, transparent)',
          }}
        >
          Link copied to clipboard
        </motion.div>
      )}

      {selectedImage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleImageClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          style={{ backdropFilter: 'blur(4px)' }}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={handleImageClose}
              className="absolute -top-11 right-0 rounded-full border px-3 py-1 text-sm font-semibold"
              style={{
                borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
                color: 'var(--text-primary)',
                backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 85%, transparent)',
              }}
            >
              Close
            </button>
            <div className="relative h-[90vh] w-full">
              <Image
                src={selectedImage}
                alt="Blog full view"
                fill
                className="rounded-lg object-contain"
                sizes="90vw"
                priority
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
});
