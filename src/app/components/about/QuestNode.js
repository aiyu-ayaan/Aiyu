"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaBriefcase, FaGraduationCap, FaCertificate, FaCheckCircle, FaStar, FaLock } from 'react-icons/fa';

// Map icons based on node type
const getIcon = (type) => {
  switch (type) {
    case 'experience':
      return <FaBriefcase className="h-5 w-5" />;
    case 'education':
      return <FaGraduationCap className="h-6 w-6" />;
    case 'certification':
      return <FaCertificate className="h-5 w-5" />;
    default:
      return <FaStar className="h-5 w-5" />;
  }
};

// Map colors based on node type
const getThemeColor = (type) => {
  switch (type) {
    case 'experience':
      return {
        primary: 'var(--accent-orange-bright)',
        glow: 'var(--accent-orange)',
        bg: 'color-mix(in srgb, var(--accent-orange) 15%, transparent)',
        badge: 'border-[var(--accent-orange)] text-[var(--accent-orange-bright)] bg-amber-950/20',
      };
    case 'education':
      return {
        primary: 'var(--accent-purple)',
        glow: 'var(--accent-purple)',
        bg: 'color-mix(in srgb, var(--accent-purple) 15%, transparent)',
        badge: 'border-[var(--accent-purple)] text-[var(--accent-purple)] bg-purple-950/20',
      };
    case 'certification':
      return {
        primary: 'var(--accent-pink)',
        glow: 'var(--accent-pink)',
        bg: 'color-mix(in srgb, var(--accent-pink) 15%, transparent)',
        badge: 'border-[var(--accent-pink)] text-[var(--accent-pink)] bg-pink-950/20',
      };
    default:
      return {
        primary: 'var(--accent-cyan)',
        glow: 'var(--accent-cyan)',
        bg: 'color-mix(in srgb, var(--accent-cyan) 15%, transparent)',
        badge: 'border-[var(--accent-cyan)] text-[var(--accent-cyan)] bg-cyan-950/20',
      };
  }
};

