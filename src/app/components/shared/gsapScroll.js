"use client";

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

if (typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger, useGSAP);
}

// 3D entrance presets, applied to elements tagged with data-reveal="<preset>".
// All presets rely on transformPerspective so each element gets its own vanishing point.
const REVEAL_PRESETS = {
    rise: { autoAlpha: 0, y: 64, rotateX: -16, transformPerspective: 900 },
    tilt: { autoAlpha: 0, y: 90, rotateX: 38, scale: 0.94, transformPerspective: 1200 },
    flip: { autoAlpha: 0, rotateY: -52, z: -120, transformPerspective: 1100 },
    'flip-right': { autoAlpha: 0, rotateY: 52, z: -120, transformPerspective: 1100 },
    zoom: { autoAlpha: 0, scale: 0.86, z: -140, transformPerspective: 1000 },
    swing: { autoAlpha: 0, x: -70, rotateY: 26, transformPerspective: 1000 },
    'swing-right': { autoAlpha: 0, x: 70, rotateY: -26, transformPerspective: 1000 },
};

const DEFAULT_REVEAL = 'rise';

const getPreset = (el) => REVEAL_PRESETS[el.dataset.reveal] || REVEAL_PRESETS[DEFAULT_REVEAL];

/**
 * Animate every [data-reveal] element inside scope with a 3D entrance driven
 * by ScrollTrigger. Elements inside a [data-reveal-group] container are
 * staggered together off a single trigger.
 *
 * Optional attributes:
 *   data-reveal-delay="0.15"  per-element delay in seconds
 *   data-reveal-group         container whose [data-reveal] children stagger
 */
export function animateReveals(scope, { reducedMotion = false } = {}) {
    if (!scope) return;

    const groups = Array.from(scope.querySelectorAll('[data-reveal-group]'));
    const grouped = new Set();

    groups.forEach((group) => {
        const children = Array.from(group.querySelectorAll('[data-reveal]'));
        if (children.length === 0) return;
        children.forEach((child) => grouped.add(child));

        if (reducedMotion) return;

        const preset = getPreset(children[0]);
        gsap.from(children, {
            ...preset,
            duration: 0.9,
            ease: 'power3.out',
            stagger: Number(group.dataset.revealStagger) || 0.09,
            scrollTrigger: {
                trigger: group,
                start: 'top 86%',
                once: true,
            },
        });
    });

    const singles = Array.from(scope.querySelectorAll('[data-reveal]')).filter((el) => !grouped.has(el));
    if (reducedMotion) return;

    singles.forEach((el) => {
        gsap.from(el, {
            ...getPreset(el),
            duration: 0.95,
            ease: 'power3.out',
            delay: Number(el.dataset.revealDelay) || 0,
            scrollTrigger: {
                trigger: el,
                start: 'top 88%',
                once: true,
            },
        });
    });
}

/**
 * Count-up animation for [data-counter="<finalValue>"] elements.
 * With reduced motion the final value is set immediately.
 */
export function animateCounters(scope, { reducedMotion = false } = {}) {
    if (!scope) return;

    scope.querySelectorAll('[data-counter]').forEach((el) => {
        const target = Number(el.dataset.counter) || 0;
        const suffix = el.dataset.counterSuffix || '';

        if (reducedMotion) {
            el.textContent = `${target}${suffix}`;
            return;
        }

        const state = { value: 0 };
        el.textContent = `0${suffix}`;
        gsap.to(state, {
            value: target,
            duration: 1.4,
            ease: 'power2.out',
            scrollTrigger: {
                trigger: el,
                start: 'top 90%',
                once: true,
            },
            onUpdate: () => {
                el.textContent = `${Math.round(state.value)}${suffix}`;
            },
        });
    });
}

/**
 * Scroll-scrubbed parallax drift for decorative layers tagged
 * data-parallax="<speed>" (positive drifts down slower, negative floats up).
 */
export function animateParallax(scope, { reducedMotion = false } = {}) {
    if (!scope || reducedMotion) return;

    scope.querySelectorAll('[data-parallax]').forEach((el) => {
        const speed = Number(el.dataset.parallax) || 0.2;
        gsap.to(el, {
            y: () => speed * 240,
            ease: 'none',
            scrollTrigger: {
                trigger: el,
                start: 'top bottom',
                end: 'bottom top',
                scrub: true,
            },
        });
    });
}

/**
 * Lazy-mounted sections change the document height after ScrollTrigger has
 * measured it; schedule a refresh once layout settles.
 */
export function refreshScrollTriggersSoon() {
    if (typeof window === 'undefined') return;
    window.requestAnimationFrame(() => ScrollTrigger.refresh());
}

/**
 * One-call section setup: 3D reveals, counters and parallax for tagged
 * elements plus an optional `extra` callback for bespoke timelines.
 * Cleanup is handled by useGSAP's context revert.
 */
export function useSectionFx(scopeRef, { reducedMotion = false, extra } = {}) {
    useGSAP(
        () => {
            const scope = scopeRef.current;
            if (!scope) return;

            animateReveals(scope, { reducedMotion });
            animateCounters(scope, { reducedMotion });
            animateParallax(scope, { reducedMotion });

            if (typeof extra === 'function') {
                extra({ gsap, ScrollTrigger, scope, reducedMotion });
            }

            refreshScrollTriggersSoon();
        },
        { scope: scopeRef, dependencies: [reducedMotion] }
    );
}

export { gsap, ScrollTrigger, useGSAP };
