"use client";

import { useEffect, useRef, useState } from 'react';

export default function ViewportLazySection({
  id,
  className = '',
  placeholderHeight = 380,
  rootMargin = '240px 0px',
  initialDelayMs = 0,
  children,
}) {
  const hostRef = useRef(null);
  const revealTimerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const scrollTimeoutRef = useRef(null);
  const lastScrollTimeRef = useRef(0);

  useEffect(() => {
    if (isVisible) return;

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    const preloadDistance = Number.parseInt(String(rootMargin).split(' ')[0], 10) || 240;

    const shouldRevealByPosition = () => {
      if (!hostRef.current) return false;
      const rect = hostRef.current.getBoundingClientRect();
      return rect.top <= window.innerHeight + preloadDistance && rect.bottom >= -preloadDistance;
    };

    const reveal = () => {
      if (initialDelayMs > 0) {
        if (revealTimerRef.current) return;
        revealTimerRef.current = window.setTimeout(() => {
          setIsVisible(true);
          revealTimerRef.current = null;
        }, initialDelayMs);
        return;
      }
      setIsVisible(true);
    };

    // Throttled scroll handler to prevent lag on fast scrolls
    const revealIfNeeded = () => {
      const now = Date.now();
      // Only check every 100ms during scroll to prevent lag
      if (now - lastScrollTimeRef.current < 100) return;
      lastScrollTimeRef.current = now;

      if (shouldRevealByPosition()) {
        reveal();
      }
    };

    revealIfNeeded();
    if (shouldRevealByPosition()) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          reveal();
          observer.disconnect();
        }
      },
      { rootMargin, threshold: 0.01 }
    );

    if (hostRef.current) {
      observer.observe(hostRef.current);
    }

    // Use requestAnimationFrame for scroll handling to sync with paint
    let scrollRAF = null;
    const handleScroll = () => {
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = window.setTimeout(revealIfNeeded, 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', revealIfNeeded);

    const fallbackTimer = window.setTimeout(() => {
      reveal();
    }, 3500);

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', revealIfNeeded);
      window.clearTimeout(fallbackTimer);
      window.clearTimeout(scrollTimeoutRef.current);
      if (revealTimerRef.current) {
        window.clearTimeout(revealTimerRef.current);
      }
      if (scrollRAF) {
        window.cancelAnimationFrame(scrollRAF);
      }
    };
  }, [initialDelayMs, isVisible, rootMargin]);

  return (
    <section id={id} ref={hostRef} className={className}>
      {isVisible ? (
        children
      ) : (
        <div
          className="mx-auto max-w-6xl animate-pulse rounded-3xl border"
          style={{
            minHeight: `${placeholderHeight}px`,
            borderColor: 'color-mix(in srgb, var(--border-secondary) 70%, transparent)',
            background:
              'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 82%, transparent), color-mix(in srgb, var(--bg-secondary) 84%, transparent))',
          }}
          aria-hidden="true"
        />
      )}
    </section>
  );
}
