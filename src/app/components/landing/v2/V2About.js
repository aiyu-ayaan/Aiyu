"use client";

import React, { useRef } from 'react';
import Link from 'next/link';
import { FaArrowRight, FaCodeBranch, FaCompass, FaRocket } from 'react-icons/fa';
import useDevicePerformance from '../../../hooks/useDevicePerformance';
import { useV2Fx } from './gsap3d';

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

/**
 * About chapter, v2: the summary surfaces from camera depth while the three
 * highlight cards flip up from flat in sequence, each landing with a slight
 * stagger. Same content as the v1 HomeAbout section.
 */
const V2About = ({ data }) => {
  const { professionalSummary } = data || {};
  const sectionRef = useRef(null);
  const { prefersReducedMotion } = useDevicePerformance();

  useV2Fx(sectionRef, { reducedMotion: prefersReducedMotion });

  return (
    <div
      ref={sectionRef}
      className="chapter-section"
      style={{ backgroundColor: 'transparent', perspective: '1400px' }}
    >
      <div
        data-v2-depth="-0.3"
        className="pointer-events-none absolute left-10 top-6 h-44 w-44 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--accent-purple) 12%, transparent), transparent 70%)' }}
      />

      <div
        data-v2="float"
        data-v2-tilt
        className="chapter-panel glass-panel relative mx-auto flex w-full max-w-[95%] flex-col justify-center p-8 sm:p-12 lg:max-w-[80%] xl:p-16"
      >
        <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div data-v2="door-left" className="max-w-2xl">
            <p className="eyebrow mb-3">About</p>
            <h2 className="headline-section">
              Intentional engineering with creative energy.
            </h2>
          </div>
          <Link href="/about-me" data-v2="door-right" className="pill-ghost self-start lg:self-auto">
            Full Story <FaArrowRight size={12} />
          </Link>
        </div>

        <p data-v2="deep" className="subcopy mb-14 max-w-4xl !text-xl sm:!text-2xl" style={{ color: 'var(--text-secondary)' }}>
          {professionalSummary || 'I create user-first software experiences, pairing strong technical decisions with thoughtful product execution.'}
        </p>

        <div data-v2-group data-v2-stagger="0.12" className="grid grid-cols-1 gap-5 md:grid-cols-3 lg:gap-6" style={{ perspective: '1100px' }}>
          {highlightItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                data-v2="flip-x"
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

        <div data-v2-group data-v2-stagger="0.08" className="mt-10 flex flex-wrap gap-3">
          <Link href="/projects" data-v2="door-left" className="pill-ghost">
            View Projects
          </Link>
          <Link href="/contact-us" data-v2="door-right" className="pill-solid">
            Start a Conversation
          </Link>
        </div>
      </div>
    </div>
  );
};

export default V2About;
