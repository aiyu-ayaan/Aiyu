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

// Entrance presets, applied to elements tagged with data-reveal="<preset>".
// Elements fade + de-blur as they enter the viewport — no 3D flips. The `left`/`right`
// presets glide content in from the side it sits on; pairing them (or using a
// [data-reveal-auto] container) gives sections an alternating left↔right rhythm.
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
    // True horizontal entrances — content slides in from the side, fully off-axis.
    left: { autoAlpha: 0, x: -80, filter: 'blur(8px)' },
    right: { autoAlpha: 0, x: 80, filter: 'blur(8px)' },
    // Softer diagonal variants — slide sideways with a slight lift.
    'left-soft': { autoAlpha: 0, x: -48, y: 16, filter: 'blur(6px)' },
    'right-soft': { autoAlpha: 0, x: 48, y: 16, filter: 'blur(6px)' },
};

// Presets used by [data-reveal-auto] to alternate children from alternating sides.
const AUTO_LEFT = REVEAL_PRESETS.left;
const AUTO_RIGHT = REVEAL_PRESETS.right;

const DEFAULT_REVEAL = 'rise';

const getPreset = (el) => REVEAL_PRESETS[el.dataset.reveal] || REVEAL_PRESETS[DEFAULT_REVEAL];

/**
 * Low-end / touch device tier, set pre-paint on <html data-perf="lite"> by the
 * inline script in layout.js (reduced-motion / data-saver / slow network / weak
 * touch hardware). On these devices we skip every scrubbed/pinned timeline and
 * let content render statically — the scroll FX are what make low-end screens
 * stutter or appear blank, so we treat lite exactly like reduced-motion.
 */
export function isLiteDevice() {
    if (typeof document === 'undefined') return false;
    return document.documentElement.getAttribute('data-perf') === 'lite';
}

/**
 * Animate every [data-reveal] element inside scope with an entrance driven by
 * ScrollTrigger. There are three ways to opt in, resolved in priority order so
 * an element is only ever animated once:
 *
 *   1. [data-reveal-auto]   container whose direct children glide in from
 *                           alternating sides (left, right, left, …). Add
 *                           data-reveal-auto="right" to start from the right.
 *                           Children needing a fixed side can still carry an
 *                           explicit data-reveal and it wins.
 *   2. [data-reveal-group]  container whose [data-reveal] children stagger
 *                           together off a single trigger.
 *   3. [data-reveal]        standalone element, animated on its own trigger.
 *
 * Optional attributes:
 *   data-reveal-delay="0.15"    per-element delay in seconds
 *   data-reveal-stagger="0.09"  group / auto stagger between children
 */
