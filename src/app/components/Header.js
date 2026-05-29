"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, memo } from 'react';
import clsx from 'clsx';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';
import { ArrowUpRight, Menu, Search, X } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../context/ThemeContext';
import TerminalPath from './admin/TerminalPath';
import useDevicePerformance from '../hooks/useDevicePerformance';
import '../styles/header.css';

const SCROLL_DOWN_THRESHOLD = 72;
const SCROLL_UP_THRESHOLD = 24;
const ROUTE_ALIASES = [
  ['/live-deployments', '/apps'],
  ['/deployments', '/apps'],
  ['/contact', '/contact-us'],
  ['/about', '/about-me'],
  ['/blog', '/blogs'],
];

const normalizePath = (value) => {
  const path = String(value || '').trim();
  if (!path) return '/';

  const stripped = path.split('?')[0].split('#')[0];
  if (stripped === '/') return '/';
  return stripped.endsWith('/') ? stripped.slice(0, -1) : stripped;
};

const canonicalizePath = (value) => {
  const normalized = normalizePath(value);

  for (const [from, to] of ROUTE_ALIASES) {
    if (normalized === from) return to;
    if (normalized.startsWith(`${from}/`)) {
      return `${to}${normalized.slice(from.length)}`;
    }
  }

  return normalized;
};

const isRouteMatch = (pathname, href) => {
  const current = canonicalizePath(pathname);
  const route = canonicalizePath(href);

  if (route === '/') return current === '/';
  return current === route || current.startsWith(`${route}/`);
};

