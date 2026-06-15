"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import {
  formatBlogDate,
  getReadTime,
  stripMarkdown,
  getBlogPlaceholderGradient,
  getBlogInitials,
} from './blogUtils';
import { getBlogPath } from '@/lib/publicPaths';

const BlogCard = ({ blog }) => {
  const [failedImageSrc, setFailedImageSrc] = useState('');

  const cleanExcerpt = blog?.excerpt?.trim() || stripMarkdown(blog?.content || '');
  const excerpt = cleanExcerpt.length > 200
    ? `${cleanExcerpt.slice(0, 200)}...`
    : cleanExcerpt;

  const tags = Array.isArray(blog?.tags) ? blog.tags : [];
  const hasImage = Boolean(blog?.image && String(blog.image).trim() !== '');
  const showPlaceholder = !hasImage || failedImageSrc === blog?.image;
  const blogPath = getBlogPath(blog);

  return (
    <article
      className="glass-tile hscroll-panel group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-[1.625rem] border"
      style={{
        borderColor: 'var(--hairline)',
        background: 'linear-gradient(180deg, color-mix(in srgb, var(--bg-surface) 62%, transparent), color-mix(in srgb, var(--bg-secondary) 55%, transparent))',
        backdropFilter: 'blur(14px)',
      }}
    >
      {!showPlaceholder ? (
        <div className="relative h-52 w-full overflow-hidden border-b" style={{ borderColor: 'var(--hairline)' }}>
          <Link href={blogPath} className="block w-full h-full">
            <img
              src={blog.image}
              alt={blog?.imageAlt || blog?.title || 'Blog'}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
              decoding="async"
              onError={async () => {
                setFailedImageSrc(blog?.image || '');
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
              }}
            />
          </Link>
        </div>
      ) : (
        <div
          className="relative flex h-52 w-full items-center justify-center overflow-hidden border-b"
          style={{
            borderColor: 'var(--hairline)',
            backgroundImage: getBlogPlaceholderGradient?.(blog?.title) || 'var(--surface-tile)',
          }}
        >
          <div
            className="absolute -left-8 -top-8 h-28 w-28 rounded-full blur-2xl"
            style={{ background: 'color-mix(in srgb, var(--accent-cyan) 18%, transparent)' }}
          />
          <div
            className="absolute -bottom-8 -right-8 h-28 w-28 rounded-full blur-2xl"
            style={{ background: 'color-mix(in srgb, var(--accent-purple) 18%, transparent)' }}
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(color-mix(in srgb, var(--border-secondary) 24%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--border-secondary) 24%, transparent) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
              opacity: 0.35,
            }}
          />
          <div className="relative z-10 flex items-center justify-center px-4 text-center">
            <div
              className="rounded-xl border px-3 py-1 text-lg font-bold tracking-wide"
              style={{
                borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)',
                color: 'var(--text-bright)',
                backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 70%, transparent)',
              }}
            >
              {getBlogInitials?.(blog?.title) || 'BL'}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        <header className="mb-2">
          <div className="mb-2 flex flex-wrap items-center gap-3 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
            <span>{formatBlogDate(blog?.date || blog?.createdAt)}</span>
            <span>&bull;</span>
            <span>{getReadTime(blog?.content || '')}</span>
          </div>

          <h3 className="mb-2 text-xl font-semibold leading-tight tracking-tight">
            <Link href={blogPath} className="text-[var(--text-bright)] transition-colors hover:text-[var(--accent-cyan)] line-clamp-2">
              {blog?.title}
            </Link>
          </h3>
        </header>

        <p className="mb-4 text-sm leading-relaxed text-[var(--text-secondary)] line-clamp-3">
          {excerpt || 'Open the article to read the full write-up.'}
        </p>

        <div className="mt-auto flex flex-col gap-3 pt-2">
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={`${blog?._id}-${tag}`}
                className="inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-medium tracking-wide"
                style={{
                  borderColor: 'color-mix(in srgb, var(--accent-purple) 25%, var(--border-secondary))',
                  color: 'var(--accent-purple)',
                  backgroundColor: 'color-mix(in srgb, var(--accent-purple) 5%, transparent)',
                }}
              >
                {tag.toUpperCase()}
              </span>
            ))}
          </div>

          <div className="border-t pt-3 flex items-center justify-between" style={{ borderColor: 'var(--hairline)' }}>
            <Link
              href={blogPath}
              className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--accent-cyan)] transition-colors hover:text-[var(--accent-cyan-bright)]"
            >
              Read Article &rarr;
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
};

export default BlogCard;
