"use client";

import React, { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger, useGSAP, isLiteDevice } from './gsap3d';

/**
 * Motion primitives for the v2 home redesign. Everything here follows the
 * same contract as useV2Fx: html[data-perf="lite"] and prefers-reduced-motion
 * get a static, fully visible render, and every colour comes from theme
 * tokens so admin-defined themes restyle it without code changes.
 */

const prefersReduced = () =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const motionDisabled = () => prefersReduced() || isLiteDevice();

const hasFinePointer = () =>
    typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/**
 * Text split into masked words (and optionally chars) rendered by React, so
 * GSAP only ever tweens nodes React owns — no SplitText DOM rewrites that a
 * re-render would clobber. Screen readers get the plain string once.
 *
 *   <SplitWords text="Hello world" chars className="..." />
 *   → .split-word (overflow mask) > .split-char|.split-inner
 */
export function SplitWords({ text = '', as: Tag = 'span', chars = false, className = '', style, innerClassName = '' }) {
    const words = String(text).split(/\s+/).filter(Boolean);
    return (
        <Tag className={className} style={style} aria-label={text}>
            {words.map((word, wi) => (
                <React.Fragment key={`${word}-${wi}`}>
                    <span aria-hidden="true" className="split-word inline-block overflow-hidden pb-[0.08em] align-bottom">
                        {chars ? (
                            Array.from(word).map((char, ci) => (
                                <span key={ci} className={`split-char inline-block will-change-transform ${innerClassName}`}>
                                    {char}
                                </span>
                            ))
                        ) : (
                            <span className={`split-inner inline-block will-change-transform ${innerClassName}`}>{word}</span>
                        )}
                    </span>
                    {wi < words.length - 1 && ' '}
                </React.Fragment>
            ))}
        </Tag>
    );
}

/**
 * Magnetic pull toward the pointer on fine-pointer devices. quickTo reuses a
 * single tween per axis, so pointermove at 120Hz costs no allocations.
 */
export function useMagnetic(ref, { strength = 0.35, radius = 1 } = {}) {
    useEffect(() => {
        const el = ref.current;
        if (!el || motionDisabled() || !hasFinePointer()) return undefined;

        const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.45)' });
        const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.45)' });

        const onMove = (event) => {
            const rect = el.getBoundingClientRect();
            const dx = event.clientX - (rect.left + rect.width / 2);
            const dy = event.clientY - (rect.top + rect.height / 2);
            xTo(dx * strength * radius);
            yTo(dy * strength * radius);
        };
        const onLeave = () => {
            xTo(0);
            yTo(0);
        };

        el.addEventListener('pointermove', onMove);
        el.addEventListener('pointerleave', onLeave);
        return () => {
            el.removeEventListener('pointermove', onMove);
            el.removeEventListener('pointerleave', onLeave);
            gsap.set(el, { clearProps: 'x,y' });
        };
    }, [ref, strength, radius]);
}

export function Magnetic({ children, strength, className = '', as: Tag = 'span' }) {
    const ref = useRef(null);
    useMagnetic(ref, { strength });
    return (
        <Tag ref={ref} className={`inline-block ${className}`}>
            {children}
        </Tag>
    );
}

/**
 * Pointer spotlight: writes --mx / --my (px) on the element so CSS can paint
 * a radial highlight that tracks the cursor. Pair with the .v2-spotlight class.
 */
export function useSpotlight(ref) {
    useEffect(() => {
        const el = ref.current;
        if (!el || !hasFinePointer()) return undefined;
        const onMove = (event) => {
            const target = event.target.closest?.('.v2-spotlight');
            if (!target || !el.contains(target)) return;
            const rect = target.getBoundingClientRect();
            target.style.setProperty('--mx', `${event.clientX - rect.left}px`);
            target.style.setProperty('--my', `${event.clientY - rect.top}px`);
        };
        el.addEventListener('pointermove', onMove);
        return () => el.removeEventListener('pointermove', onMove);
    }, [ref]);
}

/**
 * Infinite marquee whose speed and direction follow scroll velocity: scroll
 * down and the band surges forward, scroll up and it reverses, then eases
 * back to its idle drift. Content is rendered twice so the -50% loop is
 * seamless. Static and horizontally scrollable when motion is disabled.
 */
export function Marquee({ children, speed = 40, reverse = false, className = '', itemClassName = '' }) {
    const rootRef = useRef(null);

    useGSAP(
        () => {
            const root = rootRef.current;
            const track = root?.querySelector('.v2-marquee-track');
            if (!track || motionDisabled()) return;

            const loop = gsap.fromTo(
                track,
                { xPercent: reverse ? -50 : 0 },
                { xPercent: reverse ? 0 : -50, duration: speed, ease: 'none', repeat: -1 }
            );

            let settle;
            ScrollTrigger.create({
                trigger: root,
                start: 'top bottom',
                end: 'bottom top',
                onUpdate: (self) => {
                    const velocity = self.getVelocity();
                    const boost = gsap.utils.clamp(-6, 6, velocity / 260);
                    const target = (self.direction === 1 ? 1 : -1) * Math.max(1, Math.abs(boost));
                    settle?.kill();
                    gsap.to(loop, { timeScale: target, duration: 0.25, ease: 'power2.out', overwrite: true });
                    // Glide back to idle drift, keeping the last travel direction.
                    settle = gsap.to(loop, {
                        timeScale: self.direction === 1 ? 1 : -1,
                        duration: 1.4,
                        delay: 0.25,
                        ease: 'power3.out',
                    });
                },
            });

            const pause = () => loop.pause();
            const play = () => loop.resume();
            root.addEventListener('pointerenter', pause);
            root.addEventListener('pointerleave', play);
            return () => {
                root.removeEventListener('pointerenter', pause);
                root.removeEventListener('pointerleave', play);
            };
        },
        { scope: rootRef, dependencies: [speed, reverse] }
    );

    const items = React.Children.toArray(children);

    return (
        <div ref={rootRef} className={`v2-marquee relative overflow-hidden ${className}`}>
            <div className="v2-marquee-track flex w-max">
                {[0, 1].map((copy) => (
                    <div
                        key={copy}
                        className={`flex shrink-0 items-center ${itemClassName}`}
                        aria-hidden={copy === 1 ? 'true' : undefined}
                    >
                        {items}
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * Masked line/word/char reveal for a scope. Call inside a useV2Fx `extra`.
 * Targets `.split-char` / `.split-inner` descendants of `el`.
 */
export function revealSplit(el, { trigger, delay = 0, stagger = 0.022, duration = 1.1, scrollTrigger = true } = {}) {
    if (!el) return null;
    const parts = el.querySelectorAll('.split-char, .split-inner');
    if (!parts.length) return null;
    return gsap.fromTo(
        parts,
        { yPercent: 110, rotate: 4 },
        {
            yPercent: 0,
            rotate: 0,
            duration,
            delay,
            ease: 'expo.out',
            stagger,
            scrollTrigger: scrollTrigger
                ? { trigger: trigger || el, start: 'top 88%', toggleActions: 'play none none none' }
                : undefined,
        }
    );
}
