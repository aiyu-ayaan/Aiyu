"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FaCode, FaFilter, FaLayerGroup } from 'react-icons/fa';
import { useTheme } from '../../context/ThemeContext';
import { getIcon } from '../../../lib/iconLibrary';
import useDevicePerformance from '../../hooks/useDevicePerformance';
import { gsap, useGSAP, useSectionFx } from '../shared/gsapScroll';

const DEFAULT_ICON_COLOR = '22d3ee';

const LEVEL_META = {
  Core: { min: 85, accent: 'var(--accent-cyan)' },
  Advanced: { min: 70, accent: 'var(--accent-purple)' },
  Intermediate: { min: 55, accent: 'var(--accent-orange)' },
  Fundamentals: { min: 0, accent: 'var(--accent-pink)' },
};

const getLevelBand = (value = 0) => {
  const level = Number(value) || 0;
  if (level >= LEVEL_META.Core.min) return 'Core';
  if (level >= LEVEL_META.Advanced.min) return 'Advanced';
  if (level >= LEVEL_META.Intermediate.min) return 'Intermediate';
  return 'Fundamentals';
};

const toSimpleIconHex = (cssColor) => {
  if (!cssColor) return DEFAULT_ICON_COLOR;

  const trimmed = cssColor.trim();
  if (trimmed.startsWith('#')) return trimmed.slice(1);

  const rgbMatch = trimmed.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!rgbMatch) return DEFAULT_ICON_COLOR;

  const [r, g, b] = rgbMatch.slice(1, 4).map((value) => Number.parseInt(value, 10));
  const toHex = (channel) => channel.toString(16).padStart(2, '0');
  return `${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const SkillIcon = ({ iconName, cleanName, accentColor }) => {
  const [imgFailed, setImgFailed] = useState(false);

  const LibraryIcon = getIcon(iconName);
  const isFallback = LibraryIcon?.name === 'FaCode';
  const iconSlug = String(iconName || cleanName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const canUseSimpleIcon = isFallback && iconSlug && !imgFailed;

  if (canUseSimpleIcon) {
    return (
      <img
        src={`https://cdn.simpleicons.org/${iconSlug}/${accentColor}`}
        alt={cleanName}
        className="h-6 w-6 object-contain"
        loading="lazy"
        decoding="async"
        onError={() => setImgFailed(true)}
      />
    );
  }

  const FinalIcon = LibraryIcon || FaCode;
  return <FinalIcon className="h-6 w-6" style={{ color: 'var(--accent-cyan)' }} />;
};

