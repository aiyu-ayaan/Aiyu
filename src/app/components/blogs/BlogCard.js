"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { FaArrowRight, FaClock } from 'react-icons/fa';
import {
  formatBlogDate,
  getBlogInitials,
  getBlogPlaceholderGradient,
  getReadTime,
  stripMarkdown,
} from './blogUtils';

const BlogCard = ({ blog, featured = false }) => {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [blog?.image]);

  const cleanExcerpt = stripMarkdown(blog?.content || '');
  const excerpt = cleanExcerpt.length > (featured ? 240 : 140)
    ? `${cleanExcerpt.slice(0, featured ? 240 : 140)}...`
    : cleanExcerpt;

  const tags = Array.isArray(blog?.tags) ? blog.tags : [];
  const hasImage = Boolean(blog?.image && String(blog.image).trim() !== '');
  const showPlaceholder = !hasImage || imageError;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.35 }}
      className="group relative overflow-hidden rounded-2xl border"
      style={{
        borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
        background:
          'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 95%, transparent), color-mix(in srgb, var(--bg-secondary) 95%, transparent))',
        boxShadow: '0 14px 28px var(--shadow-sm)',
      }}
    >
      <div className="relative h-48 overflow-hidden border-b" style={{ borderColor: 'color-mix(in srgb, var(--border-secondary) 70%, transparent)' }}>
        {!showPlaceholder ? (
          <img
            src={blog.image}
            alt={blog?.title || 'Blog'}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        ) : (
          <div
            className="relative flex h-full w-full items-center justify-center overflow-hidden"
            style={{ backgroundImage: getBlogPlaceholderGradient(blog?.title) }}
          >
            <div className="absolute inset-0"
              style={{
                backgroundImage:
                  'linear-gradient(color-mix(in srgb, var(--border-secondary) 24%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--border-secondary) 24%, transparent) 1px, transparent 1px)',
                backgroundSize: '22px 22px',
                opacity: 0.35,
              }}
            />
            <div className="relative z-10 rounded-xl border px-4 py-2 text-lg font-bold"
              style={{
                borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)',
                color: 'var(--text-bright)',
                backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 70%, transparent)',
              }}
            >
              {getBlogInitials(blog?.title)}
            </div>
          </div>
        )}
      </div>

      <div className="p-5 sm:p-6">
        <div className="mb-3 flex items-center justify-between gap-2 text-xs sm:text-sm" style={{ color: 'var(--text-tertiary)' }}>
          <span>{formatBlogDate(blog?.date || blog?.createdAt)}</span>
          <span className="inline-flex items-center gap-1">
            <FaClock className="h-3 w-3" />
            {getReadTime(blog?.content)}
          </span>
        </div>

        <h3 className="mb-3 text-xl font-bold leading-snug" style={{ color: 'var(--text-primary)' }}>
          {blog?.title}
        </h3>

        <p className="mb-4 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {excerpt || 'Open the article to read the full write-up.'}
        </p>

        {tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {tags.slice(0, featured ? 4 : 3).map((tag) => (
              <span
                key={`${blog?._id}-${tag}`}
                className="rounded-md border px-2 py-1 text-[11px] font-semibold"
                style={{
                  borderColor: 'color-mix(in srgb, var(--accent-purple) 45%, var(--border-secondary))',
                  color: 'var(--accent-purple)',
                  backgroundColor: 'color-mix(in srgb, var(--accent-purple) 10%, transparent)',
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        <Link
          href={`/blogs/${blog?._id}`}
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold"
          style={{
            borderColor: 'var(--accent-cyan)',
            color: 'var(--accent-cyan)',
            backgroundColor: 'color-mix(in srgb, var(--accent-cyan) 10%, transparent)',
          }}
        >
          Read Story <FaArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </motion.article>
  );
};

export default BlogCard;
