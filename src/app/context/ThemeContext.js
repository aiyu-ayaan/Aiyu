"use client";

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';

// Theme configuration constants
const VALID_THEMES = ['dark', 'light'];
const DEFAULT_THEME = 'dark';

const isValidTheme = (theme) => VALID_THEMES.includes(theme);

const ThemeContext = createContext({
  theme: DEFAULT_THEME,
  toggleTheme: () => { },
  mounted: false,
  activeThemeData: null,
  activeVariant: DEFAULT_THEME,
  switchVariant: () => { },
});

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

// Apply theme colors to CSS custom properties
const applyThemeColors = (variant, variantData) => {
  if (!variantData) return;

  const root = document.documentElement;

  // Apply background colors
  if (variantData.backgrounds) {
    root.style.setProperty('--bg-primary', variantData.backgrounds.primary);
    root.style.setProperty('--bg-secondary', variantData.backgrounds.secondary);
    root.style.setProperty('--bg-tertiary', variantData.backgrounds.tertiary);
    root.style.setProperty('--bg-surface', variantData.backgrounds.surface);
    root.style.setProperty('--bg-elevated', variantData.backgrounds.elevated);
    root.style.setProperty('--bg-hover', variantData.backgrounds.hover);
  }

  // Apply text colors
  if (variantData.text) {
    root.style.setProperty('--text-primary', variantData.text.primary);
    root.style.setProperty('--text-secondary', variantData.text.secondary);
    root.style.setProperty('--text-tertiary', variantData.text.tertiary);
    root.style.setProperty('--text-muted', variantData.text.muted);
    root.style.setProperty('--text-bright', variantData.text.bright);
  }

  // Apply accent colors
  if (variantData.accents) {
    root.style.setProperty('--accent-cyan', variantData.accents.cyan);
    root.style.setProperty('--accent-cyan-bright', variantData.accents.cyanBright);
    root.style.setProperty('--accent-purple', variantData.accents.purple);
    root.style.setProperty('--accent-purple-dark', variantData.accents.purpleDark);
    root.style.setProperty('--accent-purple-darker', variantData.accents.purpleDarker);
    root.style.setProperty('--accent-pink', variantData.accents.pink);
    root.style.setProperty('--accent-pink-bright', variantData.accents.pinkBright);
    root.style.setProperty('--accent-pink-hot', variantData.accents.pinkHot);
    root.style.setProperty('--accent-orange', variantData.accents.orange);
    root.style.setProperty('--accent-orange-bright', variantData.accents.orangeBright);
  }

  // Apply border colors
  if (variantData.borders) {
    root.style.setProperty('--border-primary', variantData.borders.primary);
    root.style.setProperty('--border-secondary', variantData.borders.secondary);
    root.style.setProperty('--border-accent', variantData.borders.accent);
    root.style.setProperty('--border-cyan', variantData.borders.cyan);
  }

  // Apply status colors
  if (variantData.status) {
    root.style.setProperty('--status-error', variantData.status.error);
    root.style.setProperty('--status-warning', variantData.status.warning);
    root.style.setProperty('--status-success', variantData.status.success);
    root.style.setProperty('--status-info', variantData.status.info);
  }

  // Apply syntax colors
  if (variantData.syntax) {
    root.style.setProperty('--syntax-comment', variantData.syntax.comment);
    root.style.setProperty('--syntax-keyword', variantData.syntax.keyword);
    root.style.setProperty('--syntax-control', variantData.syntax.control);
    root.style.setProperty('--syntax-function', variantData.syntax.function);
    root.style.setProperty('--syntax-class', variantData.syntax.class);
    root.style.setProperty('--syntax-string', variantData.syntax.string);
    root.style.setProperty('--syntax-number', variantData.syntax.number);
    root.style.setProperty('--syntax-variable', variantData.syntax.variable);
    root.style.setProperty('--syntax-property', variantData.syntax.property);
    root.style.setProperty('--syntax-operator', variantData.syntax.operator);
    root.style.setProperty('--syntax-punctuation', variantData.syntax.punctuation);
  }

  // Apply shadow and overlay colors
  if (variantData.shadows) {
    root.style.setProperty('--shadow-sm', variantData.shadows.sm);
    root.style.setProperty('--shadow-md', variantData.shadows.md);
    root.style.setProperty('--shadow-lg', variantData.shadows.lg);
  }

  if (variantData.overlays) {
    root.style.setProperty('--overlay-bg', variantData.overlays.bg);
    root.style.setProperty('--overlay-hover', variantData.overlays.hover);
  }
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [mounted, setMounted] = useState(false);
  const [activeThemeData, setActiveThemeData] = useState(null);
  const [activeVariant, setActiveVariant] = useState(DEFAULT_THEME);
  const [themeLoaded, setThemeLoaded] = useState(false);

  // Per-page theme logic
  const pathname = usePathname();
  const [globalThemeData, setGlobalThemeData] = useState(null); // Backup for global theme
  const [globalVariant, setGlobalVariant] = useState(DEFAULT_THEME);
  const [perPageConfig, setPerPageConfig] = useState({ enabled: false, pages: {} });
  const [themeCache, setThemeCache] = useState({}); // Cache for fetched themes

  // Fetch active theme from API - this is the source of truth
  useEffect(() => {
    const fetchActiveTheme = async () => {
      try {
        const response = await fetch('/api/themes/active');
        const data = await response.json();

        if (data.success && data.data.theme) {
          setActiveThemeData(data.data.theme);
          setGlobalThemeData(data.data.theme); // Store as global default

          // Use the variant from database as the source of truth
          const dbVariant = data.data.activeVariant || 'dark';
          setActiveVariant(dbVariant);
          setGlobalVariant(dbVariant);
          setTheme(dbVariant);

          if (data.data.perPageThemes) {
            setPerPageConfig(data.data.perPageThemes);
          }

          // Update localStorage to match database
          localStorage.setItem('themeVariant', dbVariant);

          setThemeLoaded(true);
        } else {
          // Fallback to localStorage only if API fails
          const savedVariant = localStorage.getItem('themeVariant');
          if (savedVariant && isValidTheme(savedVariant)) {
            setActiveVariant(savedVariant);
            setTheme(savedVariant);
          }
          setThemeLoaded(true);
        }
      } catch (error) {
        console.error('Failed to fetch active theme:', error);
        // Fallback to localStorage on error
        const savedVariant = localStorage.getItem('themeVariant');
        if (savedVariant && isValidTheme(savedVariant)) {
          setActiveVariant(savedVariant);
          setTheme(savedVariant);
        }
        setThemeLoaded(true);
      }
    };

    fetchActiveTheme();
    setMounted(true);
  }, []);

  // Helper to fetch theme data
  const fetchThemeData = useCallback(async (slug) => {
    if (!slug) return null;

    // Check cache first
    if (themeCache[slug]) return themeCache[slug];

    try {
      const res = await fetch(`/api/themes/${slug}`);
      const data = await res.json();
      if (data.success) {
        setThemeCache(prev => ({ ...prev, [slug]: data.data }));
        return data.data;
      }
    } catch (error) {
      console.error(`Failed to fetch theme ${slug}:`, error);
    }
    return null;
  }, [themeCache]);

  // Handle route changes and per-page themes
  useEffect(() => {
    if (!themeLoaded || !globalThemeData) return;

    const handleRouteChange = async () => {
      // Logic to determine if current path has a specific theme
      if (perPageConfig.enabled && perPageConfig.pages) {

        // Find matching rule
        // We look for exact match first, then prefix match for "Details" style paths if needed
        // Based on Admin UI:
        // /projects -> List
        // /projects/ -> Details (prefix)

        let targetThemeSlug = null;

        // 1. Exact match
        if (perPageConfig.pages[pathname]) {
          targetThemeSlug = perPageConfig.pages[pathname];
        }

        // 2. Prefix match (longest prefix wins)
        if (!targetThemeSlug) {
          const sortedPrefixes = Object.keys(perPageConfig.pages)
            .filter(key => key.endsWith('/')) // Only keys ending in / are treated as prefixes
            .sort((a, b) => b.length - a.length);

          for (const prefix of sortedPrefixes) {
            if (pathname.startsWith(prefix)) {
              targetThemeSlug = perPageConfig.pages[prefix];
              break;
            }
          }
        }

        if (targetThemeSlug) {
          // Check if we already have this data
          // If it's the global theme, just revert
          if (targetThemeSlug === globalThemeData.slug) {
            if (activeThemeData?.slug !== globalThemeData.slug) {
              setActiveThemeData(globalThemeData);
              // Optionally keep current variant or revert to global variant?
              // Usually per-page themes might want to enforce their own variant preference if stored,
              // but for now let's keep user's selected variant or global variant.
              // The requirement implies visual theme changes. 
            }
          } else {
            // Fetch and apply
            const newThemeData = await fetchThemeData(targetThemeSlug);
            if (newThemeData && newThemeData.slug !== activeThemeData?.slug) {
              setActiveThemeData(newThemeData);
            }
          }
          return;
        }
      }

      // Default: Revert to global theme if not already
      if (activeThemeData?.slug !== globalThemeData.slug) {
        setActiveThemeData(globalThemeData);
      }
    };

    handleRouteChange();
  }, [pathname, perPageConfig, themeLoaded, globalThemeData, fetchThemeData, activeThemeData]);

  // Apply theme when data is loaded and variant changes
  useEffect(() => {
    if (themeLoaded && activeThemeData) {
      const root = document.documentElement;
      root.setAttribute('data-theme', activeVariant);

      // Apply custom theme colors
      const variantData = activeThemeData.variants?.[activeVariant];
      if (variantData) {
        applyThemeColors(activeVariant, variantData);
      }
    }
  }, [activeThemeData, activeVariant, themeLoaded]);

  const toggleTheme = () => {
    const newVariant = theme === 'dark' ? 'light' : 'dark';
    setTheme(newVariant);
    setActiveVariant(newVariant);
    // Save user preference to localStorage (but this doesn't change the active theme in DB)
    localStorage.setItem('themeVariant', newVariant);
  };

  const switchVariant = (variant) => {
    if (isValidTheme(variant)) {
      setTheme(variant);
      setActiveVariant(variant);
      // Save user preference to localStorage
      localStorage.setItem('themeVariant', variant);
    }
  };

  return (
    <ThemeContext.Provider value={{
      theme,
      toggleTheme,
      mounted,
      activeThemeData,
      activeVariant,
      switchVariant
    }}>
      {children}
    </ThemeContext.Provider>
  );
};