export function animateReveals(scope, { reducedMotion = false } = {}) {
    if (!scope) return;

    // Elements already handled by a higher-priority container are skipped later.
    const claimed = new Set();

    const reveal = (target, preset, { delay = 0, stagger = 0, trigger } = {}) => {
        const firstTarget = Array.isArray(target) ? target[0] : target;
        const track = firstTarget?.closest?.('[data-hscroll-track]');
        const containerAnimation = track?._hScrollTween;

        const scrollTriggerConfig = {
            trigger: trigger || firstTarget,
            start: containerAnimation ? 'left 90%' : 'top 90%',
            toggleActions: 'play none none reverse',
            once: false,
        };

        if (containerAnimation) {
            scrollTriggerConfig.containerAnimation = containerAnimation;
        }

        gsap.from(target, {
            ...preset,
            duration: 1.0,
            ease: 'power3.out',
            clearProps: 'all',
            delay,
            stagger,
            scrollTrigger: scrollTriggerConfig,
        });
    };

    // 1) Auto-alternating containers.
    Array.from(scope.querySelectorAll('[data-reveal-auto]')).forEach((container) => {
        const children = Array.from(container.children).filter((node) => node.nodeType === 1);
        if (children.length === 0) return;

        // Claim the children (and any nested data-reveal) so groups/singles skip them.
        children.forEach((child) => {
            claimed.add(child);
            child.querySelectorAll?.('[data-reveal]').forEach((nested) => claimed.add(nested));
        });

        if (reducedMotion) return;

        // data-reveal-auto="right" flips which side index 0 enters from.
        const startRight = container.dataset.revealAuto === 'right';
        const stagger = Number(container.dataset.revealStagger) || 0;

        children.forEach((child, index) => {
            const explicit = child.dataset.reveal ? REVEAL_PRESETS[child.dataset.reveal] : null;
            const fromRight = startRight ? index % 2 === 0 : index % 2 === 1;
            const preset = explicit || (fromRight ? AUTO_RIGHT : AUTO_LEFT);
            reveal(child, preset, { delay: (Number(child.dataset.revealDelay) || 0) + index * stagger });
        });
    });

    // 2) Explicit stagger groups.
    Array.from(scope.querySelectorAll('[data-reveal-group]')).forEach((group) => {
        if (claimed.has(group)) return;
        const children = Array.from(group.querySelectorAll('[data-reveal]')).filter((child) => !claimed.has(child));
        if (children.length === 0) return;
        children.forEach((child) => claimed.add(child));

        if (reducedMotion) return;

        reveal(children, getPreset(children[0]), {
            stagger: Number(group.dataset.revealStagger) || 0.09,
            trigger: group,
        });
    });

    // 3) Standalone elements.
    if (reducedMotion) return;

    Array.from(scope.querySelectorAll('[data-reveal]'))
        .filter((el) => !claimed.has(el))
        .forEach((el) => {
            reveal(el, getPreset(el), { delay: Number(el.dataset.revealDelay) || 0 });
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
 * Pinned horizontal scroll: a [data-hscroll] viewport is pinned while its inner
 * [data-hscroll-track] translates sideways, so vertical scrolling drives the
 * content horizontally. On reduced-motion / touch / coarse-pointer devices the
 * pin is skipped and the viewport falls back to native horizontal scrolling
 * (it ships scrollable by default; we only add `.is-pinned` when taking over).
 */
export function animateHorizontalScroll(scope, { reducedMotion = false } = {}) {
    if (!scope) return;

    // Enable pinning scroll on all devices, unless reduced motion is preferred.
    const preferNative = reducedMotion;

    scope.querySelectorAll('[data-hscroll]').forEach((viewport) => {
        const track = viewport.querySelector('[data-hscroll-track]');
        if (!track) return;

        const distance = () => Math.max(0, track.scrollWidth - viewport.offsetWidth);

        // Not enough overflow to scroll, or device prefers native scroll: leave as-is.
        if (preferNative || distance() <= 8) return;

        viewport.classList.add('is-pinned');

        const scrollTween = gsap.to(track, {
            x: () => -distance(),
            ease: 'none',
            scrollTrigger: {
                trigger: viewport,
                start: 'top 80px',
                end: () => `+=${distance() * 1.2}`,
                pin: true,
                scrub: 1,
                anticipatePin: 1,
                invalidateOnRefresh: true,
            },
        });
        track._hScrollTween = scrollTween;
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
export function useSectionFx(scopeRef, { reducedMotion = false, extra, dependencies = [] } = {}) {
    useGSAP(
        () => {
            const scope = scopeRef.current;
            if (!scope) return;

            // Lite devices get a static, fully-visible layout: no blur reveals,
            // no parallax, no pinned horizontal scroll, no bespoke 3D timelines.
            const reduced = reducedMotion || isLiteDevice();

            animateHorizontalScroll(scope, { reducedMotion: reduced });
            animateReveals(scope, { reducedMotion: reduced });
            animateCounters(scope, { reducedMotion: reduced });
            animateParallax(scope, { reducedMotion: reduced });

            if (typeof extra === 'function') {
                extra({ gsap, ScrollTrigger, scope, reducedMotion: reduced });
            }

            refreshScrollTriggersSoon();
        },
        { scope: scopeRef, dependencies: [reducedMotion, ...dependencies] }
    );
}

export { gsap, ScrollTrigger, useGSAP };
