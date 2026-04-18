"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FaNewspaper, FaSearch, FaTags } from 'react-icons/fa';
import BlogCard from './BlogCard';
import { formatBlogDate } from './blogUtils';
import { BlogListPageSkeleton } from '../shared/skeletons/PublicPageSkeletons';

const getBlogPublishTimestamp = (blog) => {
  const primaryDate = blog?.date ? new Date(blog.date) : null;
  if (primaryDate && !Number.isNaN(primaryDate.getTime())) {
    return primaryDate.getTime();
  }

  const fallbackDate = blog?.createdAt ? new Date(blog.createdAt) : null;
  if (fallbackDate && !Number.isNaN(fallbackDate.getTime())) {
    return fallbackDate.getTime();
  }

  return 0;
};

export default function BlogList({ initialBlogs, initialConfig }) {
  const hasInitialData = initialBlogs !== undefined || initialConfig !== undefined;
  const [blogs, setBlogs] = useState(Array.isArray(initialBlogs) ? initialBlogs : []);
  const [loading, setLoading] = useState(!hasInitialData);
  const [config, setConfig] = useState(initialConfig ?? null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');

  useEffect(() => {
    if (hasInitialData) return;

    let isMounted = true;

    const fetchBlogs = async () => {
      try {
        const [blogsRes, configRes] = await Promise.all([fetch('/api/blogs'), fetch('/api/config')]);

        const blogsPayload = await blogsRes.json();
        if (isMounted && blogsPayload?.success) {
          setBlogs(Array.isArray(blogsPayload.data) ? blogsPayload.data : []);
        }

        if (isMounted && configRes.ok) {
          const configPayload = await configRes.json();
          setConfig(configPayload);
        }
      } catch (error) {
        console.error('Failed to fetch blog data:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchBlogs();
    return () => {
      isMounted = false;
    };
  }, [hasInitialData]);

  const allTags = useMemo(() => {
    const tagSet = new Set();
    blogs.forEach((blog) => {
      (Array.isArray(blog?.tags) ? blog.tags : []).forEach((tag) => tagSet.add(tag));
    });

    return ['All', ...Array.from(tagSet).sort((a, b) => a.localeCompare(b))];
  }, [blogs]);

  const filteredBlogs = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return [...blogs]
      .filter((blog) => {
        const tags = Array.isArray(blog?.tags) ? blog.tags : [];
        const searchText = [blog?.title, blog?.excerpt, blog?.content, ...tags]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        const matchesSearch = !normalizedQuery || searchText.includes(normalizedQuery);
        const matchesTag = selectedTag === 'All' || tags.includes(selectedTag);

        return matchesSearch && matchesTag;
      })
      .sort((a, b) => getBlogPublishTimestamp(b) - getBlogPublishTimestamp(a));
  }, [blogs, searchQuery, selectedTag]);

  const latestDate = useMemo(() => {
    if (blogs.length === 0) return 'N/A';
    const latestBlog = [...blogs].sort((a, b) => getBlogPublishTimestamp(b) - getBlogPublishTimestamp(a))[0];
    return formatBlogDate(latestBlog?.date || latestBlog?.createdAt);
  }, [blogs]);

  if (loading) {
    return <BlogListPageSkeleton />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="px-4 py-6 sm:px-6 sm:py-8"
    >
      <div className="mx-auto max-w-6xl">
        <section className="rounded-2xl border p-5 sm:p-7" style={{ borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)', backgroundColor: 'color-mix(in srgb, var(--bg-surface) 95%, transparent)' }}>
          <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-tertiary)' }}>
            Blog
          </p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl" style={{ color: 'var(--text-primary)' }}>
            {config?.blogsTitle || 'Latest Posts'}
          </h1>
          <p className="mt-2 max-w-2xl text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            {config?.blogsSubtitle || 'Articles, notes, and tutorials.'}
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: 'Posts', value: blogs.length, icon: FaNewspaper },
              { label: 'Tags', value: Math.max(0, allTags.length - 1), icon: FaTags },
              { label: 'Latest', value: latestDate, icon: FaNewspaper },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-lg border px-4 py-3" style={{ borderColor: 'color-mix(in srgb, var(--border-secondary) 70%, transparent)', backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 80%, transparent)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{item.label}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Icon size={12} style={{ color: 'var(--text-secondary)' }} />
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{item.value}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-4 rounded-2xl border p-4" style={{ borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)', backgroundColor: 'color-mix(in srgb, var(--bg-surface) 95%, transparent)' }}>
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search blog posts"
              className="w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm outline-none"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 80%, transparent)',
                borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {allTags.map((tag) => {
              const active = selectedTag === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(tag)}
                  className="rounded-full border px-3 py-1.5 text-xs font-medium"
                  style={{
                    borderColor: active ? 'color-mix(in srgb, var(--accent-cyan) 58%, var(--border-secondary))' : 'color-mix(in srgb, var(--border-secondary) 74%, transparent)',
                    color: active ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    backgroundColor: active ? 'color-mix(in srgb, var(--accent-cyan) 10%, transparent)' : 'color-mix(in srgb, var(--bg-elevated) 75%, transparent)',
                  }}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-6">
          {filteredBlogs.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filteredBlogs.map((blog) => (
                <BlogCard key={blog?._id || blog?.slug} blog={blog} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border p-10 text-center" style={{ borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)', backgroundColor: 'color-mix(in srgb, var(--bg-surface) 95%, transparent)' }}>
              <h3 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>No posts found</h3>
              <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Try another search term or tag.</p>
            </div>
          )}
        </section>
      </div>
    </motion.div>
  );
}
