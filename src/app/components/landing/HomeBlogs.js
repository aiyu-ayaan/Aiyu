"use client";

import React, { useMemo, useRef } from 'react';
import Link from 'next/link';
import { FaArrowRight, FaCalendarAlt, FaPenNib } from 'react-icons/fa';
import { getReadTime } from '../blogs/blogUtils';
import { getBlogPath } from '@/lib/publicPaths';
import useDevicePerformance from '../../hooks/useDevicePerformance';
import { useSectionFx } from '../shared/gsapScroll';

const HomeBlogs = ({ blogs }) => {
  const sectionRef = useRef(null);
  const { prefersReducedMotion } = useDevicePerformance();

  const sortedBlogs = useMemo(() => {
    const safeBlogs = Array.isArray(blogs) ? blogs : [];
    return [...safeBlogs].sort((a, b) => new Date(b?.createdAt || b?.date || 0) - new Date(a?.createdAt || a?.date || 0));
  }, [blogs]);

  const recentBlogs = sortedBlogs.slice(0, 3);

  useSectionFx(sectionRef, { reducedMotion: prefersReducedMotion });

  if (recentBlogs.length === 0) return null;

  return (
    <section ref={sectionRef} className="relative px-4 py-14 sm:px-6 lg:py-20" style={{ perspective: '1400px' }}>
      <div
        data-parallax="-0.25"
        className="pointer-events-none absolute left-10 top-16 h-44 w-44 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--accent-cyan) 25%, transparent), transparent 70%)' }}
      />

      <div
        data-reveal="tilt"
        className="relative mx-auto w-full max-w-[95%] lg:max-w-[80%] rounded-3xl border p-6 sm:p-8"
        style={{
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 92%, transparent), color-mix(in srgb, var(--bg-secondary) 92%, transparent))',
          borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
          boxShadow: '0 16px 36px var(--shadow-sm)',
        }}
      >
        <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div data-reveal="rise">
            <p className="mb-2 inline-flex rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em]"
              style={{
                borderColor: 'color-mix(in srgb, var(--accent-purple) 45%, var(--border-secondary))',
                color: 'var(--accent-purple)',
              }}
            >
              Writing Desk
            </p>
            <h2 className="text-3xl font-bold sm:text-4xl" style={{ color: 'var(--text-primary)' }}>
              Recent Writings
            </h2>
            <p className="mt-2 max-w-2xl text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
              Practical notes, tutorials, and reflections from projects and day-to-day engineering.
            </p>
          </div>

          <Link
            href="/blogs"
            data-reveal="flip-right"
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold"
            style={{
              borderColor: 'var(--accent-cyan)',
              color: 'var(--accent-cyan)',
              backgroundColor: 'color-mix(in srgb, var(--accent-cyan) 10%, transparent)',
            }}
          >
            View All Posts <FaArrowRight size={12} />
          </Link>
        </div>

        <div data-reveal-group data-reveal-stagger="0.12" className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3" style={{ perspective: '1300px' }}>
          {recentBlogs.map((blog, index) => {
            const previewText = String(blog?.content || '').replace(/[#[\]*`_]/g, '').trim();
            const displayText = previewText.length > 160 ? `${previewText.slice(0, 160)}...` : previewText;
            const blogPath = getBlogPath(blog);

            return (
              <article
                key={blog?._id || `${blog?.title}-${index}`}
                data-reveal="flip"
                className="group flex h-full flex-col rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-1"
                style={{
                  borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
                  backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 84%, transparent)',
                }}
              >
                <div className="mb-4 flex items-center justify-between gap-2 text-xs sm:text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  <span className="inline-flex items-center gap-2">
                    <FaCalendarAlt className="h-3.5 w-3.5" />
                    {new Date(blog?.date || blog?.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]"
                    style={{
                      borderColor: 'color-mix(in srgb, var(--accent-orange) 46%, var(--border-secondary))',
                      color: 'var(--accent-orange)',
                    }}
                  >
                    <FaPenNib className="h-3 w-3" />
                    {blog?.readTime || getReadTime(blog?.content)}
                  </span>
                </div>

                <Link href={blogPath} className="group-hover:underline" style={{ textDecorationColor: 'var(--accent-cyan)' }}>
                  <h3 className="mb-3 text-xl font-bold leading-snug" style={{ color: 'var(--text-primary)' }}>
                    {blog?.title}
                  </h3>
                </Link>

                <p className="mb-6 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {displayText || 'Open this article to read the full write-up.'}
                </p>

                <div className="mt-auto border-t pt-4" style={{ borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)' }}>
                  <Link
                    href={blogPath}
                    className="inline-flex items-center gap-2 text-sm font-semibold"
                    style={{ color: 'var(--accent-cyan)' }}
                  >
                    Read Article <FaArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HomeBlogs;
