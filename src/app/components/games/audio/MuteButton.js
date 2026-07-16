"use client";

import { useEffect, useSyncExternalStore } from 'react';
import { getMuted, getServerMuted, hydrateFromStorage, subscribe, toggleMuted } from './muteStore';

/**
 * Global arcade audio toggle, rendered once in GameShell so every cabinet gets
 * it for free. Imports only the store — never the engine — so the synth stays
 * in the cabinets' async chunk.
 */
export default function MuteButton() {
    const muted = useSyncExternalStore(subscribe, getMuted, getServerMuted);

    useEffect(() => {
        hydrateFromStorage();
    }, []);

    return (
        <button
            type="button"
            className="arc-btn arc-btn--ghost"
            style={{ '--arc-btn-color': muted ? 'var(--arc-dim)' : 'var(--arc-green)' }}
            aria-pressed={!muted}
            aria-label={muted ? 'Unmute arcade audio' : 'Mute arcade audio'}
            onClick={toggleMuted}
        >
            {muted ? '♪ OFF' : '♪ ON'}
        </button>
    );
}
