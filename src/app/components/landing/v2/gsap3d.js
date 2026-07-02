"use client";

import {
    gsap,
    ScrollTrigger,
    useGSAP,
    isLiteDevice,
    animateCounters,
    refreshScrollTriggersSoon,
} from '../../shared/gsapScroll';

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
    // Surfaces from deep behind the camera plane.
    deep: { autoAlpha: 0, z: -420, y: 40, rotationX: 8, transformPerspective: 1200 },
    // Card lying face-up swings to face the camera.
    'flip-x': { autoAlpha: 0, rotationX: -72, y: 64, z: -120, transformOrigin: '50% 100%', transformPerspective: 1100 },
    // Doors: swing in around a vertical hinge on their own edge.
    'door-left': { autoAlpha: 0, rotationY: 58, x: -46, z: -90, transformOrigin: 'left center', transformPerspective: 1100 },
    'door-right': { autoAlpha: 0, rotationY: -58, x: 46, z: -90, transformOrigin: 'right center', transformPerspective: 1100 },
    // Headline lines pivot up from below the baseline.
    line: { autoAlpha: 0, rotationX: -88, yPercent: 60, transformOrigin: '50% 100%', transformPerspective: 900 },
    // Oversized panels: gentle depth zoom, no rotation.
    float: { autoAlpha: 0, z: -240, scale: 0.96, transformPerspective: 1400 },
    rise: { autoAlpha: 0, y: 44, filter: 'blur(6px)' },
};

const getV2Preset = (el) => V2_PRESETS[el.dataset.v2] || V2_PRESETS.rise;

function revealV2(target, preset, { delay = 0, stagger = 0, trigger } = {}) {
    const firstTarget = Array.isArray(target) ? target[0] : target;
    gsap.from(target, {
        ...preset,
        duration: 1.1,
        ease: 'power3.out',
        clearProps: 'all',
        delay,
        stagger,
        scrollTrigger: {
            trigger: trigger || firstTarget,
            start: 'top 88%',
            toggleActions: 'play none none reverse',
        },
    });
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
            y: () => speed * 280,
            scale: 1 + Math.min(Math.abs(speed) * 0.12, 0.12) * (speed < 0 ? 1 : -1),
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
 * Panels tagged data-v2-tilt lean back around X and sink into depth as they exit
 * the top of the viewport — the signature "page falls away" move.
 */
export function animateV2Tilt(scope, { reducedMotion = false } = {}) {
    if (!scope || reducedMotion) return;

    scope.querySelectorAll('[data-v2-tilt]').forEach((el) => {
        gsap.to(el, {
            rotationX: 9,
            z: -160,
            autoAlpha: 0.35,
            transformOrigin: '50% 0%',
            transformPerspective: 1400,
            ease: 'none',
            scrollTrigger: {
                trigger: el,
                start: 'bottom 62%',
                end: 'bottom top',
                scrub: true,
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

            if (typeof extra === 'function') {
                extra({ gsap, ScrollTrigger, scope, reducedMotion: reduced });
            }

            refreshScrollTriggersSoon();
        },
        { scope: scopeRef, dependencies: [reducedMotion, ...dependencies] }
    );
}

export { gsap, ScrollTrigger, useGSAP, isLiteDevice, refreshScrollTriggersSoon };
