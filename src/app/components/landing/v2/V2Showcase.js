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

// Resting transform for a card sitting `slot` places deep in the stack.
const slotProps = (slot) => ({
  z: -slot * 130,
  y: slot * 30,
  scale: 1 - slot * 0.05,
  autoAlpha: slot > 3 ? 0 : 1 - slot * 0.18,
});

/**
 * Chapter 05 — Focus areas as a pinned depth deck. The cards stack in camera
 * depth; each scroll step throws the front card past the lens while the rest
 * dolly forward one slot. Cards carry a giant ghost numeral and an accent
 * edge instead of the site's glass-tile look. Lite / reduced-motion devices
 * keep the plain grid.
 */
const V2Showcase = ({ data }) => {
  const sectionRef = useRef(null);
  const { prefersReducedMotion } = useDevicePerformance();

  const eyebrow = data?.eyebrow || 'How I Work';
  const headline = data?.headline || 'Focus areas, card by card.';
  const description = data?.description || 'Keep scrolling — each card lifts off toward you and hands the stage to the next.';
  const panels = Array.isArray(data?.panels) && data.panels.length > 0 ? data.panels : SHOWCASE_PANELS;

  useV2Fx(sectionRef, {
    reducedMotion: prefersReducedMotion,
    dependencies: [panels.length],
    extra: ({ gsap, scope, reducedMotion }) => {
      if (reducedMotion) return;

      const pinWrap = scope.querySelector('.v2-deck-pin');
      const stage = scope.querySelector('.v2-deck-stage');
      const cards = Array.from(scope.querySelectorAll('.v2-deck-card'));
      const dots = Array.from(scope.querySelectorAll('.v2-deck-dot'));
      if (!pinWrap || !stage || cards.length < 2) return;

      // Convert the accessible grid into an absolute depth stack.
      const stageHeight = Math.max(...cards.map((card) => card.offsetHeight)) + 8;
      gsap.set(stage, {
        display: 'block',
        position: 'relative',
        height: stageHeight,
        perspective: 1400,
        transformStyle: 'preserve-3d',
      });
      cards.forEach((card, index) => {
        gsap.set(card, {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: stageHeight - 8,
          transformOrigin: '50% 40%',
          zIndex: cards.length - index,
          ...slotProps(index),
        });
      });

      const steps = cards.length - 1;
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: pinWrap,
          start: 'top 96px',
          end: `+=${steps * 55}%`,
          pin: true,
          scrub: 0.8,
          anticipatePin: 1,
          onUpdate: (self) => {
            const active = Math.min(steps, Math.round(self.progress * steps));
            dots.forEach((dot, i) => {
              dot.style.opacity = i === active ? '1' : '0.3';
              dot.style.transform = i === active ? 'scale(1.35)' : 'scale(1)';
            });
          },
        },
      });

      cards.forEach((card, index) => {
        if (index === steps) return;
        // Front card flies past the camera; it fades within the first 40% of
        // the step so its text never overlaps the card dollying in behind it.
        tl.to(card, { z: 460, y: -70, rotationX: -10, duration: 1 }, index);
        tl.to(card, { autoAlpha: 0, duration: 0.4 }, index);
        // …while every card behind it dollies forward one slot.
        cards.slice(index + 1).forEach((behind, offset) => {
          tl.to(behind, { ...slotProps(offset), duration: 1 }, index);
        });
      });
    },
  });

  return (
    // No perspective on this wrapper: a transformed ancestor would break the pin.
    <section ref={sectionRef} className="relative overflow-hidden py-20 sm:py-28" style={{ borderTop: '1px solid var(--hairline)' }}>
      <div className="v2-deck-pin mx-auto w-full max-w-7xl px-6 lg:px-10">
        <div className="relative mb-12">
          <p data-v2="line" className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.35em]" style={{ color: 'var(--accent-cyan)' }}>
            <span data-v2-scramble="0.9">{`0x05 :: ${eyebrow}`}</span>
          </p>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 data-v2="line" className="max-w-3xl text-4xl font-bold leading-[1.02] tracking-tight sm:text-6xl" style={{ color: 'var(--text-bright)' }}>
                {headline}
              </h2>
              <p data-v2="rise" className="mt-4 max-w-2xl text-base leading-relaxed sm:text-lg" style={{ color: 'var(--text-tertiary)' }}>
                {description}
              </p>
            </div>
            <div data-v2="rise" className="flex items-center gap-2.5 pb-2" aria-hidden="true">
              {panels.map((panel, index) => (
                <span
                  key={panel.title}
                  className="v2-deck-dot h-2 w-2 rounded-full transition-all duration-200"
                  style={{
                    backgroundColor: panel.accent || 'var(--accent-cyan)',
                    opacity: index === 0 ? 1 : 0.3,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="v2-deck-stage grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {panels.map((panel, index) => {
            const Icon = typeof panel.icon === 'string' ? getIcon(panel.icon) : (panel.icon || FaLaptopCode);
            const accent = panel.accent || 'var(--accent-cyan)';
            return (
              <article
                key={panel.title}
                className="v2-deck-card relative flex min-h-[24rem] flex-col overflow-hidden rounded-3xl border p-8 sm:p-12"
                style={{
                  borderColor: 'var(--hairline)',
                  backgroundColor: 'var(--bg-secondary)',
                  backgroundImage: `radial-gradient(ellipse at 85% -10%, color-mix(in srgb, ${accent} 14%, transparent), transparent 55%)`,
                }}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-10 right-4 select-none text-[11rem] font-black leading-none"
                  style={{
                    color: 'transparent',
                    WebkitTextStroke: `1.5px color-mix(in srgb, ${accent} 25%, transparent)`,
                  }}
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${accent}, transparent 70%)` }} />

                <div className="-mx-8 -mt-8 mb-8 flex items-center justify-between gap-3 border-b px-8 py-3 sm:-mx-12 sm:-mt-12 sm:px-12" style={{ borderColor: 'var(--hairline)' }}>
                  <span className="flex items-center gap-1.5" aria-hidden="true">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'var(--status-error, #f87171)', opacity: 0.75 }} />
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'var(--accent-orange)', opacity: 0.75 }} />
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'var(--status-success)', opacity: 0.75 }} />
                    <span className="ml-3 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                      ./{panel.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.sh
                    </span>
                  </span>
                  <span className="font-mono text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    proc 0x{String(index + 1).padStart(2, '0')}/{String(panels.length).padStart(2, '0')}
                  </span>
                </div>

                <div className="mb-8">
                  <span
                    className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border"
                    style={{ borderColor: `color-mix(in srgb, ${accent} 35%, transparent)`, backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)` }}
                  >
                    <Icon size={16} style={{ color: accent }} />
                  </span>
                </div>

                <h3 className="mb-4 max-w-md text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: 'var(--text-bright)' }}>
                  {panel.title}
                </h3>
                <p className="max-w-xl text-base leading-relaxed sm:text-lg" style={{ color: 'var(--text-tertiary)' }}>
                  {panel.description}
                </p>

                <div className="mt-auto flex flex-wrap gap-x-5 gap-y-2 pt-8 font-mono text-xs uppercase tracking-[0.15em]">
                  {panel.tags.map((tag) => (
                    <span key={tag} style={{ color: `color-mix(in srgb, ${accent} 75%, var(--text-secondary))` }}>
                      #{tag}
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

export default V2Showcase;
