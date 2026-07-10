"use client";

import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import {
    gsap,
    ScrollTrigger,
    useGSAP,
    isLiteDevice,
    animateCounters,
    refreshScrollTriggersSoon,
} from '../../shared/gsapScroll';

if (typeof window !== 'undefined') {
    gsap.registerPlugin(ScrambleTextPlugin);
}

// Glyph pool for the decrypt effect — code punctuation and binary, not
// letters, so mid-scramble text reads as machine noise rather than typos.
export const SCRAMBLE_CHARS = '01<>[]{}/\\|#$_=+*';

/**
 * V2 3D scroll engine. Same device-tier rules as the v1 engine (html[data-perf="lite"]
 * and reduced-motion render a static, fully visible page) but the entrance language is
 * true 3D: elements swing in around the X/Y axes or surface from camera depth (z),
 * and whole panels tilt away as they scroll past.
 *
 * Opt-in attributes (all resolved inside a useV2Fx scope):
 *   data-v2="<preset>"          3D entrance on its own trigger
 *   data-v2-group               container whose [data-v2] children stagger off one trigger
 *   data-v2-stagger="0.08"      stagger between group children
 *   data-v2-delay="0.15"        per-element delay
 *   data-v2-depth="-0.4"        scrubbed depth parallax (negative floats up + toward camera)
 *   data-v2-tilt                panel tilts backward around X as it leaves the viewport (scrub)
 */
const V2_PRESETS = {
    // Surfaces from behind the camera plane — kept shallow so the settle
    // reads as a graceful arrival, not a launch.
    deep: { autoAlpha: 0, z: -240, y: 28, rotationX: 5, transformPerspective: 1200 },
    // Card lying face-up swings to face the camera.
    'flip-x': { autoAlpha: 0, rotationX: -34, y: 44, z: -80, transformOrigin: '50% 100%', transformPerspective: 1100 },
    // Doors: swing in around a vertical hinge on their own edge.
    'door-left': { autoAlpha: 0, rotationY: 28, x: -32, z: -60, transformOrigin: 'left center', transformPerspective: 1100 },
    'door-right': { autoAlpha: 0, rotationY: -28, x: 32, z: -60, transformOrigin: 'right center', transformPerspective: 1100 },
    // Headline lines pivot up from below the baseline.
    line: { autoAlpha: 0, rotationX: -46, yPercent: 46, transformOrigin: '50% 100%', transformPerspective: 900 },
    // Oversized panels: gentle depth zoom, no rotation.
    float: { autoAlpha: 0, z: -140, scale: 0.975, transformPerspective: 1400 },
    rise: { autoAlpha: 0, y: 30, filter: 'blur(5px)' },
};

// expo.out is the closest tween ease to a critically damped spring: it covers
// most of the distance immediately (respond fast), then settles without
// overshoot (never distract). Every v2 reveal shares it so motion feels like
// one material, not a collection of effects.
const V2_EASE = 'expo.out';
const V2_DURATION = 1.0;

const getV2Preset = (el) => V2_PRESETS[el.dataset.v2] || V2_PRESETS.rise;

function revealV2(target, preset, { delay = 0, stagger = 0, trigger } = {}) {
    const firstTarget = Array.isArray(target) ? target[0] : target;
    
    // Build explicit target state to avoid React's "animating from 0 to 0" issue.
    const toVars = {
        duration: V2_DURATION,
        ease: V2_EASE,
        clearProps: 'all',
        delay,
        stagger,
        scrollTrigger: {
            trigger: trigger || firstTarget,
            start: 'top 90%',
            // Reveal once and stay. Re-flipping content every time the user
            // scrolls back up reads as the page performing, not responding —
            // and reversing after clearProps caused a visible snap.
            toggleActions: 'play none none none',
        },
    };

    if ('autoAlpha' in preset) toVars.autoAlpha = 1;
    if ('z' in preset) toVars.z = 0;
    if ('x' in preset) toVars.x = 0;
    if ('y' in preset) toVars.y = 0;
    if ('yPercent' in preset) toVars.yPercent = 0;
    if ('rotationX' in preset) toVars.rotationX = 0;
    if ('rotationY' in preset) toVars.rotationY = 0;
    if ('scale' in preset) toVars.scale = 1;
    if ('filter' in preset) toVars.filter = 'none';

    gsap.fromTo(target, preset, toVars);
}

