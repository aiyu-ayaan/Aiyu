"use client";

import { createContext, useContext, useState, useEffect } from 'react';

// Material 3 page themes with dynamic colors
const pageThemes = {
  home: {
    name: 'home',
    primary: '#6750A4',
    secondary: '#625B71',
    tertiary: '#7D5260',
  },
  about: {
    name: 'about',
    primary: '#00897B',
    secondary: '#4DB6AC',
    tertiary: '#00796B',
  },
  projects: {
    name: 'projects',
    primary: '#FF6F00',
    secondary: '#FFA726',
    tertiary: '#F57C00',
  },
  default: {
    name: 'default',
    primary: '#6750A4',
    secondary: '#625B71',
    tertiary: '#7D5260',
  },
};

const ThemeContext = createContext({
  theme: 'dark',
  toggleTheme: () => {},
  pageTheme: 'default',
  setPageTheme: () => {},
});

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

// Helper function to get initial theme
const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'dark';
  
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    return savedTheme;
  }
  
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
};

// Generate Material 3 color tokens from primary color
const generateM3Colors = (primaryColor, isDark) => {
  // This is a simplified version - Material 3 uses more sophisticated color generation
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };
  
  const rgb = hexToRgb(primaryColor);
  if (!rgb) return {};
  
  if (isDark) {
    return {
      '--m3-primary': primaryColor,
      '--m3-on-primary': '#FFFFFF',
      '--m3-primary-container': `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`,
      '--m3-on-primary-container': `rgba(${rgb.r + 50}, ${rgb.g + 50}, ${rgb.b + 50}, 1)`,
      '--m3-surface': '#1C1B1F',
      '--m3-on-surface': '#E6E1E5',
      '--m3-surface-variant': '#49454F',
      '--m3-on-surface-variant': '#CAC4D0',
      '--m3-outline': '#938F99',
      '--m3-shadow': 'rgba(0, 0, 0, 0.3)',
      '--m3-elevation-1': '0px 1px 3px 1px rgba(0, 0, 0, 0.15)',
      '--m3-elevation-2': '0px 2px 6px 2px rgba(0, 0, 0, 0.15)',
      '--m3-elevation-3': '0px 4px 8px 3px rgba(0, 0, 0, 0.15)',
    };
  } else {
    return {
      '--m3-primary': primaryColor,
      '--m3-on-primary': '#FFFFFF',
      '--m3-primary-container': `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`,
      '--m3-on-primary-container': `rgba(${Math.max(0, rgb.r - 80)}, ${Math.max(0, rgb.g - 80)}, ${Math.max(0, rgb.b - 80)}, 1)`,
      '--m3-surface': '#FFFBFE',
      '--m3-on-surface': '#1C1B1F',
      '--m3-surface-variant': '#E7E0EC',
      '--m3-on-surface-variant': '#49454F',
      '--m3-outline': '#79747E',
      '--m3-shadow': 'rgba(0, 0, 0, 0.15)',
      '--m3-elevation-1': '0px 1px 3px 1px rgba(0, 0, 0, 0.1)',
      '--m3-elevation-2': '0px 2px 6px 2px rgba(0, 0, 0, 0.1)',
      '--m3-elevation-3': '0px 4px 8px 3px rgba(0, 0, 0, 0.1)',
    };
  }
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getInitialTheme);
  const [pageTheme, setPageTheme] = useState('default');

  useEffect(() => {
    // Set initial theme attribute on mount
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-page-theme', pageTheme);
  }, []);

  useEffect(() => {
    // Update theme when it changes
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    // Apply Material 3 colors
    const currentPageTheme = pageThemes[pageTheme] || pageThemes.default;
    const m3Colors = generateM3Colors(currentPageTheme.primary, theme === 'dark');
    
    Object.entries(m3Colors).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [theme, pageTheme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, pageTheme, setPageTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
