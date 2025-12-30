"use client";

import { createContext, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { applyThemeColors } from '../../utils/themeUtils';

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



export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [mounted, setMounted] = useState(false);
  const [activeThemeData, setActiveThemeData] = useState(null);
  const [activeVariant, setActiveVariant] = useState(DEFAULT_THEME);
  const [themeLoaded, setThemeLoaded] = useState(false);

  const pathname = usePathname();
  const [themeCache, setThemeCache] = useState({});
  // Fallback to activeThemeData if per-page isn't active
  const [resolvedThemeData, setResolvedThemeData] = useState(null);

  // Fetch active theme and per-page config from API
  useEffect(() => {
    const fetchActiveTheme = async () => {
      try {
        const response = await fetch('/api/themes/active');
        const data = await response.json();

        if (data.success && data.data.theme) {
          const { theme, activeVariant, perPageThemes } = data.data;

          setActiveThemeData(theme);
          setResolvedThemeData(theme); // Default to global theme

          // Use the variant from database as the source of truth
          const dbVariant = activeVariant || 'dark';
          setActiveVariant(dbVariant);
          setTheme(dbVariant);

          // Update localStorage
          localStorage.setItem('themeVariant', dbVariant);

          // Initialize per-page config
          if (perPageThemes) {
            // Store global config in state if needed, but for now we rely on the effect below
            // to access the latest data. We might need a state for it.
            setPerPageConfig(perPageThemes);
          }

          setThemeLoaded(true);
        } else {
          // Fallback
          handleFallback();
        }
      } catch (error) {
        console.error('Failed to fetch active theme:', error);
        handleFallback();
      }
    };

    const handleFallback = () => {
      const savedVariant = localStorage.getItem('themeVariant');
      if (savedVariant && isValidTheme(savedVariant)) {
        setActiveVariant(savedVariant);
        setTheme(savedVariant);
      }
      setThemeLoaded(true);
    };

    fetchActiveTheme();
    setMounted(true);
  }, []);

  const [perPageConfig, setPerPageConfig] = useState(null);

  // Effect to handle per-page theme switching
  useEffect(() => {
    const handlePageTheme = async () => {
      if (!themeLoaded || !perPageConfig?.enabled) {
        // If disabled or not loaded, revert to global active theme
        if (activeThemeData && resolvedThemeData !== activeThemeData) {
          setResolvedThemeData(activeThemeData);
        }
        return;
      }

      // Check if current path has a theme
      // We use startsWith to handle sub-routes if needed, or exact match.
      // Let's assume exact match for now as per plan, or maybe closest match?
      // Simple map lookup is fastest for exact matches.

      // Convert Map to object if it came from JSON (it's likely a plain object from API)
      const pages = perPageConfig.pages || {};

      // 1. Exact match
      let targetThemeSlug = pages[pathname];

      // 2. Sub-page match (check if any configured page is a parent of current path)
      if (!targetThemeSlug) {
        // Find keys that the current pathname starts with (e.g., config has "/blogs/" and path is "/blogs/my-post")
        // Sort by length descending to match most specific parent first
        const parentUrl = Object.keys(pages)
          .filter(key => key !== '/' && pathname.startsWith(key))
          .sort((a, b) => b.length - a.length)[0];

        if (parentUrl) {
          targetThemeSlug = pages[parentUrl];
        }
      }

      if (targetThemeSlug) {
        // Check cache first
        if (themeCache[targetThemeSlug]) {
          setResolvedThemeData(themeCache[targetThemeSlug]);
          return;
        }

        // Fetch theme data
        try {
          const res = await fetch(`/api/themes/${targetThemeSlug}`);
          const data = await res.json();
          if (data.success) {
            setThemeCache(prev => ({ ...prev, [targetThemeSlug]: data.data }));
            setResolvedThemeData(data.data);
          }
        } catch (e) {
          console.error(`Failed to fetch theme ${targetThemeSlug}`, e);
        }
      } else {
        // Revert to global active theme
        if (activeThemeData && resolvedThemeData !== activeThemeData) {
          setResolvedThemeData(activeThemeData);
        }
      }
    };

    handlePageTheme();
  }, [pathname, perPageConfig, themeLoaded, activeThemeData]); // Removed resolvedThemeData from dependency to avoid loop

  // Apply theme when data is loaded and variant changes
  useEffect(() => {
    if (themeLoaded && resolvedThemeData) {
      const root = document.documentElement;
      root.setAttribute('data-theme', activeVariant);

      // Apply custom theme colors
      const variantData = resolvedThemeData.variants?.[activeVariant];
      if (variantData) {
        applyThemeColors(activeVariant, variantData);
      }
    }
  }, [resolvedThemeData, activeVariant, themeLoaded]); // Use resolvedThemeData instead of activeThemeData

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
      activeThemeData: resolvedThemeData,
      activeVariant,
      switchVariant
    }}>
      {children}
    </ThemeContext.Provider>
  );
};
