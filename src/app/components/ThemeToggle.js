"use client";

import clsx from 'clsx';
import { motion } from 'framer-motion';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const MODE_ORDER = ['auto', 'dark', 'light'];

const MODE_META = {
  auto: { label: 'Auto', icon: Monitor },
  dark: { label: 'Dark', icon: Moon },
  light: { label: 'Light', icon: Sun },
};

export default function ThemeToggle({ compact = false }) {
  const { themeMode, setThemeMode, mounted } = useTheme();

  const safeMode = MODE_META[themeMode] ? themeMode : 'auto';
  const currentIndex = MODE_ORDER.indexOf(safeMode);
  const nextMode = MODE_ORDER[(currentIndex + 1) % MODE_ORDER.length];
  const currentMeta = MODE_META[safeMode];
  const nextMeta = MODE_META[nextMode];
  const Icon = currentMeta.icon;

  if (!mounted) {
    return (
      <div
        className={clsx(
          "inline-flex items-center rounded-full border",
          compact ? "h-9 w-9 justify-center" : "h-9 px-3"
        )}
        style={{
          borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
          backgroundColor: 'color-mix(in srgb, var(--bg-surface) 92%, transparent)',
        }}
        aria-label="Loading theme button"
      />
    );
  }

  return (
    <motion.button
      type="button"
      onClick={() => setThemeMode(nextMode)}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border text-sm font-semibold",
        compact ? "h-9 w-9 justify-center" : "h-9 px-3"
      )}
      style={{
        borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
        backgroundColor: 'color-mix(in srgb, var(--bg-surface) 92%, transparent)',
        color: 'var(--text-primary)',
      }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      aria-label={`Theme mode: ${currentMeta.label}. Click to switch to ${nextMeta.label}.`}
      title={`Theme: ${currentMeta.label} -> ${nextMeta.label}`}
    >
      <Icon size={14} style={{ color: 'var(--accent-cyan)' }} />
      {!compact && <span>{currentMeta.label}</span>}
    </motion.button>
  );
}
