"use client";

import { useSyncExternalStore } from 'react';

/**
 * Story autoplay: scrolls the page through the hero film and the life-story
 * chapters at a steady, readable pace, so the story plays like a film.
 *
 * - 1× is slightly slower than the films' real time (they are scrubbed at
 *   about 34% of the viewport per film second), so every line can be read.
 * - It stops by itself at the end of the last chapter.
 * - Any scroll the reader makes (wheel, touch, scroll keys) pauses it: the
 *   reader always wins.
 *
 * The state lives in a tiny external store so the hero dock (which offers
 * "Play story" on the first screen) and the floating StoryPlayer share it.
 */

export const STORY_SPEEDS = [1, 1.5, 2, 3];
const VIEWPORTS_PER_SECOND = 0.3;
const END_ID = 'story-now';
const SCROLL_KEYS = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ', 'Spacebar']);

let state = { playing: false, speed: 1, heroDock: false };
const listeners = new Set();

const emit = (patch) => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
};

const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

const SERVER_STATE = state;

export function useStoryAutoplay() {
    return useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);
}

/** Scroll position at which the last chapter has fully played. */
export function storyEndY() {
    if (typeof document === 'undefined') return Infinity;
    const el = document.getElementById(END_ID);
    if (!el) return Infinity;
    return el.getBoundingClientRect().top + window.scrollY + el.offsetHeight - window.innerHeight;
}

let raf = 0;
let last = 0;
let pos = 0;
let applied = 0;

const scrollToY = (y) => {
    applied = y;
    if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true });
    // 'instant': the page's CSS smooth scrolling would otherwise animate
    // every frame's step and fall behind the loop.
    else window.scrollTo({ top: y, behavior: 'instant' });
};

const tick = (now) => {
    if (!state.playing) return;
    // Something else moved the page (a link, scroll-to-top, a scrollbar
    // drag): that is the reader taking over.
    if (Math.abs(window.scrollY - applied) > 48) {
        pause();
        return;
    }
    // Clamp the step so a backgrounded tab does not jump on return.
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    pos += VIEWPORTS_PER_SECOND * window.innerHeight * state.speed * dt;
    const end = storyEndY();
    if (pos >= end) {
        scrollToY(end);
        pause();
        return;
    }
    scrollToY(pos);
    raf = requestAnimationFrame(tick);
};

// Input that means "the reader is scrolling": hand control back at once.
// Listeners run in the capture phase so the smooth-scroll library, which
// also handles wheel input, cannot swallow the event first.
const onUserScroll = (event) => {
    if (event.type === 'keydown' && !SCROLL_KEYS.has(event.key)) return;
    // Pressing the player's own buttons is not scrolling (a wheel over it is).
    if (event.type !== 'wheel' && event.target instanceof Element && event.target.closest('[data-story-player]')) return;
    pause();
};

const listen = (on) => {
    const method = on ? 'addEventListener' : 'removeEventListener';
    window[method]('wheel', onUserScroll, { passive: true, capture: true });
    window[method]('touchstart', onUserScroll, { passive: true, capture: true });
    window[method]('pointerdown', onUserScroll, { passive: true, capture: true });
    window[method]('keydown', onUserScroll, { capture: true });
};

export function play() {
    if (typeof window === 'undefined' || state.playing) return;
    const end = storyEndY();
    // Finished (or past the story): start again from the top.
    if (window.scrollY >= end - 2) scrollToY(0);
    pos = window.scrollY;
    applied = pos;
    last = performance.now();
    listen(true);
    emit({ playing: true });
    raf = requestAnimationFrame(tick);
}

export function pause() {
    if (!state.playing) return;
    cancelAnimationFrame(raf);
    listen(false);
    emit({ playing: false });
}

export const toggle = () => (state.playing ? pause() : play());

export const setSpeed = (speed) => {
    if (STORY_SPEEDS.includes(speed)) emit({ speed });
};

export const cycleSpeed = () => {
    const next = STORY_SPEEDS[(STORY_SPEEDS.indexOf(state.speed) + 1) % STORY_SPEEDS.length];
    emit({ speed: next });
};

/** The hero reports when its own press-start dock owns the bottom slot. */
export const setHeroDock = (heroDock) => {
    if (state.heroDock !== heroDock) emit({ heroDock });
};
