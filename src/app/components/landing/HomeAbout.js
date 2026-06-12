"use client";

import React, { useRef } from 'react';
import Link from 'next/link';
import { FaArrowRight, FaCodeBranch, FaCompass, FaRocket } from 'react-icons/fa';
import useDevicePerformance from '../../hooks/useDevicePerformance';
import { useSectionFx } from '../shared/gsapScroll';

const highlightItems = [
  {
    icon: FaCompass,
    title: 'Product Mindset',
    description: 'Building features that solve real user friction, not just technical tasks.',
    accent: 'var(--accent-cyan)',
  },
  {
    icon: FaCodeBranch,
    title: 'Clean Execution',
    description: 'Architecture and delivery balanced for readability, speed, and maintainability.',
    accent: 'var(--accent-purple)',
  },
  {
    icon: FaRocket,
    title: 'Growth Velocity',
    description: 'Continuous learning loops to ship better outcomes with each iteration.',
    accent: 'var(--accent-orange)',
  },
];

const HomeAbout = ({ data }) => {
  const { professionalSummary } = data || {};
  const sectionRef = useRef(null);
  const { prefersReducedMotion } = useDevicePerformance();

  useSectionFx(sectionRef, { reducedMotion: prefersReducedMotion });

  return (
    <div
      ref={sectionRef}
      className="relative p-4 lg:p-8"
      style={{ backgroundColor: 'transparent', perspective: '1400px' }}
    >
      <div
        data-parallax="-0.3"
        className="pointer-events-none absolute left-10 top-6 h-44 w-44 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--accent-purple) 30%, transparent), transparent 70%)' }}
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
        <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div data-reveal="rise">
            <p className="mb-2 inline-flex rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em]"
              style={{
                borderColor: 'color-mix(in srgb, var(--accent-cyan) 42%, var(--border-secondary))',
                color: 'var(--accent-cyan)',
              }}
            >
              About Highlights
            </p>
            <h2 className="text-3xl font-bold sm:text-4xl" style={{ color: 'var(--text-primary)' }}>
              Intentional Engineering With Creative Energy
            </h2>
          </div>
          <Link
            href="/about-me"
            data-reveal="flip-right"
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold"
            style={{
              borderColor: 'var(--accent-cyan)',
              color: 'var(--accent-cyan)',
              backgroundColor: 'color-mix(in srgb, var(--accent-cyan) 10%, transparent)',
            }}
          >
            Full Story <FaArrowRight size={12} />
          </Link>
        </div>

        <p data-reveal="rise" className="mb-7 max-w-4xl text-base leading-relaxed sm:text-lg" style={{ color: 'var(--text-secondary)' }}>
          {professionalSummary || 'I create user-first software experiences, pairing strong technical decisions with thoughtful product execution.'}
        </p>

        <div data-reveal-group className="grid grid-cols-1 gap-4 md:grid-cols-3" style={{ perspective: '1100px' }}>
          {highlightItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                data-reveal="flip"
                className="rounded-2xl border p-4 transition-transform duration-300 hover:-translate-y-1"
                style={{
                  borderColor: 'color-mix(in srgb, var(--border-secondary) 70%, transparent)',
                  backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 84%, transparent)',
                }}
              >
                <div className="mb-3 inline-flex rounded-lg p-2"
                  style={{ backgroundColor: `color-mix(in srgb, ${item.accent} 14%, transparent)` }}
                >
                  <Icon size={16} style={{ color: item.accent }} />
                </div>
                <h3 className="mb-2 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{item.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.description}</p>
              </div>
            );
          })}
        </div>

        <div data-reveal-group data-reveal-stagger="0.07" className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/projects"
            data-reveal="rise"
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold"
            style={{
              borderColor: 'color-mix(in srgb, var(--border-secondary) 80%, transparent)',
              color: 'var(--text-secondary)',
              backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 80%, transparent)',
            }}
          >
            View Projects
          </Link>
          <Link
            href="/contact-us"
            data-reveal="rise"
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold"
            style={{
              borderColor: 'color-mix(in srgb, var(--accent-orange) 48%, var(--border-secondary))',
              color: 'var(--accent-orange)',
              backgroundColor: 'color-mix(in srgb, var(--accent-orange) 10%, transparent)',
            }}
          >
            Start a Conversation
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HomeAbout;
