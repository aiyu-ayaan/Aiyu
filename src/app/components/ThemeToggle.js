"use client";

import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

// Theme toggle color constants - Material Design
const TOGGLE_COLORS = {
  dark: {
    background: '#bb86fc',
    knob: '#121212',
  },
  light: {
    background: '#6200ea',
    knob: '#ffffff',
  },
};

export default function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();

  // Prevent hydration mismatch by rendering a placeholder until mounted
  if (!mounted) {
    return (
      <div
        className="relative w-14 h-7 rounded-full p-1"
        style={{ backgroundColor: TOGGLE_COLORS.dark.background }}
        aria-label="Loading theme toggle"
      >
        <div
          className="w-5 h-5 rounded-full"
          style={{ backgroundColor: TOGGLE_COLORS.dark.knob }}
        />
      </div>
    );
  }

  const isDark = theme === 'dark';
  const colors = isDark ? TOGGLE_COLORS.dark : TOGGLE_COLORS.light;

  return (
    <motion.button
      onClick={toggleTheme}
      className="relative w-14 h-7 rounded-full p-1 transition-colors duration-200 focus:outline-none"
      style={{
        backgroundColor: colors.background,
        boxShadow: 'var(--shadow-sm)',
      }}
      whileHover={{ boxShadow: 'var(--shadow-md)' }}
      whileTap={{ scale: 0.98 }}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      role="switch"
      aria-checked={isDark}
    >
      <motion.div
        className="w-5 h-5 rounded-full flex items-center justify-center shadow-md"
        style={{
          backgroundColor: colors.knob,
        }}
        initial={false}
        animate={{
          x: isDark ? 0 : 28,
        }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30,
        }}
      >
        {isDark ? (
          <svg
            className="w-3 h-3 text-white"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        ) : (
          <svg
            className="w-3 h-3 text-white"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </motion.div>
    </motion.button>
  );
}
