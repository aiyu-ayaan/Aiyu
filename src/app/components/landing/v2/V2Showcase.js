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
import useDevicePerformance from '../../../hooks/useDevicePerformance';
import { useV2Fx } from './gsap3d';
import SceneBackdrop from './SceneBackdrop';
import TermHead from './TermHead';
import { getIcon } from '../../../../lib/iconLibrary';

// Same focus-area content as the v1 rail — the redesign is the presentation.
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

/**
 * Chapter 05 — focus areas as i3 workspaces. On desktop the chapter pins and
 * the workspaces slide past horizontally while a polybar tracks the active
 * one — the "side to side" rail the admin copy describes. Smaller screens
 * and reduced motion get a plain vertical stack. Same showcaseSection data.
 */
const V2Showcase = ({ data }) => {
  const sectionRef = useRef(null);
  const { prefersReducedMotion } = useDevicePerformance();

  const eyebrow = data?.eyebrow || 'How I Work';
  const headline = data?.headline || 'Focus areas, side to side.';
  const description = data?.description || 'Keep scrolling — this rail moves sideways with you, then hands you back to the page.';
  const panels = Array.isArray(data?.panels) && data.panels.length > 0 ? data.panels : SHOWCASE_PANELS;

  useV2Fx(sectionRef, {
    reducedMotion: prefersReducedMotion,
    dependencies: [panels.length],
    extra: ({ gsap, scope, reducedMotion }) => {
      if (reducedMotion) return;
      const mm = gsap.matchMedia();
      mm.add('(min-width: 1024px)', () => {
        const pin = scope.querySelector('.ws-pin');
        const track = scope.querySelector('.ws-track');
        const tabs = Array.from(scope.querySelectorAll('.ws-tab'));
        const fill = scope.querySelector('.ws-fill');
        if (!pin || !track) return undefined;

        const distance = () => Math.max(0, track.scrollWidth - track.parentElement.clientWidth);
        const setActive = (index) => {
          tabs.forEach((tab, i) => {
            tab.dataset.active = i === index ? 'true' : 'false';
          });
        };
        setActive(0);

        gsap.to(track, {
          x: () => -distance(),
          ease: 'none',
          scrollTrigger: {
            trigger: pin,
            start: 'top 80px',
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 0.8,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              setActive(Math.min(panels.length - 1, Math.round(self.progress * (panels.length - 1))));
              if (fill) fill.style.transform = `scaleX(${self.progress})`;
            },
          },
        });
        return undefined;
      });
      return () => mm.revert();
    },
  });

  return (
    // No transform on this wrapper: a transformed ancestor would break the pin.
    <section ref={sectionRef} className="relative isolate overflow-hidden py-20 sm:py-28" style={{ borderTop: '1px solid var(--hairline)' }}>
        <SceneBackdrop accent="var(--accent-cyan)" side="right" />
      <div className="ws-pin mx-auto w-full max-w-7xl px-6 lg:px-10">
        <TermHead path="~" command="i3-msg workspace next" title={headline} kicker={description} accent="var(--accent-cyan)" />

        {/* polybar */}
        <div
          className="mb-6 flex items-center justify-between gap-4 rounded-lg border px-3 py-2 font-mono text-xs"
          style={{ borderColor: 'var(--hairline)', backgroundColor: 'color-mix(in srgb, var(--bg-secondary) 80%, transparent)', color: 'var(--text-muted)' }}
        >
          <div className="flex flex-wrap items-center gap-1.5">
            {panels.map((panel, index) => (
              <span
                key={panel.title}
                data-active={index === 0 ? 'true' : 'false'}
                className="ws-tab rounded px-2 py-0.5 transition-colors duration-200 data-[active=true]:font-bold data-[active=true]:text-[var(--bg-primary)]"
                style={{ '--ws-accent': panel.accent || 'var(--accent-cyan)' }}
              >
                {index + 1}
              </span>
            ))}
          </div>
          <span className="hidden truncate uppercase tracking-[0.2em] sm:inline">{eyebrow}</span>
          <span className="relative hidden h-1 w-32 overflow-hidden rounded-full lg:block" style={{ backgroundColor: 'var(--hairline)' }}>
            <span className="ws-fill absolute inset-0 origin-left" style={{ transform: 'scaleX(0)', backgroundColor: 'var(--accent-cyan)' }} />
          </span>
        </div>

        <div className="overflow-hidden lg:overflow-visible">
          <div className="ws-track grid grid-cols-1 gap-6 lg:flex lg:w-max lg:gap-8">
            {panels.map((panel, index) => {
              const Icon = typeof panel.icon === 'string' ? getIcon(panel.icon) : (panel.icon || FaLaptopCode);
              const accent = panel.accent || 'var(--accent-cyan)';
              const tags = Array.isArray(panel.tags) ? panel.tags : [];
              const dir = String(panel.title).toLowerCase().replace(/[^a-z0-9]+/g, '-');
              return (
                <article
                  key={panel.title}
                  className="relative flex min-h-[22rem] flex-col overflow-hidden rounded-2xl border lg:h-[26rem] lg:w-[min(40rem,70vw)]"
                  style={{ borderColor: `color-mix(in srgb, ${accent} 30%, var(--hairline))`, backgroundColor: 'var(--bg-secondary)' }}
                >
                  <div className="flex items-center justify-between border-b px-4 py-2 font-mono text-xs" style={{ borderColor: 'var(--hairline)', color: 'var(--text-muted)' }}>
                    <span>
                      <span className="mr-2 rounded px-1.5 font-bold" style={{ backgroundColor: accent, color: 'var(--bg-primary)' }}>{index + 1}</span>
                      ~/focus/{dir}
                    </span>
                    <span>{String(index + 1).padStart(2, '0')} / {String(panels.length).padStart(2, '0')}</span>
                  </div>

                  <div
                    className="relative flex flex-1 flex-col p-7 sm:p-10"
                    style={{ backgroundImage: `radial-gradient(ellipse at 90% -10%, color-mix(in srgb, ${accent} 16%, transparent), transparent 55%)` }}
                  >
                    <span
                      className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl border"
                      style={{ borderColor: `color-mix(in srgb, ${accent} 35%, transparent)`, backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)` }}
                    >
                      <Icon size={16} style={{ color: accent }} />
                    </span>
                    <h3 className="mb-4 max-w-md text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: 'var(--text-bright)' }}>
                      {panel.title}
                    </h3>
                    <p className="max-w-xl text-base leading-relaxed sm:text-lg" style={{ color: 'var(--text-tertiary)' }}>
                      {panel.description}
                    </p>
                    <div className="mt-auto flex flex-wrap gap-x-5 gap-y-2 pt-8 font-mono text-xs uppercase tracking-[0.15em]">
                      {tags.map((tag) => (
                        <span key={tag} style={{ color: `color-mix(in srgb, ${accent} 75%, var(--text-secondary))` }}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default V2Showcase;
