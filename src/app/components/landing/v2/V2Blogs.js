"use client";

import React, { useMemo, useRef } from 'react';
import Link from 'next/link';
import { FaArrowRight } from 'react-icons/fa';
import { getReadTime } from '../../blogs/blogUtils';
import { getBlogPath } from '@/lib/publicPaths';
import useDevicePerformance from '../../../hooks/useDevicePerformance';
import { useV2Fx } from './gsap3d';
import V2ChapterHead from './V2ChapterHead';
import { v2PublicPath } from '@/lib/siteVersion';

const ROW_ACCENTS = ['var(--accent-pink)', 'var(--accent-cyan)', 'var(--accent-purple)'];

/**
 * Chapter 07 — Writing as an editorial index. Each post is a ledger row:
 * mono date column, the title in display type, read time as an annotation.
 * Rows hinge in from alternating edges and the title slides on hover.
 * Same content and links as the v1 section.
 */
const V2Blogs = ({ blogs, config }) => {
  const sectionRef = useRef(null);
  const { prefersReducedMotion } = useDevicePerformance();

  const sortedBlogs = useMemo(() => {
    const safeBlogs = Array.isArray(blogs) ? blogs : [];
    return [...safeBlogs].sort((a, b) => new Date(b?.createdAt || b?.date || 0) - new Date(a?.createdAt || a?.date || 0));
  }, [blogs]);

  const recentBlogs = sortedBlogs.slice(0, 3);

  useV2Fx(sectionRef, { reducedMotion: prefersReducedMotion });

  if (recentBlogs.length === 0) return null;

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden py-20 sm:py-28"
      style={{ borderTop: '1px solid var(--hairline)' }}
    >
      <div className="mx-auto w-full max-w-7xl px-6 lg:px-10">
        <V2ChapterHead
          index="07"
          eyebrow="Writing"
          title="Notes from the workbench."
          kicker="Practical notes, tutorials, and reflections from projects and day-to-day engineering."
          accent="var(--accent-purple)"
        />

        <div style={{ borderTop: '1px solid var(--hairline)', perspective: '1600px' }}>
          {recentBlogs.map((blog, index) => {
            const accent = ROW_ACCENTS[index % ROW_ACCENTS.length];
            const blogPath = getBlogPath(blog);
            const previewText = String(blog?.content || '').replace(/[#[\]*`_]/g, '').trim();
            const displayText = previewText.length > 140 ? `${previewText.slice(0, 140)}...` : previewText;
            const dateLabel = new Date(blog?.date || blog?.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });

            return (
              <Link
                key={blog?._id || `${blog?.title}-${index}`}
                href={blogPath}
                data-v2={index % 2 === 0 ? 'door-left' : 'door-right'}
                className="group grid grid-cols-12 items-baseline gap-4 py-8 sm:py-10"
                style={{ borderBottom: '1px solid var(--hairline)' }}
              >
                <span className="col-span-12 font-mono text-xs sm:col-span-2 sm:text-sm" style={{ color: 'var(--text-muted)' }}>
                  {dateLabel}
                  <span className="mt-1 block" style={{ color: accent }}>
                    {blog?.readTime || getReadTime(blog?.content)}
                  </span>
                </span>

                <span className="col-span-11 sm:col-span-9">
                  <span
                    className="block text-2xl font-bold leading-tight tracking-tight transition-transform duration-300 group-hover:translate-x-2 sm:text-4xl"
                    style={{ color: 'var(--text-bright)' }}
                  >
                    {blog?.title}
                  </span>
                  <span className="mt-3 block max-w-2xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-tertiary)' }}>
                    {displayText || 'Open this article to read the full write-up.'}
                  </span>
                </span>

                <span className="col-span-1 hidden justify-self-end sm:block" aria-hidden="true">
                  <FaArrowRight
                    className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1.5"
                    style={{ color: accent }}
                  />
                </span>
              </Link>
            );
          })}
        </div>

        <p data-v2="rise" className="mt-12 font-mono text-sm">
          <Link href={v2PublicPath(config, '/blogs')} className="underline-offset-4 hover:underline" style={{ color: 'var(--accent-purple)' }}>
            → all posts
          </Link>
        </p>
      </div>
    </section>
  );
};

export default V2Blogs;
