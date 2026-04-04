"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FaFilter, FaNewspaper, FaSearch, FaTags } from 'react-icons/fa';
import BlogCard from './BlogCard';
import { formatBlogDate } from './blogUtils';
import { BlogListPageSkeleton } from '../shared/skeletons/PublicPageSkeletons';
import RouteBetaBadge from '../shared/RouteBetaBadge';

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

const BlogList = ({ initialBlogs, initialConfig }) => {
  const hasInitialData = initialBlogs !== undefined || initialConfig !== undefined;
  const [blogs, setBlogs] = useState(Array.isArray(initialBlogs) ? initialBlogs : []);
  const [loading, setLoading] = useState(!hasInitialData);
  const [config, setConfig] = useState(initialConfig ?? null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');

  useEffect(() => {
    if (hasInitialData) {
      return;
    }

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
        if (isMounted) {
          setLoading(false);
        }
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

        const searchText = [blog?.title, blog?.content, blog?.date, ...tags]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        const matchesSearch = !normalizedQuery || searchText.includes(normalizedQuery);
        const matchesTag = selectedTag === 'All' || tags.includes(selectedTag);

        return matchesSearch && matchesTag;
      })
      .sort((a, b) => getBlogPublishTimestamp(b) - getBlogPublishTimestamp(a));
  }, [blogs, searchQuery, selectedTag]);

  const activeFilters = [
    selectedTag !== 'All' ? `Tag: ${selectedTag}` : null,
    searchQuery.trim().length > 0 ? `Search: ${searchQuery.trim()}` : null,
  ].filter(Boolean);

  const featuredBlog = filteredBlogs[0] || null;
  const remainingBlogs = featuredBlog ? filteredBlogs.slice(1) : [];

  const latestDate = useMemo(() => {
    if (blogs.length === 0) return 'N/A';
    const latestBlog = [...blogs].sort((a, b) => getBlogPublishTimestamp(b) - getBlogPublishTimestamp(a))[0];
    return formatBlogDate(latestBlog?.date || latestBlog?.createdAt);
  }, [blogs]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedTag('All');
  };

  if (loading) {
    return <BlogListPageSkeleton />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className="relative min-h-screen overflow-hidden p-4 lg:p-8"
      style={{
        backgroundColor: 'transparent',
        color: 'var(--text-primary)',
      }}
    >
      <div
        className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--accent-cyan) 30%, transparent), transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute -right-20 top-1/4 h-64 w-64 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--accent-purple) 25%, transparent), transparent 70%)' }}
      />

      <div className="relative mx-auto max-w-6xl">
        <section
          className="rounded-3xl border p-6 sm:p-8"
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
                borderColor: 'color-mix(in srgb, var(--accent-cyan) 42%, var(--border-secondary))',
                color: 'var(--accent-cyan)',
              }}
            >
              Writing Hub
            </p>
            <RouteBetaBadge />
          </div>

          <h1
            className="mb-3 bg-linear-to-r bg-clip-text text-4xl font-bold text-transparent sm:text-5xl lg:text-6xl"
            style={{
              backgroundImage: 'linear-gradient(to right, var(--accent-cyan), var(--accent-purple), var(--accent-pink))',
            }}
          >
            {config?.blogsTitle || 'Latest Insights'}
          </h1>

          <p className="max-w-2xl text-base sm:text-lg" style={{ color: 'var(--text-secondary)' }}>
            {config?.blogsSubtitle || 'Thoughts, tutorials, and updates on development, systems, and tooling.'}
          </p>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: 'Published Posts', value: blogs.length, icon: FaNewspaper, accent: 'var(--accent-cyan)' },
              { label: 'Unique Tags', value: Math.max(0, allTags.length - 1), icon: FaTags, accent: 'var(--accent-purple)' },
              { label: 'Latest Publish', value: latestDate, icon: FaFilter, accent: 'var(--accent-orange)' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="rounded-xl border p-3"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)',
                    backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 82%, transparent)',
                  }}
                >
                  <div className="mb-2 inline-flex rounded-lg p-2" style={{ backgroundColor: `color-mix(in srgb, ${item.accent} 14%, transparent)` }}>
                    <Icon size={14} style={{ color: item.accent }} />
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.label}</p>
                  <p className="text-base font-semibold sm:text-lg" style={{ color: 'var(--text-primary)' }}>{item.value}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section
          className="mt-6 rounded-2xl border p-4 sm:p-5"
          style={{
            background:
              'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 94%, transparent), color-mix(in srgb, var(--bg-secondary) 94%, transparent))',
            borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
          }}
        >
          <div className="mb-4">
            <label htmlFor="blog-search" className="mb-2 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Search Blogs
            </label>
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-tertiary)' }} />
              <input
                id="blog-search"
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by title, tag, content"
                className="w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm focus:outline-none"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 80%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            {allTags.map((tag) => {
              const isActive = selectedTag === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(tag)}
                  className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide"
                  style={{
                    borderColor: isActive
                      ? 'color-mix(in srgb, var(--accent-cyan) 55%, var(--border-secondary))'
                      : 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
                    color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    backgroundColor: isActive
                      ? 'color-mix(in srgb, var(--accent-cyan) 11%, transparent)'
                      : 'color-mix(in srgb, var(--bg-elevated) 80%, transparent)',
                  }}
                >
                  {tag}
                </button>
              );
            })}

            <button
              type="button"
              onClick={resetFilters}
              className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide"
              style={{
                borderColor: 'color-mix(in srgb, var(--accent-orange) 50%, var(--border-secondary))',
                color: 'var(--accent-orange)',
                backgroundColor: 'color-mix(in srgb, var(--accent-orange) 10%, transparent)',
              }}
            >
              Reset
            </button>
          </div>

          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {activeFilters.map((filter) => (
                <span
                  key={filter}
                  className="rounded-full border px-3 py-1 text-xs font-semibold"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--accent-purple) 45%, var(--border-secondary))',
                    color: 'var(--accent-purple)',
                    backgroundColor: 'color-mix(in srgb, var(--accent-purple) 10%, transparent)',
                  }}
                >
                  {filter}
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8">
          {filteredBlogs.length > 0 ? (
            <>
              {featuredBlog && (
                <div className="mb-6">
                  <BlogCard blog={featuredBlog} featured />
                </div>
              )}

              {remainingBlogs.length > 0 && (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {remainingBlogs.map((blog) => (
                    <BlogCard key={blog?._id} blog={blog} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div
              className="rounded-2xl border p-10 text-center"
              style={{
                background:
                  'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 94%, transparent), color-mix(in srgb, var(--bg-secondary) 94%, transparent))',
                borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
              }}
            >
              <h3 className="mb-2 text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                No Blogs Match The Current Filters
              </h3>
              <p style={{ color: 'var(--text-secondary)' }}>
                Try adjusting search terms or selecting another tag.
              </p>
            </div>
          )}
        </section>
      </div>
    </motion.div>
  );
};

export default BlogList;
