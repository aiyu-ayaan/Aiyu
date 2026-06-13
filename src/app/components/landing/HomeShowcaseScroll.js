"use client";

import React, { useRef } from 'react';
import {
  FaBrain,
  FaLaptopCode,
  FaMobileAlt,
  FaPaintBrush,
  FaRocket,
  FaServer,
} from 'react-icons/fa';
import useDevicePerformance from '../../hooks/useDevicePerformance';
import { useSectionFx } from '../shared/gsapScroll';

// Static focus-area panels — no data dependency so the rail always renders.
const SHOWCASE_PANELS = [
  {
    title: 'Product Engineering',
    description: 'Turning fuzzy ideas into shipped features, with a bias for the user’s real friction.',
    icon: FaLaptopCode,
    accent: 'var(--accent-cyan)',
    tags: ['Next.js', 'React', 'TypeScript'],
  },
  {
    title: 'Backend & APIs',
    description: 'Pragmatic services and data models that stay readable as the surface area grows.',
    icon: FaServer,
    accent: 'var(--accent-purple)',
    tags: ['Node', 'REST', 'Mongo'],
  },
  {
    title: 'Interface Craft',
    description: 'Responsive, accessible UI that feels calm on desktop and quick on mobile.',
    icon: FaMobileAlt,
    accent: 'var(--accent-orange)',
    tags: ['Tailwind', 'Motion', 'A11y'],
  },
  {
    title: 'Design Systems',
    description: 'Tokens, glass surfaces, and reusable primitives that keep a product coherent.',
    icon: FaPaintBrush,
    accent: 'var(--accent-pink)',
    tags: ['Theming', 'Tokens', 'GSAP'],
  },
  {
    title: 'Performance',
    description: 'Measuring before tuning — lazy boundaries, device tiers, and smooth 60fps scroll.',
    icon: FaRocket,
    accent: 'var(--accent-cyan)',
    tags: ['Lighthouse', 'k6', 'LOD'],
  },
  {
    title: 'AI & Automation',
    description: 'Wiring models and tooling into workflows so the boring parts run themselves.',
    icon: FaBrain,
    accent: 'var(--accent-purple)',
    tags: ['LLMs', 'Agents', 'Tooling'],
  },
];

const HomeShowcaseScroll = () => {
  const sectionRef = useRef(null);
  const { prefersReducedMotion } = useDevicePerformance();

  // Provides reveals for the heading + the pinned horizontal track (data-hscroll).
  useSectionFx(sectionRef, { reducedMotion: prefersReducedMotion });

  return (
    // No `perspective` here: a transformed ancestor would break ScrollTrigger's
    // position:fixed pin for the horizontal track below.
    <section ref={sectionRef} className="chapter-section">
      <div
        data-parallax="-0.2"
        className="pointer-events-none absolute -right-16 top-10 h-56 w-56 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--accent-purple) 11%, transparent), transparent 70%)' }}
      />

      <div className="mx-auto mb-10 flex w-full max-w-[95%] flex-col gap-6 lg:max-w-[80%] lg:flex-row lg:items-end lg:justify-between">
        <div data-reveal="left" className="max-w-2xl">
          <p className="eyebrow mb-3">How I Work</p>
          <h2 className="headline-section">Focus areas, side to side.</h2>
          <p className="subcopy mt-4">
            Keep scrolling — this rail moves sideways with you, then hands you back to the page.
          </p>
        </div>
        <div
          data-reveal="right"
          className="glass-tile inline-flex items-center gap-2 self-start px-4 py-2.5 text-sm font-medium lg:self-auto"
          style={{ color: 'var(--text-secondary)' }}
        >
          <span aria-hidden="true">Scroll</span>
          <span aria-hidden="true" style={{ color: 'var(--accent-cyan)' }}>→</span>
        </div>
      </div>

      <div data-hscroll className="hscroll-viewport hscroll-stage mx-auto w-full max-w-[95%] lg:max-w-[80%]">
        <div data-hscroll-track className="hscroll-track">
          {SHOWCASE_PANELS.map((panel, index) => {
            const Icon = panel.icon;
            return (
              <article
                key={panel.title}
                className="hscroll-panel glass-tile flex min-h-[24rem] flex-col p-8 sm:p-10"
              >
                <div className="mb-8 flex items-start justify-between gap-3">
                  <span
                    className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border"
                    style={{ backgroundColor: `color-mix(in srgb, ${panel.accent} 12%, transparent)` }}
                  >
                    <Icon size={16} style={{ color: panel.accent }} />
                  </span>
                  <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>

                <h3 className="mb-3 text-2xl font-semibold tracking-tight" style={{ color: 'var(--text-bright)' }}>
                  {panel.title}
                </h3>
                <p className="text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-tertiary)' }}>
                  {panel.description}
                </p>

                <div className="mt-auto flex flex-wrap gap-2 pt-8">
                  {panel.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border px-3 py-1 text-xs font-medium"
                      style={{
                        borderColor: 'var(--hairline)',
                        color: 'var(--text-secondary)',
                        backgroundColor: 'var(--surface-tile)',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HomeShowcaseScroll;
