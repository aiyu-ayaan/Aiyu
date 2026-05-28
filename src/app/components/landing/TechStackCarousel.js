"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FaCode, FaFilter, FaLayerGroup } from 'react-icons/fa';
import { useTheme } from '../../context/ThemeContext';
import { getIcon } from '../../../lib/iconLibrary';

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
  const skills = Array.isArray(data?.skills) ? data.skills : [];

  const [accentColor, setAccentColor] = useState(DEFAULT_ICON_COLOR);
  const [activeBand, setActiveBand] = useState('All');
  const [showAll, setShowAll] = useState(false);

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
    <section className="relative px-4 py-14 lg:px-8 lg:py-16">
      <div
        className="pointer-events-none absolute -left-20 top-14 h-64 w-64 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--accent-cyan) 28%, transparent), transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute -right-16 top-20 h-56 w-56 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--accent-purple) 25%, transparent), transparent 68%)' }}
      />

      <div
        className="relative mx-auto w-full max-w-[95%] lg:max-w-[80%] rounded-3xl border p-6 sm:p-8"
        style={{
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 93%, transparent), color-mix(in srgb, var(--bg-secondary) 93%, transparent))',
          borderColor: 'color-mix(in srgb, var(--border-secondary) 76%, transparent)',
          boxShadow: '0 16px 38px var(--shadow-sm)',
        }}
      >
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p
              className="mb-2 inline-flex rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em]"
              style={{
                borderColor: 'color-mix(in srgb, var(--accent-cyan) 45%, var(--border-secondary))',
                color: 'var(--accent-cyan)',
              }}
            >
              Tech Command Center
            </p>
            <h2 className="text-2xl font-bold sm:text-3xl lg:text-4xl" style={{ color: 'var(--text-primary)' }}>
              Technologies I Work With
            </h2>
            <p className="mt-2 max-w-2xl text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
              A structured view of my current stack, grouped by confidence and day-to-day usage.
            </p>
          </div>

          <div
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-wide"
            style={{
              borderColor: 'color-mix(in srgb, var(--accent-orange) 44%, var(--border-secondary))',
              color: 'var(--accent-orange)',
              backgroundColor: 'color-mix(in srgb, var(--accent-orange) 10%, transparent)',
            }}
          >
            <FaLayerGroup />
            {sortedSkills.length} Skills Listed
          </div>
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
            <FaFilter />
            Filter by level
          </span>
          {['All', 'Core', 'Advanced', 'Intermediate', 'Fundamentals'].map((band) => {
            const isActive = activeBand === band;
            const accent = band === 'All' ? 'var(--accent-cyan)' : LEVEL_META[band].accent;

            return (
              <button
                key={band}
                type="button"
                onClick={() => switchBand(band)}
                className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors duration-200"
                style={{
                  borderColor: isActive
                    ? `color-mix(in srgb, ${accent} 58%, var(--border-secondary))`
                    : 'color-mix(in srgb, var(--border-secondary) 76%, transparent)',
                  color: isActive ? accent : 'var(--text-secondary)',
                  backgroundColor: isActive
                    ? `color-mix(in srgb, ${accent} 12%, transparent)`
                    : 'color-mix(in srgb, var(--bg-elevated) 80%, transparent)',
                }}
              >
                {band} ({bandCounts[band] || 0})
              </button>
            );
          })}
        </div>

        {visibleSkills.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleSkills.map((skill, index) => {
              const cleanName = String(skill.name).split('(')[0].trim();
              const iconName = skill.icon || cleanName;
              const levelBand = getLevelBand(skill.level);
              const accent = LEVEL_META[levelBand].accent;
              const skillLevel = Number(skill.level) || 0;

              return (
                <motion.article
                  key={`${skill.name}-${index}`}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.3, delay: index * 0.03 }}
                  whileHover={{ y: -4 }}
                  className="rounded-2xl border p-4"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
                    backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 84%, transparent)',
                  }}
                >
                  <div className="mb-4 flex items-start justify-between gap-2">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-xl border"
                      style={{
                        borderColor: `color-mix(in srgb, ${accent} 44%, var(--border-secondary))`,
                        backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`,
                      }}
                    >
                      <SkillIcon iconName={iconName} cleanName={cleanName} accentColor={accentColor} />
                    </div>
                    <span
                      className="rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide"
                      style={{
                        borderColor: `color-mix(in srgb, ${accent} 45%, var(--border-secondary))`,
                        color: accent,
                        backgroundColor: `color-mix(in srgb, ${accent} 10%, transparent)`,
                      }}
                    >
                      {levelBand}
                    </span>
                  </div>

                  <h3 className="mb-2 text-base font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
                    {cleanName}
                  </h3>

                  <div className="mb-2 flex items-center justify-between text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    <span>Proficiency</span>
                    <span className="font-semibold" style={{ color: accent }}>{skillLevel}%</span>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'color-mix(in srgb, var(--bg-secondary) 82%, transparent)' }}>
                    <motion.div
                      className="h-2 rounded-full"
                      style={{
                        background: `linear-gradient(to right, ${accent}, color-mix(in srgb, ${accent} 60%, var(--accent-cyan)))`,
                      }}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${skillLevel}%` }}
                      viewport={{ once: true, amount: 0.8 }}
                      transition={{ duration: 0.9, ease: 'easeOut' }}
                    />
                  </div>
                </motion.article>
              );
            })}
          </div>
        ) : (
          <div
            className="rounded-2xl border p-7 text-center"
            style={{
              borderColor: 'color-mix(in srgb, var(--border-secondary) 76%, transparent)',
              backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 80%, transparent)',
            }}
          >
            <h3 className="mb-2 text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              No Skills In This Filter
            </h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              Try another level filter to view more technologies.
            </p>
          </div>
        )}

        {canExpand && (
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
              className="rounded-lg border px-4 py-2 text-sm font-semibold"
              style={{
                borderColor: 'var(--accent-cyan)',
                color: 'var(--accent-cyan)',
                backgroundColor: 'color-mix(in srgb, var(--accent-cyan) 10%, transparent)',
              }}
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
