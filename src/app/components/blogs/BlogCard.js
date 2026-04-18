"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import {
  formatBlogDate,
  generateSlug,
  getReadTime,
  stripMarkdown,
} from './blogUtils';

const BlogCard = ({ blog }) => {
  const [failedImageSrc, setFailedImageSrc] = useState('');

  const cleanExcerpt = blog?.excerpt?.trim() || stripMarkdown(blog?.content || '');
  const excerpt = cleanExcerpt.length > 200
    ? `${cleanExcerpt.slice(0, 200)}...`
    : cleanExcerpt;

  const tags = Array.isArray(blog?.tags) ? blog.tags : [];
  const hasImage = Boolean(blog?.image && String(blog.image).trim() !== '');
  const showPlaceholder = !hasImage || failedImageSrc === blog?.image;
  const blogPath = `/blogs/${blog?.slug || generateSlug(blog?.title) || blog?._id}`;

  return (
    <article className="border-b pb-8 mb-8" style={{ borderColor: 'var(--border-primary)' }}>
      <header className="mb-2">
        <h3 className="text-2xl sm:text-3xl font-normal leading-snug mb-1" style={{ color: 'var(--text-primary)' }}>
          <Link href={blogPath} className="hover:underline">
            {blog?.title}
          </Link>
        </h3>
        <div className="text-sm font-medium flex flex-wrap items-center gap-3" style={{ color: 'var(--text-tertiary)' }}>
          <span>{formatBlogDate(blog?.date || blog?.createdAt)}</span>
          {tags.length > 0 && (
            <div className="flex gap-2">
               <span>&bull;</span>
              {tags.slice(0, 3).map((tag) => (
                <span key={`${blog?._id}-${tag}`} style={{ color: 'var(--text-tertiary)' }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-col sm:flex-row gap-6 mt-4">
        {!showPlaceholder && (
          <div className="sm:w-1/3 flex-shrink-0">
             <Link href={blogPath}>
               <img
                  src={blog.image}
                  alt={blog?.imageAlt || blog?.title || 'Blog'}
                  className="w-full h-auto object-cover border"
                  style={{ borderColor: 'var(--border-secondary)' }}
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
        <div className="flex-1">
          <p className="text-base leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
            {excerpt || 'Open the article to read the full write-up.'}
          </p>
          <Link
            href={blogPath}
            className="text-sm font-bold uppercase tracking-wide hover:underline"
            style={{ color: 'var(--accent-cyan)' }}
          >
            Read more
          </Link>
        </div>
      </div>
    </article>
  );
};

export default BlogCard;

