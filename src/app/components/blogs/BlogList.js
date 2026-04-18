"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { BlogListPageSkeleton } from '../shared/skeletons/PublicPageSkeletons';
import BlogCard from './BlogCard';

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

  if (loading) {
    return <BlogListPageSkeleton />;
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8 bg-transparent transition-colors duration-200">
      <div className="mx-auto max-w-4xl">
        <header className="mb-10 text-center border-b pb-8" style={{ borderColor: 'var(--border-primary)' }}>
          <h1 className="text-4xl sm:text-5xl font-normal tracking-tight mb-3" style={{ color: 'var(--text-primary)' }}>
            {config?.blogsTitle || 'The Blogger'}
          </h1>
          <p className="text-base sm:text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            {config?.blogsSubtitle || 'Insights, stories and updates.'}
          </p>
        </header>

        <div className="mb-12 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search posts..."
              className="w-full rounded-md border py-2.5 px-4 text-sm outline-none transition-colors"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-secondary)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
          <div className="w-full sm:w-auto">
            <select
              value={selectedTag}
              onChange={(event) => setSelectedTag(event.target.value)}
              className="w-full sm:w-48 rounded-md border py-2.5 px-3 text-sm font-medium outline-none transition-colors appearance-none cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-secondary)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="All">All Categories</option>
              {allTags.filter(tag => tag !== 'All').map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>
        </div>

        <main>
          {filteredBlogs.length > 0 ? (
            <div className="flex flex-col gap-0">
              {filteredBlogs.map((blog) => (
                <BlogCard key={blog?._id || blog?.slug} blog={blog} />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center">
              <h3 className="text-2xl font-normal mb-2" style={{ color: 'var(--text-primary)' }}>No posts found</h3>
              <p className="text-base" style={{ color: 'var(--text-secondary)' }}>Try another search term or tag.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

