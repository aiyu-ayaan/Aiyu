"use client";

import { createContext, useContext, useState, useEffect } from 'react';

// Theme configuration constants
const VALID_THEMES = ['dark', 'light'];
const DEFAULT_THEME = 'dark';

const isValidTheme = (theme) => VALID_THEMES.includes(theme);

const ThemeContext = createContext({
  theme: DEFAULT_THEME,
  toggleTheme: () => {},
  mounted: false,
});

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [mounted, setMounted] = useState(false);

  // Initialize theme from localStorage on mount (client-side only)
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme && isValidTheme(savedTheme)) {
      setTheme(savedTheme);
    } else {
      // Check system preference if no saved theme
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const systemTheme = prefersDark ? 'dark' : 'light';
      setTheme(systemTheme);
      localStorage.setItem('theme', systemTheme);
    }
    setMounted(true);
  }, []);

  // Update DOM and localStorage when theme changes
  useEffect(() => {
    if (mounted) {
      const root = document.documentElement;
      root.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
};
