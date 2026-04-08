"use client";

import React, { useEffect, useState, useMemo, memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import dynamic from 'next/dynamic';
import { FaArrowLeft, FaCalendarAlt, FaClock, FaShareAlt, FaTag } from 'react-icons/fa';
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
  { ssr: false }
);

const isOptimizableImage = (src) =>
  typeof src === 'string' && (src.startsWith('/') || src.startsWith('https://'));

export default memo(function BlogDetailClient({ blog }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [showShareToast, setShowShareToast] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Use useMemo to prevent re-extracting links on every render
  const extractedLinks = useMemo(() => {
    return extractLinksFromContent(blog?.content);
  }, [blog?.content]);

  useEffect(() => {
    setImageError(false);
  }, [blog?.image]);

  const handleShare = async () => {
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
  };

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
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold"
            style={{
              borderColor: 'var(--accent-cyan)',
              color: 'var(--accent-cyan)',
              backgroundColor: 'color-mix(in srgb, var(--accent-cyan) 10%, transparent)',
            }}
          >
            <FaArrowLeft className="h-3.5 w-3.5" /> Back to Blogs
          </Link>
        </div>
      </div>
    );
  }

  const tags = Array.isArray(blog?.tags) ? blog.tags : [];
  const hasImage = Boolean(blog?.image && String(blog.image).trim() !== '');
  const showPlaceholder = !hasImage || imageError;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className="blog-detail-container p-4 lg:p-8"
    >
      <div className="blog-detail-backdrop" />

      <div className="relative mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/blogs"
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold"
            style={{
              borderColor: 'color-mix(in srgb, var(--border-secondary) 76%, transparent)',
              color: 'var(--text-secondary)',
              backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 80%, transparent)',
            }}
          >
            <FaArrowLeft className="h-3.5 w-3.5" /> Back to Blogs
          </Link>

          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold"
            style={{
              borderColor: 'var(--accent-cyan)',
              color: 'var(--accent-cyan)',
              backgroundColor: 'color-mix(in srgb, var(--accent-cyan) 10%, transparent)',
            }}
          >
            {showShareToast ? <IoCheckmark className="h-4 w-4" /> : <FaShareAlt className="h-4 w-4" />}
            {showShareToast ? 'Copied' : 'Share'}
          </button>
        </div>

        <header
          className="mb-6 rounded-3xl border p-6 sm:p-8"
          style={{
            background:
              'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 93%, transparent), color-mix(in srgb, var(--bg-secondary) 93%, transparent))',
            borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
            boxShadow: '0 16px 36px var(--shadow-sm)',
          }}
        >
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

          <h1
            className="mb-4 bg-gradient-to-r bg-clip-text text-3xl font-bold text-transparent sm:text-4xl lg:text-5xl"
            style={{
              backgroundImage: 'linear-gradient(to right, var(--accent-cyan), var(--accent-purple), var(--accent-pink))',
            }}
          >
            {blog.title}
          </h1>

          <div className="mb-4 flex flex-wrap items-center gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span className="inline-flex items-center gap-2"><FaCalendarAlt /> {formatBlogDate(blog.date || blog.createdAt)}</span>
            <span className="inline-flex items-center gap-2"><FaClock /> {getReadTime(blog.content)}</span>
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

        <section
          className="mb-6 overflow-hidden rounded-2xl border"
          style={{
            borderColor: 'color-mix(in srgb, var(--border-secondary) 74%, transparent)',
            backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 82%, transparent)',
          }}
        >
          {!showPlaceholder ? (
            <button type="button" onClick={() => setSelectedImage(blog.image)} className="block w-full cursor-zoom-in">
              {isOptimizableImage(blog.image) ? (
                <Image
                  src={blog.image}
                  alt={blog.title}
                  width={1600}
                  height={900}
                  sizes="(max-width: 1024px) 100vw, 1200px"
                  className="max-h-[620px] w-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <img
                  src={blog.image}
                  alt={blog.title}
                  className="max-h-[620px] w-full object-cover"
                  loading="lazy"
                  decoding="async"
                  onError={() => setImageError(true)}
                />
              )}
            </button>
          ) : (
            <div
              className="relative flex min-h-[260px] items-center justify-center overflow-hidden"
              style={{ backgroundImage: getBlogPlaceholderGradient(blog.title) }}
            >
              <div className="absolute inset-0"
                style={{
                  backgroundImage:
                    'linear-gradient(color-mix(in srgb, var(--border-secondary) 24%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--border-secondary) 24%, transparent) 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                  opacity: 0.35,
                }}
              />
              <div className="relative z-10 rounded-xl border px-5 py-2 text-2xl font-bold"
                style={{
                  borderColor: 'color-mix(in srgb, var(--border-secondary) 74%, transparent)',
                  color: 'var(--text-bright)',
                  backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 72%, transparent)',
                }}
              >
                {getBlogInitials(blog.title)}
              </div>
            </div>
          )}
        </section>

        <article
          className="rounded-2xl border p-5 sm:p-8"
          style={{
            background:
              'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 95%, transparent), color-mix(in srgb, var(--bg-secondary) 95%, transparent))',
            borderColor: 'color-mix(in srgb, var(--border-secondary) 74%, transparent)',
            contentVisibility: 'auto',
            containIntrinsicSize: '1px 1400px',
          }}
        >
          <div
            className="prose prose-lg max-w-none prose-invert"
            style={{
              color: 'var(--text-secondary)',
              '--tw-prose-headings': 'var(--text-primary)',
              '--tw-prose-links': 'var(--accent-cyan)',
              '--tw-prose-bold': 'var(--text-primary)',
              '--tw-prose-quotes': 'var(--text-secondary)',
              '--tw-prose-code': 'var(--accent-cyan)',
              '--tw-prose-pre-bg': 'color-mix(in srgb, var(--bg-elevated) 90%, transparent)',
              '--tw-prose-pre-code': 'var(--text-secondary)',
            }}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
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
                code({ inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <div className="my-6 overflow-hidden rounded-lg border" style={{ borderColor: 'color-mix(in srgb, var(--border-secondary) 70%, transparent)' }}>
                      <div
                        className="px-4 py-1 text-xs uppercase tracking-wide"
                        style={{
                          backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 90%, transparent)',
                          color: 'var(--text-tertiary)',
                          borderBottom: '1px solid color-mix(in srgb, var(--border-secondary) 70%, transparent)',
                        }}
                      >
                        {match[1]}
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
                pre: ({ children }) => <>{children}</>,
              }}
            >
              {blog.content}
            </ReactMarkdown>
          </div>
        </article>

        {extractedLinks.length > 0 && (
          <section className="mt-8 rounded-2xl border p-5 sm:p-6"
            style={{
              borderColor: 'color-mix(in srgb, var(--border-secondary) 74%, transparent)',
              background:
                'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 94%, transparent), color-mix(in srgb, var(--bg-secondary) 94%, transparent))',
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
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="absolute -top-11 right-0 rounded-full border px-3 py-1 text-sm font-semibold"
              style={{
                borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
                color: 'var(--text-primary)',
                backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 85%, transparent)',
              }}
            >
              Close
            </button>
            {isOptimizableImage(selectedImage) ? (
              <Image
                src={selectedImage}
                alt="Blog full view"
                width={1800}
                height={1200}
                sizes="90vw"
                className="max-h-[90vh] max-w-full rounded-lg object-contain"
              />
            ) : (
              <img src={selectedImage} alt="Blog full view" className="max-h-[90vh] max-w-full rounded-lg object-contain" />
            )}
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
});
