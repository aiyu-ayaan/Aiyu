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
      className="chapter-section"
      style={{ backgroundColor: 'transparent', perspective: '1400px' }}
    >
      <div
        data-parallax="-0.3"
        className="pointer-events-none absolute left-10 top-6 h-44 w-44 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--accent-purple) 12%, transparent), transparent 70%)' }}
      />

      <div
        data-reveal="tilt"
        className="chapter-panel glass-panel relative mx-auto flex w-full max-w-[95%] flex-col justify-center p-8 sm:p-12 lg:max-w-[80%] xl:p-16"
      >
        <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div data-reveal="rise" className="max-w-2xl">
            <p className="eyebrow mb-3">About</p>
            <h2 className="headline-section">
              Intentional engineering with creative energy.
            </h2>
          </div>
          <Link href="/about-me" data-reveal="flip-right" className="pill-ghost self-start lg:self-auto">
            Full Story <FaArrowRight size={12} />
          </Link>
        </div>

        <p data-reveal="rise" className="subcopy mb-14 max-w-4xl !text-xl sm:!text-2xl" style={{ color: 'var(--text-secondary)' }}>
          {professionalSummary || 'I create user-first software experiences, pairing strong technical decisions with thoughtful product execution.'}
        </p>

        <div data-reveal-group className="grid grid-cols-1 gap-5 md:grid-cols-3 lg:gap-6" style={{ perspective: '1100px' }}>
          {highlightItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                data-reveal="flip"
                className="glass-tile p-7 transition-transform duration-300 hover:-translate-y-1"
              >
                <div
                  className="mb-7 inline-flex h-12 w-12 items-center justify-center rounded-2xl border"
                  style={{ backgroundColor: `color-mix(in srgb, ${item.accent} 12%, transparent)` }}
                >
                  <Icon size={15} style={{ color: item.accent }} />
                </div>
                <h3 className="mb-3 text-xl font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>{item.title}</h3>
                <p className="text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-tertiary)' }}>{item.description}</p>
              </div>
            );
          })}
        </div>

        <div data-reveal-group data-reveal-stagger="0.07" className="mt-10 flex flex-wrap gap-3">
          <Link href="/projects" data-reveal="rise" className="pill-ghost">
            View Projects
          </Link>
          <Link href="/contact-us" data-reveal="rise" className="pill-solid">
            Start a Conversation
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HomeAbout;
