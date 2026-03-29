"use client";

import { useEffect, useRef, useState } from 'react';

export default function ViewportLazySection({
  id,
  className = '',
  placeholderHeight = 380,
  rootMargin = '240px 0px',
  children,
}) {
  const hostRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

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

    const revealIfNeeded = () => {
      if (shouldRevealByPosition()) {
        setIsVisible(true);
      }
    };

    revealIfNeeded();
    if (shouldRevealByPosition()) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold: 0.01 }
    );

    if (hostRef.current) {
      observer.observe(hostRef.current);
    }

    window.addEventListener('scroll', revealIfNeeded, { passive: true });
    window.addEventListener('resize', revealIfNeeded);

    const fallbackTimer = window.setTimeout(() => {
      setIsVisible(true);
    }, 3500);

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', revealIfNeeded);
      window.removeEventListener('resize', revealIfNeeded);
      window.clearTimeout(fallbackTimer);
    };
  }, [isVisible, rootMargin]);

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
