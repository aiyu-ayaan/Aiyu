"use client";

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const VALID_VARIANTS = ['dark', 'light'];
const VALID_THEME_MODES = ['auto', 'dark', 'light'];
const DEFAULT_VARIANT = 'dark';
const DEFAULT_THEME_MODE = 'auto';

const isValidVariant = (variant) => VALID_VARIANTS.includes(variant);
const isValidThemeMode = (mode) => VALID_THEME_MODES.includes(mode);

const getSystemVariant = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return DEFAULT_VARIANT;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const ThemeContext = createContext({
  theme: DEFAULT_VARIANT,
  themeMode: DEFAULT_THEME_MODE,
  setThemeMode: () => { },
  toggleTheme: () => { },
  mounted: false,
  activeThemeData: null,
  activeVariant: DEFAULT_VARIANT,
  resolvedTheme: DEFAULT_VARIANT,
  switchVariant: () => { },
});

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

const applyThemeColors = (variant, variantData) => {
  if (!variantData) return;

  const root = document.documentElement;

  if (variantData.backgrounds) {
    root.style.setProperty('--bg-primary', variantData.backgrounds.primary);
    root.style.setProperty('--bg-secondary', variantData.backgrounds.secondary);
    root.style.setProperty('--bg-tertiary', variantData.backgrounds.tertiary);
    root.style.setProperty('--bg-surface', variantData.backgrounds.surface);
    root.style.setProperty('--bg-elevated', variantData.backgrounds.elevated);
    root.style.setProperty('--bg-hover', variantData.backgrounds.hover);
  }

  if (variantData.text) {
    root.style.setProperty('--text-primary', variantData.text.primary);
    root.style.setProperty('--text-secondary', variantData.text.secondary);
    root.style.setProperty('--text-tertiary', variantData.text.tertiary);
    root.style.setProperty('--text-muted', variantData.text.muted);
    root.style.setProperty('--text-bright', variantData.text.bright);
  }

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

  if (variantData.borders) {
    root.style.setProperty('--border-primary', variantData.borders.primary);
    root.style.setProperty('--border-secondary', variantData.borders.secondary);
    root.style.setProperty('--border-accent', variantData.borders.accent);
    root.style.setProperty('--border-cyan', variantData.borders.cyan);
  }

  if (variantData.status) {
    root.style.setProperty('--status-error', variantData.status.error);
    root.style.setProperty('--status-warning', variantData.status.warning);
    root.style.setProperty('--status-success', variantData.status.success);
    root.style.setProperty('--status-info', variantData.status.info);
  }

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
  const [mounted, setMounted] = useState(false);
  const [themeLoaded, setThemeLoaded] = useState(false);

  const [themeMode, setThemeModeState] = useState(DEFAULT_THEME_MODE);
  const [resolvedTheme, setResolvedTheme] = useState(DEFAULT_VARIANT);
  const [activeVariant, setActiveVariant] = useState(DEFAULT_VARIANT);
  const [activeThemeData, setActiveThemeData] = useState(null);

  const pathname = usePathname();
  const [globalThemeData, setGlobalThemeData] = useState(null);
  const [perPageConfig, setPerPageConfig] = useState({ enabled: false, pages: {} });
  const [themeCache, setThemeCache] = useState({});

  const resolveThemeByMode = useCallback((mode, fallbackVariant = DEFAULT_VARIANT) => {
    if (mode === 'auto') {
      const systemTheme = getSystemVariant();
      return isValidVariant(systemTheme) ? systemTheme : fallbackVariant;
    }
    if (isValidVariant(mode)) return mode;
    return fallbackVariant;
  }, []);

  useEffect(() => {
    const fetchActiveTheme = async () => {
      const savedMode = localStorage.getItem('themeMode');
      const legacyVariant = localStorage.getItem('themeVariant') || localStorage.getItem('theme');
      const initialMode = isValidThemeMode(savedMode)
        ? savedMode
        : (isValidVariant(legacyVariant) ? legacyVariant : DEFAULT_THEME_MODE);

      try {
        const response = await fetch('/api/themes/active');
        const data = await response.json();

        if (data.success && data.data.theme) {
          setActiveThemeData(data.data.theme);
          setGlobalThemeData(data.data.theme);

          const dbVariant = isValidVariant(data.data.activeVariant)
            ? data.data.activeVariant
            : DEFAULT_VARIANT;

          setThemeModeState(initialMode);
          const nextResolved = resolveThemeByMode(initialMode, dbVariant);
          setResolvedTheme(nextResolved);
          setActiveVariant(nextResolved);

          if (data.data.perPageThemes) {
            setPerPageConfig(data.data.perPageThemes);
          }
        } else {
          setThemeModeState(initialMode);
          const fallbackResolved = resolveThemeByMode(initialMode, DEFAULT_VARIANT);
          setResolvedTheme(fallbackResolved);
          setActiveVariant(fallbackResolved);
        }
      } catch (error) {
        console.error('Failed to fetch active theme:', error);
        setThemeModeState(initialMode);
        const fallbackResolved = resolveThemeByMode(initialMode, DEFAULT_VARIANT);
        setResolvedTheme(fallbackResolved);
        setActiveVariant(fallbackResolved);
      } finally {
        localStorage.setItem('themeMode', initialMode);
        if (initialMode === 'auto') {
          localStorage.removeItem('themeVariant');
          localStorage.setItem('theme', 'auto');
        } else {
          localStorage.setItem('themeVariant', initialMode);
          localStorage.setItem('theme', initialMode);
        }

        setThemeLoaded(true);
      }
    };

    fetchActiveTheme();
    setMounted(true);
  }, [resolveThemeByMode]);

  const fetchThemeData = useCallback(async (slug) => {
    if (!slug) return null;

    if (themeCache[slug]) return themeCache[slug];

    try {
      const res = await fetch(`/api/themes/${slug}`);
      const data = await res.json();
      if (data.success) {
        setThemeCache((prev) => ({ ...prev, [slug]: data.data }));
        return data.data;
      }
    } catch (error) {
      console.error(`Failed to fetch theme ${slug}:`, error);
    }
    return null;
  }, [themeCache]);

  useEffect(() => {
    if (!themeLoaded || !globalThemeData) return;

    const handleRouteChange = async () => {
      if (perPageConfig.enabled && perPageConfig.pages) {
        let targetThemeSlug = null;

        if (perPageConfig.pages[pathname]) {
          targetThemeSlug = perPageConfig.pages[pathname];
        }

        if (!targetThemeSlug) {
          const sortedPrefixes = Object.keys(perPageConfig.pages)
            .filter((key) => key.endsWith('/'))
            .sort((a, b) => b.length - a.length);

          for (const prefix of sortedPrefixes) {
            if (pathname.startsWith(prefix)) {
              targetThemeSlug = perPageConfig.pages[prefix];
              break;
            }
          }
        }

        if (targetThemeSlug) {
          if (targetThemeSlug === globalThemeData.slug) {
            if (activeThemeData?.slug !== globalThemeData.slug) {
              setActiveThemeData(globalThemeData);
            }
          } else {
            const newThemeData = await fetchThemeData(targetThemeSlug);
            if (newThemeData && newThemeData.slug !== activeThemeData?.slug) {
              setActiveThemeData(newThemeData);
            }
          }
          return;
        }
      }

      if (activeThemeData?.slug !== globalThemeData.slug) {
        setActiveThemeData(globalThemeData);
      }
    };

    handleRouteChange();
  }, [pathname, perPageConfig, themeLoaded, globalThemeData, fetchThemeData, activeThemeData]);

  useEffect(() => {
    if (!mounted || themeMode !== 'auto') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handlePreferenceChange = () => {
      const systemTheme = mediaQuery.matches ? 'dark' : 'light';
      setResolvedTheme(systemTheme);
      setActiveVariant(systemTheme);
    };

    handlePreferenceChange();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handlePreferenceChange);
      return () => mediaQuery.removeEventListener('change', handlePreferenceChange);
    }

    mediaQuery.addListener(handlePreferenceChange);
    return () => mediaQuery.removeListener(handlePreferenceChange);
  }, [themeMode, mounted]);

  useEffect(() => {
    if (!mounted || themeMode === 'auto') return;
    const explicitTheme = resolveThemeByMode(themeMode, DEFAULT_VARIANT);
    setResolvedTheme(explicitTheme);
    setActiveVariant(explicitTheme);
  }, [mounted, resolveThemeByMode, themeMode]);

  useEffect(() => {
    if (!themeLoaded) return;

    const root = document.documentElement;
    root.setAttribute('data-theme', resolvedTheme);

    if (activeThemeData?.variants) {
      const variantData = activeThemeData.variants[resolvedTheme] || activeThemeData.variants[DEFAULT_VARIANT];
      if (variantData) {
        applyThemeColors(resolvedTheme, variantData);
      }
    }
  }, [activeThemeData, resolvedTheme, themeLoaded]);

  const setThemeMode = useCallback((mode) => {
    if (!isValidThemeMode(mode)) return;

    const resolved = resolveThemeByMode(mode, activeVariant || DEFAULT_VARIANT);
    setThemeModeState(mode);
    setResolvedTheme(resolved);
    setActiveVariant(resolved);

    localStorage.setItem('themeMode', mode);
    if (mode === 'auto') {
      localStorage.removeItem('themeVariant');
      localStorage.setItem('theme', 'auto');
    } else {
      localStorage.setItem('themeVariant', mode);
      localStorage.setItem('theme', mode);
    }
  }, [activeVariant, resolveThemeByMode]);

  const toggleTheme = useCallback(() => {
    const nextVariant = resolvedTheme === 'dark' ? 'light' : 'dark';
    setThemeMode(nextVariant);
  }, [resolvedTheme, setThemeMode]);

  const switchVariant = useCallback((variant) => {
    if (isValidVariant(variant)) {
      setThemeMode(variant);
    }
  }, [setThemeMode]);

  return (
    <ThemeContext.Provider
      value={{
        theme: resolvedTheme,
        themeMode,
        setThemeMode,
        toggleTheme,
        mounted,
        activeThemeData,
        activeVariant,
        resolvedTheme,
        switchVariant,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
