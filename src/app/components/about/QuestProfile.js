"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { FaUserShield, FaCrown, FaHeart, FaFire } from 'react-icons/fa';

const QuestProfile = ({ data }) => {
  const {
    name = 'Developer',
    roles = [],
    skills = [],
    experiences = [],
    education = [],
    certifications = [],
  } = data || {};

  const role = roles[0] || 'Software Adventurer';

  // Calculate RPG metrics based on actual data
  const totalCompletedQuests = experiences.length + education.length + certifications.length;
  const level = 10 + totalCompletedQuests * 3;
  const totalSkillsCount = skills.length;
  
  // Stats
  const intelligence = 20 + totalSkillsCount * 2; // INT (Technical capacity)
  const vitality = 30 + experiences.length * 12; // VIT (Years/roles in industry)
  const wisdom = 25 + education.length * 15;     // WIS (Formal schooling/degrees)
  const dexterity = 15 + certifications.length * 10; // DEX (Credentials/validated speed)
  
  // Calculate XP percentage to next level
  const xpProgress = Math.min(100, Math.max(15, (totalCompletedQuests % 5) * 20 + 20));

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="mb-8 overflow-hidden rounded-3xl border p-4 sm:p-6 shadow-2xl backdrop-blur-md"
      style={{
        background: 'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 92%, transparent), color-mix(in srgb, var(--bg-secondary) 88%, transparent))',
        borderColor: 'color-mix(in srgb, var(--accent-cyan) 30%, var(--border-secondary))',
        boxShadow: '0 8px 32px var(--shadow-sm), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Left Side: Avatar Details */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="relative flex-shrink-0">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border bg-gradient-to-br shadow-inner"
              style={{
                borderColor: 'var(--accent-cyan)',
                backgroundImage: 'linear-gradient(135deg, color-mix(in srgb, var(--accent-cyan) 20%, transparent), color-mix(in srgb, var(--accent-purple) 20%, transparent))',
              }}
            >
              <FaUserShield className="h-10 w-10 text-cyan-400" style={{ color: 'var(--accent-cyan)' }} />
            </div>
            <motion.div 
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border bg-yellow-500 shadow-md"
              style={{ borderColor: 'var(--accent-orange)' }}
            >
              <FaCrown className="h-4 w-4 text-white" />
            </motion.div>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-bold tracking-wide" style={{ color: 'var(--text-primary)' }}>
                {name}
              </h2>
              <span className="rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--accent-cyan) 15%, transparent)',
                  color: 'var(--accent-cyan)',
                  border: '1px solid color-mix(in srgb, var(--accent-cyan) 30%, transparent)'
                }}
              >
                Level {level}
              </span>
            </div>
            <p className="text-sm font-medium tracking-wide" style={{ color: 'var(--text-secondary)' }}>
              {role}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              <span className="flex items-center gap-1 whitespace-nowrap">
                <FaHeart className="text-red-500" /> HP: 100%
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="flex items-center gap-1 whitespace-nowrap">
                <FaFire className="text-orange-500" /> Mana: Max
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="rounded bg-emerald-950/40 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] text-emerald-400 font-bold uppercase whitespace-nowrap">
                Active status: Open to Quests
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: XP and RPG Attributes */}
        <div className="w-full lg:flex-1 max-w-xl">
          {/* XP Progress Bar */}
          <div className="mb-4">
            <div className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-wider">
              <span style={{ color: 'var(--text-secondary)' }}>Experience Points (XP)</span>
              <span style={{ color: 'var(--accent-purple)' }}>{xpProgress}% to Level Up</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full border"
              style={{ 
                backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 85%, transparent)',
                borderColor: 'var(--border-secondary)',
              }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(to right, var(--accent-cyan), var(--accent-purple))',
                }}
                initial={{ width: 0 }}
                animate={{ width: `${xpProgress}%` }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-center">
            {[
              { label: 'INT (Tech)', val: intelligence, color: 'var(--accent-cyan)' },
              { label: 'VIT (Exp)', val: vitality, color: 'var(--accent-orange)' },
              { label: 'WIS (Edu)', val: wisdom, color: 'var(--accent-purple)' },
              { label: 'DEX (Cert)', val: dexterity, color: 'var(--accent-pink)' },
            ].map((stat) => (
              <div 
                key={stat.label}
                className="rounded-xl border p-2 text-xs shadow-sm transition-transform duration-300 hover:scale-[1.05]"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 70%, transparent)',
                  borderColor: 'color-mix(in srgb, ' + stat.color + ' 20%, var(--border-secondary))',
                }}
              >
                <div className="font-bold uppercase tracking-wider text-[10px] whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                  {stat.label}
                </div>
                <div className="mt-1 text-lg font-bold" style={{ color: stat.color }}>
                  {stat.val}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default QuestProfile;
