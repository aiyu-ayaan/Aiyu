"use client";

import { useRef } from 'react';
import useDevicePerformance from '../../hooks/useDevicePerformance';
import { useSectionFx } from './gsapScroll';

/**
 * Drop-in scroll-reveal scope for pages that don't already wire up the GSAP
 * engine themselves. It owns a ref, runs `useSectionFx` (reveals, counters,
 * parallax, horizontal scroll) and respects reduced-motion automatically.
 *
 * Pass `auto` to alternate direct children left↔right with zero per-element
 * tagging, or tag children with data-reveal / data-reveal-group as usual:
 *
 *   <SectionReveal auto>            // children glide in left, right, left, …
 *   <SectionReveal auto="right">    // …starting from the right
 *   <SectionReveal>                 // honour explicit data-reveal attributes
 *     <h2 data-reveal="left">…</h2>
 *   </SectionReveal>
 */
export default function SectionReveal({ as: Tag = 'div', auto = false, children, ...props }) {
  const ref = useRef(null);
  const { prefersReducedMotion } = useDevicePerformance();

  useSectionFx(ref, { reducedMotion: prefersReducedMotion });

  const autoProps = auto ? { 'data-reveal-auto': auto === true ? '' : auto } : {};

  return (
    <Tag ref={ref} {...autoProps} {...props}>
      {children}
    </Tag>
  );
}
