"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import {
  formatBlogDate,
  getReadTime,
  stripMarkdown,
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
    <article className="border-b pb-8 mb-8 group" style={{ borderColor: 'var(--border-primary)' }}>
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {!showPlaceholder && (
          <div className="w-full md:w-56 h-36 flex-shrink-0 rounded-xl overflow-hidden border relative" style={{ borderColor: 'var(--border-secondary)' }}>
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
        )}
        <div className="flex-1 min-w-0">
          <header className="mb-2">
            <h3 className="text-xl sm:text-2xl font-bold leading-snug mb-2 group-hover:text-[var(--accent-cyan)] transition-colors duration-200">
              <Link href={blogPath} className="hover:underline text-[var(--text-bright)]">
                {blog?.title}
              </Link>
            </h3>
            
            <div className="text-xs font-medium flex flex-wrap items-center gap-3 mb-3 text-[var(--text-tertiary)] font-mono">
              <span>{formatBlogDate(blog?.date || blog?.createdAt)}</span>
              <span>&bull;</span>
              <span>{getReadTime(blog?.content || '')}</span>
            </div>
          </header>

          <p className="text-sm leading-relaxed mb-4 text-[var(--text-secondary)]">
            {excerpt || 'Open the article to read the full write-up.'}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-4 mt-2">
            <Link
              href={blogPath}
              className="text-xs font-bold uppercase tracking-wider hover:text-[var(--accent-cyan-bright)] transition-colors inline-flex items-center gap-1.5"
              style={{ color: 'var(--accent-cyan)' }}
            >
              Read Article &rarr;
            </Link>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.slice(0, 3).map((tag) => (
                  <span
                    key={`${blog?._id}-${tag}`}
                    className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-wide border"
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
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

export default BlogCard;
