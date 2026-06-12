"use client";

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

if (typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger, useGSAP);
    // Mobile browsers fire resize when the address bar collapses; recomputing
    // every trigger mid-scroll causes visible jumps.
    ScrollTrigger.config({ ignoreMobileResize: true });
}

// Horizontal entrance presets, applied to elements tagged with data-reveal="<preset>".
// Elements slide in along the X axis with a soft fade + de-blur as they enter the
// viewport — no 3D flips. Directions alternate (left/right) to give sections rhythm.
// `html`/`body` set overflow-x: hidden, so the off-screen offsets never add a scrollbar.
const REVEAL_PRESETS = {
    // Headings, subcopy, pills — gentle glide upwards.
    rise: { autoAlpha: 0, y: 32, filter: 'blur(6px)' },
    // Large panels / cards — vertical drift with a soft scale-up.
    tilt: { autoAlpha: 0, y: 48, scale: 0.99, filter: 'blur(8px)' },
    // Grid tiles — enter vertically from bottom.
    flip: { autoAlpha: 0, y: 40, filter: 'blur(6px)' },
    // Right-aligned actions / mirrored tiles — same elegant rise.
    'flip-right': { autoAlpha: 0, y: 40, filter: 'blur(6px)' },
    // Empty states / mission control — slide up with a subtle scale.
    zoom: { autoAlpha: 0, y: 24, scale: 0.97, filter: 'blur(8px)' },
    swing: { autoAlpha: 0, y: 44, x: -12, filter: 'blur(6px)' },
    'swing-right': { autoAlpha: 0, y: 44, x: 12, filter: 'blur(6px)' },
};

const DEFAULT_REVEAL = 'rise';

// True on low-end / data-saver / reduced-motion devices (flag set pre-paint in
// layout.js). Used for animation level-of-detail.
const isLiteDevice = () =>
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-perf') === 'lite';

// Animating `filter: blur()` recomputes a GPU blur every frame for every
// element — the single most expensive thing in these reveals on budget
// Android. On lite devices we strip blur and keep pure transform + opacity
// (compositor-only, 60fps-friendly) while the motion stays visually intact.
const presetForDevice = (preset, lite) => {
    if (!lite || !preset.filter) return preset;
    const { filter, ...rest } = preset;
    return rest;
};

const getPreset = (el, lite = false) =>
    presetForDevice(REVEAL_PRESETS[el.dataset.reveal] || REVEAL_PRESETS[DEFAULT_REVEAL], lite);

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

    const lite = isLiteDevice();
    const groups = Array.from(scope.querySelectorAll('[data-reveal-group]'));
    const grouped = new Set();

    groups.forEach((group) => {
        const children = Array.from(group.querySelectorAll('[data-reveal]'));
        if (children.length === 0) return;
        children.forEach((child) => grouped.add(child));

        if (reducedMotion) return;

        const preset = getPreset(children[0], lite);
        gsap.from(children, {
            ...preset,
            duration: 0.8,
            ease: 'power3.out',
            clearProps: 'all',
            stagger: Number(group.dataset.revealStagger) || 0.09,
            scrollTrigger: {
                trigger: group,
                start: 'top 86%',
                // Play once for a stable, distraction-free reading experience
                once: true,
            },
        });
    });

    const singles = Array.from(scope.querySelectorAll('[data-reveal]')).filter((el) => !grouped.has(el));
    if (reducedMotion) return;

    singles.forEach((el) => {
        gsap.from(el, {
            ...getPreset(el, lite),
            duration: 0.85,
            ease: 'power3.out',
            clearProps: 'all',
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
    // Scrubbed parallax does layout-free transform work on every scroll frame.
    // It's purely decorative, so skip it on lite devices to protect scroll FPS.
    if (!scope || reducedMotion || isLiteDevice()) return;

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