export function animateV2Reveals(scope, { reducedMotion = false } = {}) {
    if (!scope || reducedMotion) return;

    const claimed = new Set();

    scope.querySelectorAll('[data-v2-group]').forEach((group) => {
        const children = Array.from(group.querySelectorAll('[data-v2]')).filter((el) => !claimed.has(el));
        if (children.length === 0) return;
        children.forEach((el) => claimed.add(el));
        revealV2(children, getV2Preset(children[0]), {
            stagger: Number(group.dataset.v2Stagger) || 0.1,
            trigger: group,
        });
    });

    scope.querySelectorAll('[data-v2]').forEach((el) => {
        if (claimed.has(el)) return;
        revealV2(el, getV2Preset(el), { delay: Number(el.dataset.v2Delay) || 0 });
    });
}

/**
 * Scrubbed depth parallax: layers drift vertically at different speeds and scale
 * slightly with direction, selling a camera dolly without expensive translateZ
 * on every frame.
 */
export function animateV2Depth(scope, { reducedMotion = false } = {}) {
    if (!scope || reducedMotion) return;

    scope.querySelectorAll('[data-v2-depth]').forEach((el) => {
        const speed = Number(el.dataset.v2Depth) || -0.3;
        gsap.to(el, {
            y: () => speed * 220,
            scale: 1 + Math.min(Math.abs(speed) * 0.08, 0.08) * (speed < 0 ? 1 : -1),
            ease: 'none',
            scrollTrigger: {
                trigger: el,
                start: 'top bottom',
                end: 'bottom top',
                // A touch of scrub lag lets the layer glide behind the scroll
                // instead of tracking it 1:1 — the parallax reads as inertia.
                scrub: 0.6,
            },
        });
    });
}

/**
 * Panels tagged data-v2-tilt lean back around X and sink into depth as they exit
 * the top of the viewport — the signature "page falls away" move.
 */
export function animateV2Tilt(scope, { reducedMotion = false } = {}) {
    if (!scope || reducedMotion) return;

    scope.querySelectorAll('[data-v2-tilt]').forEach((el) => {
        gsap.to(el, {
            rotationX: 5,
            z: -110,
            autoAlpha: 0.55,
            transformOrigin: '50% 0%',
            transformPerspective: 1400,
            ease: 'none',
            scrollTrigger: {
                trigger: el,
                start: 'bottom 58%',
                end: 'bottom top',
                scrub: 0.6,
            },
        });
    });
}

/**
 * Decrypt reveal: elements tagged data-v2-scramble resolve from machine noise
 * into their real text when they enter the viewport. The plain text is already
 * in the DOM at SSR time (SEO/reduced-motion safe) — the scramble only runs as
 * a client enhancement. Optional attrs:
 *   data-v2-scramble="1.2"        duration in seconds (default 1)
 *   data-v2-scramble-delay="0.2"  start delay in seconds
 */
export function animateV2Scramble(scope, { reducedMotion = false } = {}) {
    if (!scope || reducedMotion) return;

    scope.querySelectorAll('[data-v2-scramble]').forEach((el) => {
        const text = el.textContent;
        if (!text || !text.trim()) return;
        gsap.to(el, {
            duration: Number(el.dataset.v2Scramble) || 1,
            delay: Number(el.dataset.v2ScrambleDelay) || 0,
            scrambleText: {
                text,
                chars: SCRAMBLE_CHARS,
                revealDelay: 0.15,
                speed: 0.9,
            },
            ease: 'none',
            scrollTrigger: {
                trigger: el,
                start: 'top 90%',
                toggleActions: 'play none none none',
            },
        });
    });
}

/**
 * One-call section setup for /v2. Mirrors useSectionFx but with the 3D language.
 * `extra` receives { gsap, ScrollTrigger, scope, reducedMotion } for bespoke
 * pinned timelines (hero, showcase deck, tech ring).
 */
export function useV2Fx(scopeRef, { reducedMotion = false, extra, dependencies = [] } = {}) {
    useGSAP(
        () => {
            const scope = scopeRef.current;
            if (!scope) return;

            const reduced = reducedMotion || isLiteDevice();

            animateV2Reveals(scope, { reducedMotion: reduced });
            animateCounters(scope, { reducedMotion: reduced });
            animateV2Depth(scope, { reducedMotion: reduced });
            animateV2Tilt(scope, { reducedMotion: reduced });
            animateV2Scramble(scope, { reducedMotion: reduced });

            if (typeof extra === 'function') {
                extra({ gsap, ScrollTrigger, scope, reducedMotion: reduced });
            }

            refreshScrollTriggersSoon();
        },
        { scope: scopeRef, dependencies: [reducedMotion, ...dependencies] }
    );
}

export { gsap, ScrollTrigger, useGSAP, isLiteDevice, refreshScrollTriggersSoon };
