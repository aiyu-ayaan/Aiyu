"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { motion, useScroll } from 'framer-motion';
import { ArrowUpRight, Menu, Search, X } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../context/ThemeContext';
import TerminalPath from './admin/TerminalPath';

const SCROLL_DOWN_THRESHOLD = 72;
const SCROLL_UP_THRESHOLD = 24;

export default function Header({ data, logoText, socialData, config }) {
  const { navLinks, contactLink } = data || { navLinks: [], contactLink: {} };
  const visibleNavLinks = navLinks.filter((link) => link.visible !== false);
  const displayLogo = logoText || "< aiyu />";

  const pathname = usePathname();
  const { theme } = useTheme();
  const { scrollYProgress } = useScroll();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let ticking = false;

    const updateScrollState = () => {
      const y = window.scrollY;
      setScrolled((prev) => (prev ? y > SCROLL_UP_THRESHOLD : y > SCROLL_DOWN_THRESHOLD));
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
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <motion.div
        className="fixed left-0 right-0 top-0 z-[60] h-1 origin-left"
        style={{
          scaleX: scrollYProgress,
          background: 'linear-gradient(to right, var(--accent-cyan), var(--accent-purple), var(--accent-pink))',
        }}
      />

      <header className="sticky top-0 z-50 px-3 pb-0 pt-3 sm:px-4 lg:px-6">
        <motion.div
          className="mx-auto w-full max-w-7xl rounded-2xl border transition-all duration-300"
          style={{
            background: scrolled
              ? 'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 90%, transparent), color-mix(in srgb, var(--bg-secondary) 92%, transparent))'
              : 'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 70%, transparent), color-mix(in srgb, var(--bg-secondary) 70%, transparent))',
            borderColor: scrolled
              ? 'color-mix(in srgb, var(--border-secondary) 75%, transparent)'
              : 'color-mix(in srgb, var(--border-secondary) 40%, transparent)',
            backdropFilter: 'blur(18px)',
            boxShadow: scrolled
              ? '0 14px 36px color-mix(in srgb, var(--shadow-md) 85%, transparent)'
              : '0 8px 22px color-mix(in srgb, var(--shadow-sm) 60%, transparent)',
          }}
        >
          <nav
            className={clsx(
              "relative flex items-center gap-3 transition-[padding,min-height] duration-300",
              scrolled ? "min-h-[60px] px-3 py-2 sm:px-4" : "min-h-[72px] px-3 py-3 sm:px-4"
            )}
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
                  const isActive = pathname === link.href;
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
                      <span className="relative z-10">{link.name}</span>
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
              "transition-[max-height,opacity,padding] duration-300",
              scrolled
                ? "pointer-events-none max-h-0 overflow-hidden px-0 opacity-0"
                : "max-h-24 overflow-visible px-2 pb-2 opacity-100 sm:px-3"
            )}
            aria-hidden={scrolled}
          >
            <div
              className="rounded-xl border"
              style={{
                borderColor: 'color-mix(in srgb, var(--border-secondary) 60%, transparent)',
                backgroundColor: 'color-mix(in srgb, var(--bg-secondary) 65%, transparent)',
              }}
            >
              <TerminalPath socialData={socialData} config={config} />
            </div>
          </div>
        </motion.div>
      </header>

      <motion.aside
        className="fixed inset-0 z-[110] md:hidden"
        style={{
          backgroundColor: theme === 'dark' ? 'rgba(8, 10, 14, 0.9)' : 'rgba(248, 250, 252, 0.9)',
          backdropFilter: 'blur(20px)',
          pointerEvents: isMenuOpen ? 'auto' : 'none',
        }}
        initial={{ opacity: 0, y: '-4%' }}
        animate={{
          opacity: isMenuOpen ? 1 : 0,
          y: isMenuOpen ? '0%' : '-4%',
        }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <div className="mx-auto mt-4 flex h-[calc(100dvh-2rem)] w-[92%] max-w-xl flex-col rounded-2xl border p-4" style={{ borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)', backgroundColor: 'color-mix(in srgb, var(--bg-surface) 88%, transparent)' }}>
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
                  className="flex items-center justify-between rounded-xl border px-4 py-3 text-base font-semibold"
                  style={{
                    borderColor: pathname === link.href
                      ? 'color-mix(in srgb, var(--accent-cyan) 55%, transparent)'
                      : 'color-mix(in srgb, var(--border-secondary) 70%, transparent)',
                    color: pathname === link.href ? 'var(--accent-cyan)' : 'var(--text-primary)',
                    backgroundColor: pathname === link.href
                      ? 'color-mix(in srgb, var(--accent-cyan) 10%, transparent)'
                      : 'color-mix(in srgb, var(--bg-elevated) 75%, transparent)',
                  }}
                >
                  <span>{link.name}</span>
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
}
