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
 * Showcase chapter, v2: instead of the v1 horizontal rail, the focus-area cards
 * are stacked in camera depth. The stage pins and each scroll step throws the
 * front card past the camera while the stack dollies forward one slot — a
 * card-deck fly-through. Lite / reduced-motion devices keep the plain grid.
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
        // Front card flies past the camera…
        tl.to(card, { z: 460, y: -70, rotationX: -10, autoAlpha: 0, duration: 1 }, index);
        // …while every card behind it dollies forward one slot.
        cards.slice(index + 1).forEach((behind, offset) => {
          tl.to(behind, { ...slotProps(offset), duration: 1 }, index);
        });
      });
    },
  });

  return (
    // No perspective on this wrapper: a transformed ancestor would break the pin.
    <section ref={sectionRef} className="chapter-section">
      <div
        data-v2-depth="-0.2"
        className="pointer-events-none absolute -right-16 top-10 h-56 w-56 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--accent-purple) 11%, transparent), transparent 70%)' }}
      />

      <div className="v2-deck-pin mx-auto w-full max-w-[95%] lg:max-w-[80%]">
        <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div data-v2="door-left" className="max-w-2xl">
            <p className="eyebrow mb-3">{eyebrow}</p>
            <h2 className="headline-section">{headline}</h2>
            <p className="subcopy mt-4">{description}</p>
          </div>
          <div
            data-v2="door-right"
            className="glass-tile inline-flex items-center gap-2.5 self-start px-4 py-2.5 lg:self-auto"
            aria-hidden="true"
          >
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

        <div className="v2-deck-stage grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {panels.map((panel, index) => {
            const Icon = typeof panel.icon === 'string' ? getIcon(panel.icon) : (panel.icon || FaLaptopCode);
            return (
              <article
                key={panel.title}
                className="v2-deck-card glass-tile flex min-h-[22rem] flex-col p-8 sm:p-10"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <div className="mb-8 flex items-start justify-between gap-3">
                  <span
                    className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border"
                    style={{ backgroundColor: `color-mix(in srgb, ${panel.accent} 12%, transparent)` }}
                  >
                    <Icon size={16} style={{ color: panel.accent }} />
                  </span>
                  <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    {String(index + 1).padStart(2, '0')} / {String(panels.length).padStart(2, '0')}
                  </span>
                </div>

                <h3 className="mb-3 text-2xl font-semibold tracking-tight sm:text-3xl" style={{ color: 'var(--text-bright)' }}>
                  {panel.title}
                </h3>
                <p className="max-w-xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-tertiary)' }}>
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

export default V2Showcase;
