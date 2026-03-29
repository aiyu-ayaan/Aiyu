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

    return () => observer.disconnect();
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