const TechStackCarousel = ({ data }) => {
  const { theme } = useTheme();
  const { prefersReducedMotion } = useDevicePerformance();
  const skills = Array.isArray(data?.skills) ? data.skills : [];

  const sectionRef = useRef(null);
  const gridRef = useRef(null);
  const [accentColor, setAccentColor] = useState(DEFAULT_ICON_COLOR);
  const [activeBand, setActiveBand] = useState('All');
  const [showAll, setShowAll] = useState(false);

  // Static parts of the section: panel tilt-in, parallax glows.
  useSectionFx(sectionRef, { reducedMotion: prefersReducedMotion });

  // Skill cards re-cascade in 3D whenever the visible set changes.
  useGSAP(() => {
    if (prefersReducedMotion) return;
    const cards = gridRef.current?.querySelectorAll('.skill-card');
    if (!cards?.length) return;

    // Refined hinge-up: a gentle lift with a subtle forward tilt (no deep
    // z-push), so the grid settles cleanly instead of lurching out of the page.
    gsap.from(cards, {
      autoAlpha: 0,
      y: 44,
      rotateX: -10,
      transformOrigin: 'center bottom',
      transformPerspective: 900,
      duration: 0.6,
      ease: 'power3.out',
      stagger: { each: 0.045, from: 'start' },
      clearProps: 'all',
      scrollTrigger: {
        trigger: gridRef.current,
        start: 'top 90%',
        once: true,
      },
    });

    cards.forEach((card) => {
      const bar = card.querySelector('.skill-bar');
      if (!bar) return;
      gsap.from(bar, {
        width: 0,
        duration: 1,
        ease: 'power2.out',
        clearProps: 'width',
        scrollTrigger: {
          trigger: card,
          start: 'top 92%',
          once: true,
        },
      });
    });
  }, { scope: sectionRef, dependencies: [activeBand, showAll, prefersReducedMotion] });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const colorValue = getComputedStyle(document.documentElement)
      .getPropertyValue('--accent-cyan')
      .trim();

    setAccentColor(toSimpleIconHex(colorValue));
  }, [theme]);

  const sortedSkills = useMemo(() => {
    return [...skills]
      .filter((skill) => skill?.name)
      .sort((a, b) => (Number(b?.level) || 0) - (Number(a?.level) || 0));
  }, [skills]);

  const bandCounts = useMemo(() => {
    const counts = sortedSkills.reduce(
      (accumulator, skill) => {
        const band = getLevelBand(skill?.level);
        accumulator[band] += 1;
        return accumulator;
      },
      { Core: 0, Advanced: 0, Intermediate: 0, Fundamentals: 0 }
    );

    return {
      All: sortedSkills.length,
      ...counts,
    };
  }, [sortedSkills]);

  const visibleSkills = useMemo(() => {
    const scopedSkills = activeBand === 'All'
      ? sortedSkills
      : sortedSkills.filter((skill) => getLevelBand(skill?.level) === activeBand);

    return showAll ? scopedSkills : scopedSkills.slice(0, 12);
  }, [activeBand, showAll, sortedSkills]);

  const filteredCount = activeBand === 'All'
    ? sortedSkills.length
    : sortedSkills.filter((skill) => getLevelBand(skill?.level) === activeBand).length;

  const canExpand = filteredCount > 12;

  const switchBand = (band) => {
    setActiveBand(band);
    setShowAll(false);
  };

  return (
    <section ref={sectionRef} className="chapter-section" style={{ perspective: '1400px' }}>
      <div
        data-parallax="-0.25"
        className="pointer-events-none absolute -left-20 top-14 h-64 w-64 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--accent-cyan) 12%, transparent), transparent 70%)' }}
      />
      <div
        data-parallax="0.3"
        className="pointer-events-none absolute -right-16 top-20 h-56 w-56 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--accent-purple) 10%, transparent), transparent 68%)' }}
      />

      <div
        data-reveal="tilt"
        className="chapter-panel glass-panel relative mx-auto flex w-full max-w-[95%] flex-col justify-center p-8 sm:p-12 lg:max-w-[80%] xl:p-16"
      >
        <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div data-reveal="left" className="max-w-2xl">
            <p className="eyebrow mb-3">Tech Stack</p>
            <h2 className="headline-section">
              Technologies I work with.
            </h2>
            <p className="subcopy mt-4">
              A structured view of my current stack, grouped by confidence and day-to-day usage.
            </p>
          </div>

          <div
            data-reveal="right"
            className="glass-tile inline-flex items-center gap-2 self-start px-4 py-2.5 text-sm font-medium lg:self-auto"
            style={{ color: 'var(--text-secondary)' }}
          >
            <FaLayerGroup size={13} style={{ color: 'var(--text-tertiary)' }} />
            {sortedSkills.length} skills
          </div>
        </div>

        <div data-reveal="rise" className="mb-10 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            <FaFilter size={11} />
            Level
          </span>
          <div
            className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-full border p-1.5"
            style={{ borderColor: 'var(--hairline)', backgroundColor: 'var(--surface-tile)' }}
          >
            {['All', 'Core', 'Advanced', 'Intermediate', 'Fundamentals'].map((band) => {
              const isActive = activeBand === band;

              return (
                <button
                  key={band}
                  type="button"
                  onClick={() => switchBand(band)}
                  className="rounded-full px-4 py-2 text-sm font-medium transition-colors duration-250"
                  style={{
                    color: isActive ? 'var(--text-bright)' : 'var(--text-tertiary)',
                    backgroundColor: isActive
                      ? 'color-mix(in srgb, var(--text-bright) 12%, transparent)'
                      : 'transparent',
                  }}
                >
                  {band} <span style={{ color: 'var(--text-muted)' }}>{bandCounts[band] || 0}</span>
                </button>
              );
            })}
          </div>
        </div>

        {visibleSkills.length > 0 ? (
          <div ref={gridRef} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-5" style={{ perspective: '1200px' }}>
            {visibleSkills.map((skill, index) => {
              const cleanName = String(skill.name).split('(')[0].trim();
              const iconName = skill.icon || cleanName;
              const levelBand = getLevelBand(skill.level);
              const accent = LEVEL_META[levelBand].accent;
              const skillLevel = Number(skill.level) || 0;

              return (
                <article
                  key={`${skill.name}-${index}`}
                  className="skill-card glass-tile p-6 transition-transform duration-300 hover:-translate-y-1"
                >
                  <div className="mb-5 flex items-start justify-between gap-2">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-2xl border"
                      style={{ backgroundColor: `color-mix(in srgb, ${accent} 10%, transparent)` }}
                    >
                      <SkillIcon iconName={iconName} cleanName={cleanName} accentColor={accentColor} />
                    </div>
                    <span className="text-xs font-medium uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>
                      {levelBand}
                    </span>
                  </div>

                  <h3 className="mb-4 text-lg font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
                    {cleanName}
                  </h3>

                  <div className="mb-2 flex items-center justify-between text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    <span>Proficiency</span>
                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{skillLevel}%</span>
                  </div>

                  <div className="h-1 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'color-mix(in srgb, var(--border-secondary) 35%, transparent)' }}>
                    <div
                      className="skill-bar h-1 rounded-full"
                      style={{
                        width: `${skillLevel}%`,
                        backgroundColor: accent,
                      }}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="glass-tile p-8 text-center">
            <h3 className="mb-2 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              No Skills In This Filter
            </h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              Try another level filter to view more technologies.
            </p>
          </div>
        )}

        {canExpand && (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
              className="pill-ghost"
            >
              {showAll ? 'Show Fewer Skills' : `Show All ${filteredCount} Skills`}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default TechStackCarousel;
