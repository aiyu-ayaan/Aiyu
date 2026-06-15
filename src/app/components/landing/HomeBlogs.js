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
    <section ref={sectionRef} className="chapter-section" style={{ perspective: '1400px' }}>
      <div
        data-parallax="-0.25"
        className="pointer-events-none absolute left-10 top-16 h-44 w-44 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--accent-cyan) 11%, transparent), transparent 70%)' }}
      />

      <div
        data-reveal="tilt"
        className="chapter-panel glass-panel relative mx-auto flex w-full max-w-[95%] flex-col justify-center p-8 sm:p-12 lg:max-w-[80%] xl:p-16"
      >
        <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div data-reveal="left" className="max-w-2xl">
            <p className="eyebrow mb-3">Writing</p>
            <h2 className="headline-section">
              Recent writings.
            </h2>
            <p className="subcopy mt-4">
              Practical notes, tutorials, and reflections from projects and day-to-day engineering.
            </p>
          </div>

          <Link href="/blogs" data-reveal="right" className="pill-ghost self-start lg:self-auto">
            View All Posts <FaArrowRight size={12} />
          </Link>
        </div>

        <div data-reveal-auto data-reveal-stagger="0.1" className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:gap-7" style={{ perspective: '1300px' }}>
          {recentBlogs.map((blog, index) => {
            const previewText = String(blog?.content || '').replace(/[#[\]*`_]/g, '').trim();
            const displayText = previewText.length > 160 ? `${previewText.slice(0, 160)}...` : previewText;
            const blogPath = getBlogPath(blog);

            return (
              <article
                key={blog?._id || `${blog?.title}-${index}`}
                className="group glass-tile flex h-full flex-col p-7 transition-transform duration-300 hover:-translate-y-1"
              >
                <div className="mb-5 flex items-center justify-between gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span className="inline-flex items-center gap-2">
                    <FaCalendarAlt className="h-3 w-3" />
                    {new Date(blog?.date || blog?.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <FaPenNib className="h-2.5 w-2.5" />
                    {blog?.readTime || getReadTime(blog?.content)}
                  </span>
                </div>

                <Link href={blogPath} className="group-hover:underline" style={{ textDecorationColor: 'var(--text-tertiary)' }}>
                  <h3 className="mb-4 text-2xl font-semibold leading-tight tracking-tight" style={{ color: 'var(--text-bright)' }}>
                    {blog?.title}
                  </h3>
                </Link>

                <p className="mb-7 text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-tertiary)' }}>
                  {displayText || 'Open this article to read the full write-up.'}
                </p>

                <div className="mt-auto border-t pt-4" style={{ borderColor: 'var(--hairline)' }}>
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