export default memo(function Header({ data, logoText, socialData, config }) {
  const { navLinks, contactLink } = data || { navLinks: [], contactLink: {} };
  const visibleNavLinks = navLinks.filter((link) => link.visible !== false);
  const displayLogo = logoText || "< aiyu />";

  const pathname = usePathname();
  const isBlogsRoute = pathname?.startsWith('/blogs');
  const isContentHeavyRoute = pathname?.startsWith('/blogs');
  const { theme } = useTheme();
  const { prefersReducedMotion } = useDevicePerformance();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isTerminalOutputOpen, setIsTerminalOutputOpen] = useState(false);
  const overflowRestoreRef = useRef({ body: null, html: null });
  const { scrollYProgress } = useScroll();
  const progressScaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 20,
    restDelta: 0.001,
  });
  const progressOpacity = useTransform(progressScaleX, [0, 0.01], [0, 1]);

  useEffect(() => {
    let ticking = false;

    const updateScrollState = () => {
      const y = window.scrollY;
      setScrolled((prev) => {
        const next = prev ? y > SCROLL_UP_THRESHOLD : y > SCROLL_DOWN_THRESHOLD;
        return prev === next ? prev : next;
      });
      ticking = false;
    };

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(updateScrollState);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!isMenuOpen) {
      if (overflowRestoreRef.current.body !== null) {
        document.body.style.overflow = overflowRestoreRef.current.body;
        document.documentElement.style.overflow = overflowRestoreRef.current.html;
        overflowRestoreRef.current = { body: null, html: null };
      }
      return;
    }

    overflowRestoreRef.current = {
      body: document.body.style.overflow,
      html: document.documentElement.style.overflow,
    };

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      if (overflowRestoreRef.current.body !== null) {
        document.body.style.overflow = overflowRestoreRef.current.body;
        document.documentElement.style.overflow = overflowRestoreRef.current.html;
        overflowRestoreRef.current = { body: null, html: null };
      }
    };
  }, [isMenuOpen]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <header className={clsx("sticky top-0 z-50 px-3 pb-0 pt-3 sm:px-4 lg:px-6", isBlogsRoute && "hidden")}>
        <div
          className={clsx(
            "mx-auto w-full max-w-[95%] lg:max-w-[80%] rounded-2xl border transition-all duration-300 relative",
            !isTerminalOutputOpen && "overflow-hidden",
            scrolled ? "header-scrolled" : "header-normal",
            isTerminalOutputOpen && "terminal-output-open",
            isContentHeavyRoute && "heavy-route"
          )}
        >
           {/* Water-fill progress bar following theme - left to right with continuous wavy edge */}
           {!prefersReducedMotion && (
             <motion.div
               className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden"
               style={{
                 scaleX: progressScaleX,
                 opacity: progressOpacity,
                 transformOrigin: 'left',
                 willChange: 'transform, opacity',
                 pointerEvents: 'none',
                 zIndex: 1,
               }}
             >
               {/* Base water fill */}
               <div
                 style={{
                   position: 'absolute',
                   inset: 0,
                   background: `linear-gradient(to right, 
                     color-mix(in srgb, var(--accent-cyan) 15%, transparent) 0%,
                     color-mix(in srgb, var(--accent-purple) 12%, transparent) 100%)`,
                 }}
               />
               
               {/* Wavy edge animation */}
               <div
                 className="water-wave-edge"
                 style={{
                   position: 'absolute',
                   inset: 0,
                 }}
               />
             </motion.div>
           )}
           <nav
             className={clsx(
               "relative flex items-center gap-3 transition-[padding,min-height] duration-250",
               scrolled ? "min-h-[60px] px-3 py-2 sm:px-4" : "min-h-[72px] px-3 py-3 sm:px-4"
             )}
             style={{
               willChange: scrolled ? 'auto' : 'auto',
               backfaceVisibility: 'hidden',
             }}
          >
            <Link href="/" className="min-w-0 flex-shrink-0">
              <motion.div
                className="inline-flex items-center gap-2 rounded-xl border px-3 py-2"
                style={{
                  borderColor: 'color-mix(in srgb, var(--border-secondary) 70%, transparent)',
                  backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 75%, transparent)',
                }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <span
                  className="text-xl font-bold"
                  style={{
                    backgroundImage: 'linear-gradient(to right, var(--accent-cyan), var(--accent-orange))',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                  }}
                >
                  {displayLogo}
                </span>
              </motion.div>
            </Link>

            <div className="hidden min-w-0 flex-1 justify-center px-2 md:flex">
              <div
                className="flex max-w-full items-center gap-1 overflow-x-auto rounded-full border p-1"
                style={{
                  borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
                  backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 70%, transparent)',
                }}
              >
                {visibleNavLinks.map((link) => {
                  const isActive = isRouteMatch(pathname, link.href);
                  return (
                    <Link
                      key={link.name}
                      href={link.href}
                      target={link.target}
                      className="relative rounded-full px-3 py-1.5 text-sm font-semibold transition-colors"
                      style={{ color: isActive ? 'var(--text-bright)' : 'var(--text-secondary)' }}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="header-nav-active-pill"
                          className="absolute inset-0 rounded-full"
                          style={{
                            background:
                              'linear-gradient(120deg, color-mix(in srgb, var(--accent-cyan) 25%, transparent), color-mix(in srgb, var(--accent-purple) 30%, transparent))',
                            border: '1px solid color-mix(in srgb, var(--accent-cyan) 55%, transparent)',
                          }}
                          transition={{ type: 'spring', stiffness: 360, damping: 32 }}
                        />
                      )}
                      <span className="relative z-10 inline-flex items-center gap-1.5">
                        <span>{link.name}</span>
                        {link.beta === true && (
                          <span
                            className="rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                            style={{
                              borderColor: 'color-mix(in srgb, var(--accent-orange) 55%, var(--border-secondary))',
                              color: 'var(--accent-orange-bright)',
                              backgroundColor: 'color-mix(in srgb, var(--accent-orange) 12%, transparent)',
                            }}
                          >
                            Beta
                          </span>
                        )}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="ml-auto hidden flex-shrink-0 items-center gap-2 lg:flex xl:gap-3">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors"
                style={{
                  borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)',
                  color: 'var(--text-primary)',
                  backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 75%, transparent)',
                }}
                aria-label="Open search"
                title="Search (Ctrl + K)"
              >
                <Search size={16} />
              </button>

              <div className="hidden items-center gap-2 font-mono text-[10px] 2xl:flex" style={{ color: 'var(--text-tertiary)' }}>
                <span className="rounded border px-1.5 py-0.5" style={{ borderColor: 'var(--border-secondary)' }}>Ctrl</span>
                <span>+</span>
                <span className="rounded border px-1.5 py-0.5" style={{ borderColor: 'var(--border-secondary)' }}>K</span>
              </div>

              <ThemeToggle />

              <Link href={contactLink?.href || '/contact-us'}>
                <motion.button
                  className="hidden items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold xl:inline-flex"
                  style={{
                    background: 'linear-gradient(to right, var(--accent-cyan), var(--accent-purple))',
                    color: '#ffffff',
                    boxShadow: '0 10px 20px color-mix(in srgb, var(--shadow-md) 65%, transparent)',
                  }}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                >
                  <span>{contactLink?.name || 'contact-me'}</span>
                  <ArrowUpRight size={14} />
                </motion.button>
              </Link>
            </div>

            <div className="ml-auto flex items-center gap-2 md:hidden">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border"
                style={{
                  borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)',
                  color: 'var(--text-primary)',
                  backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 75%, transparent)',
                }}
                aria-label="Open search"
              >
                <Search size={17} />
              </button>
              <button
                type="button"
                onClick={() => setIsMenuOpen(true)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border"
                style={{
                  borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)',
                  color: 'var(--text-primary)',
                  backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 75%, transparent)',
                }}
                aria-label="Open menu"
              >
                <Menu size={18} />
              </button>
            </div>
          </nav>

           <div
             className={clsx(
               "transition-[max-height,opacity,padding] duration-250",
               scrolled
                 ? "pointer-events-none max-h-0 opacity-0 px-0 overflow-hidden"
                 : "max-h-24 opacity-100 px-2 pb-2 sm:px-3",
               !isTerminalOutputOpen && "overflow-hidden"
             )}
             aria-hidden={scrolled}
             style={{
               willChange: scrolled ? 'auto' : 'auto',
               backfaceVisibility: 'hidden',
             }}
           >
            <div
              className="rounded-xl border"
              style={{
                borderColor: 'color-mix(in srgb, var(--border-secondary) 60%, transparent)',
                backgroundColor: 'color-mix(in srgb, var(--bg-secondary) 65%, transparent)',
              }}
            >
              <TerminalPath socialData={socialData} config={config} onOutputChange={setIsTerminalOutputOpen} />
            </div>
          </div>
        </div>
      </header>

       <motion.aside
         className="fixed inset-0 z-[110] md:hidden overflow-y-auto"
         style={{
           backgroundColor: theme === 'dark' ? 'rgba(8, 10, 14, 0.9)' : 'rgba(248, 250, 252, 0.9)',
           backdropFilter: 'blur(20px)',
           pointerEvents: isMenuOpen ? 'auto' : 'none',
         }}
         initial={{ opacity: 0, y: '-4%' }}
         animate={{
           opacity: isBlogsRoute ? 0 : (isMenuOpen ? 1 : 0),
           y: isBlogsRoute ? '-4%' : (isMenuOpen ? '0%' : '-4%'),
         }}
         transition={{ duration: 0.22, ease: 'easeOut' }}
       >
         <div className="mx-auto mt-4 flex min-h-[calc(100dvh-2rem)] w-[92%] max-w-xl flex-col rounded-2xl border p-4" style={{ borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)', backgroundColor: 'color-mix(in srgb, var(--bg-surface) 88%, transparent)' }}>
          <div className="mb-4 flex items-center justify-between">
            <span
              className="text-lg font-bold"
              style={{
                backgroundImage: 'linear-gradient(to right, var(--accent-cyan), var(--accent-orange))',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              {displayLogo}
            </span>
            <button
              type="button"
              onClick={() => setIsMenuOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border"
              style={{
                borderColor: 'color-mix(in srgb, var(--border-secondary) 70%, transparent)',
                color: 'var(--text-primary)',
                backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 72%, transparent)',
              }}
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {visibleNavLinks.map((link, index) => (
              <motion.div
                key={link.name}
                initial={{ opacity: 0, x: -18 }}
                animate={{ opacity: isMenuOpen ? 1 : 0, x: isMenuOpen ? 0 : -18 }}
                transition={{ delay: 0.04 * index }}
              >
                <Link
                  href={link.href}
                  target={link.target}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-between rounded-xl border px-4 py-3 text-base font-semibold"
                  style={{
                    borderColor: isRouteMatch(pathname, link.href)
                      ? 'color-mix(in srgb, var(--accent-cyan) 55%, transparent)'
                      : 'color-mix(in srgb, var(--border-secondary) 70%, transparent)',
                    color: isRouteMatch(pathname, link.href) ? 'var(--accent-cyan)' : 'var(--text-primary)',
                    backgroundColor: isRouteMatch(pathname, link.href)
                      ? 'color-mix(in srgb, var(--accent-cyan) 10%, transparent)'
                      : 'color-mix(in srgb, var(--bg-elevated) 75%, transparent)',
                  }}
                >
                  <span className="inline-flex items-center gap-2">
                    <span>{link.name}</span>
                    {link.beta === true && (
                      <span
                        className="rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                        style={{
                          borderColor: 'color-mix(in srgb, var(--accent-orange) 55%, var(--border-secondary))',
                          color: 'var(--accent-orange-bright)',
                          backgroundColor: 'color-mix(in srgb, var(--accent-orange) 12%, transparent)',
                        }}
                      >
                        Beta
                      </span>
                    )}
                  </span>
                  <ArrowUpRight size={15} />
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="mt-auto space-y-4 pt-6">
            <div className="rounded-xl border p-3" style={{ borderColor: 'color-mix(in srgb, var(--border-secondary) 70%, transparent)', backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 75%, transparent)' }}>
              <p className="mb-3 text-xs uppercase tracking-[0.14em]" style={{ color: 'var(--text-tertiary)' }}>
                Theme Mode
              </p>
              <ThemeToggle />
            </div>

            <Link href={contactLink?.href || '/contact-us'}>
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold"
                style={{
                  background: 'linear-gradient(to right, var(--accent-cyan), var(--accent-purple))',
                  color: '#ffffff',
                }}
              >
                <span>{contactLink?.name || 'contact-me'}</span>
                <ArrowUpRight size={15} />
              </button>
            </Link>
          </div>
        </div>
      </motion.aside>
    </>
  );
});
