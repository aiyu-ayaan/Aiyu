"use client";

import { useEffect, useRef, useState } from 'react';
import { hydrateFromStorage } from './muteStore';

/**
 * Wires a cabinet to the arcade audio engine.
 *
 * Pass the rendered `phase` value (not phaseRef) and the whole music lifecycle
 * follows from it — including tab-blur pause, since every cabinet's existing
 * visibilitychange handler already flips phase to 'paused'. Cabinets never
 * call start/stop themselves.
 *
 * The returned object has a stable identity, so it is safe to capture inside
 * []-dep effects and rAF closures. Its methods no-op until the engine's async
 * chunk resolves.
 *
 * @param {string} slug   registry slug — selects the track
 * @param {string} phase  'ready' | 'playing' | 'paused' | 'over'
 */
export function useGameAudio(slug, phase) {
    const engineRef = useRef(null);
    const prevPhase = useRef(null);
    const slugRef = useRef(slug);

    // Lazy initializer, not a ref: identity is stable for the component's life
    // and nothing reads a ref during render.
    const [api] = useState(() => ({
        sfx: (name) => engineRef.current?.sfx(name),
        start: () => engineRef.current?.start(slugRef.current),
        stop: () => engineRef.current?.stopMusic(),
    }));

    // Dynamic import keeps the synth and the note data out of every chunk but
    // this one. Doubles as the engine's refcount acquire/release.
    useEffect(() => {
        let live = true;
        let release = null;

        slugRef.current = slug;
        hydrateFromStorage();

        import('./synth').then((mod) => {
            if (!live) return;
            engineRef.current = mod.acquireEngine();
            release = mod.releaseEngine;

            // The phase effect may already have run and found a null engine.
            if (prevPhase.current === 'playing') engineRef.current?.start(slugRef.current);
        });

        return () => {
            live = false;
            engineRef.current = null;
            release?.();
        };
    }, [slug]);

    useEffect(() => {
        const engine = engineRef.current;
        const previous = prevPhase.current;
        prevPhase.current = phase;

        if (!engine) return;

        if (phase === 'playing') {
            if (previous === 'paused') engine.resumeMusic();
            else engine.start(slug);
        } else if (phase === 'paused') {
            engine.pauseMusic();
        } else {
            engine.stopMusic();
        }
    }, [phase, slug]);

    return api;
}