const QuestNode = ({ item, index, x, y, isActive, isUnlocked, onNodeClick, isMobile }) => {
  const { type, role, company, duration, description, skills = [], url } = item;
  const theme = getThemeColor(type);
  const direction = index % 2 === 0 ? -1 : 1; // Left or Right

  // Node position styles
  const nodeStyle = {
    position: 'absolute',
    left: `${x}px`,
    top: `${y}px`,
    transform: 'translate(-50%, -50%)',
    zIndex: 10,
  };

  // Card position styles
  const mobileCardStyle = {
    position: 'absolute',
    left: '50%',
    top: `${y + 45}px`,
  };

  const desktopCardStyle = direction === -1
    ? { left: `${x + 60}px`, top: `${y}px`, transform: 'translateY(-50%)' }
    : { right: `calc(100% - ${x - 60}px)`, top: `${y}px`, transform: 'translateY(-50%)' };

  const cardStyle = isMobile ? mobileCardStyle : desktopCardStyle;

  return (
    <div className="contents">
      {/* Level Node (The Circle) */}
      <div style={nodeStyle}>
        <motion.button
          onClick={() => isUnlocked && onNodeClick(index)}
          disabled={!isUnlocked}
          whileHover={isUnlocked ? { scale: 1.15 } : {}}
          whileTap={isUnlocked ? { scale: 0.95 } : {}}
          className={`relative flex h-16 w-16 items-center justify-center rounded-full border-4 shadow-xl transition-all duration-300 ${
            !isUnlocked ? 'cursor-not-allowed border-gray-600 bg-gray-900 text-gray-500' : 'cursor-pointer'
          }`}
          style={{
            borderColor: isUnlocked ? theme.primary : 'var(--border-secondary)',
            background: isUnlocked
              ? `radial-gradient(circle, var(--bg-surface) 60%, ${theme.bg} 100%)`
              : 'var(--bg-elevated)',
            boxShadow: isUnlocked && isActive
              ? `0 0 25px ${theme.glow}, inset 0 0 10px ${theme.glow}`
              : isUnlocked
              ? `0 0 12px ${theme.glow}`
              : 'none',
          }}
        >
          {/* Active indicator ring */}
          {isUnlocked && isActive && (
            <motion.span
              animate={{ scale: [1, 1.25, 1], opacity: [0.7, 0, 0.7] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -inset-2 rounded-full border-2"
              style={{ borderColor: theme.primary }}
            />
          )}

          {/* Icon */}
          <span style={{ color: isUnlocked ? theme.primary : 'var(--text-muted)' }}>
            {!isUnlocked ? <FaLock className="h-4 w-4 text-gray-600" /> : getIcon(type)}
          </span>

          {/* Node Number Badge */}
          <span
            className="absolute -bottom-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold shadow-md"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: isUnlocked ? theme.primary : 'var(--border-secondary)',
              color: isUnlocked ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            {index + 1}
          </span>
        </motion.button>
      </div>

      {/* Quest Details Card */}
      <AnimatePresence>
        {isUnlocked && isActive && (
          <motion.div
            initial={isMobile ? { opacity: 0, scale: 0.9, x: '-50%', y: 15 } : { opacity: 0, scale: 0.9, y: '-50%' }}
            animate={isMobile ? { opacity: 1, scale: 1, x: '-50%', y: 0 } : { opacity: 1, scale: 1, y: '-50%' }}
            exit={isMobile ? { opacity: 0, scale: 0.9, x: '-50%', y: 15 } : { opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3, cubicBezier: [0.34, 1.56, 0.64, 1] }}
            className="w-[calc(100%-16px)] max-w-[340px] sm:max-w-none sm:w-[360px] md:w-[420px] rounded-2xl border p-5 shadow-2xl backdrop-blur-md absolute z-20"
            style={{
              ...cardStyle,
              background: 'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 95%, transparent), color-mix(in srgb, var(--bg-secondary) 92%, transparent))',
              borderColor: isActive ? theme.primary : 'var(--border-secondary)',
              boxShadow: isActive ? `0 10px 30px rgba(0,0,0,0.5), 0 0 15px color-mix(in srgb, ${theme.glow} 20%, transparent)` : '0 10px 30px rgba(0,0,0,0.4)',
            }}
          >
            {/* Speech Bubble Pointer (Desktop only) */}
            {!isMobile && (
              <div
                className="absolute top-1/2 h-4 w-4 rotate-45 border-b border-l"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: isActive ? theme.primary : 'var(--border-secondary)',
                  ...(direction === -1
                    ? { left: '-9px', borderRight: 'none', borderTop: 'none', transform: 'translateY(-50%) rotate(45deg)' }
                    : { right: '-9px', borderLeft: 'none', borderBottom: 'none', transform: 'translateY(-50%) rotate(45deg)' }),
                }}
              />
            )}

            {/* Card Content */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${theme.badge}`}>
                  {type === 'experience' ? 'Job Quest' : type === 'education' ? 'Education Quest' : 'Mastery Scroll'}
                </span>
                <span className="text-xs font-semibold text-gray-400" style={{ color: 'var(--text-muted)' }}>
                  {duration}
                </span>
              </div>

              <div>
                {url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-1.5 hover:underline"
                  >
                    <h3 className="text-lg font-bold tracking-wide transition-colors group-hover:text-cyan-400" style={{ color: 'var(--text-primary)' }}>
                      {role}
                    </h3>
                  </a>
                ) : (
                  <h3 className="text-lg font-bold tracking-wide" style={{ color: 'var(--text-primary)' }}>
                    {role}
                  </h3>
                )}
                <p className="text-sm font-semibold mt-0.5" style={{ color: theme.primary }}>
                  {company}
                </p>
              </div>

              {description && (
                <p className="text-sm mt-1 leading-relaxed border-l-2 pl-3 py-0.5 border-gray-700" style={{ color: 'var(--text-secondary)' }}>
                  {description}
                </p>
              )}

              {/* Skills/Loot Rewards */}
              {skills.length > 0 && (
                <div className="mt-3">
                  <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-amber-500/90 mb-1.5">
                    <FaCheckCircle className="h-3 w-3 text-amber-500" /> Reward Loot:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-md border px-2 py-0.5 text-xs font-medium"
                        style={{
                          borderColor: 'color-mix(in srgb, var(--accent-cyan) 35%, var(--border-secondary))',
                          color: 'var(--accent-cyan)',
                          backgroundColor: 'color-mix(in srgb, var(--accent-cyan) 8%, transparent)',
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default QuestNode;
