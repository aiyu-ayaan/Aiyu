/**
 * Arcade mute state — a module singleton, deliberately not React Context.
 *
 * The synth engine has to be a document-level singleton anyway (browsers cap
 * AudioContexts), and cabinets read mute state from rAF loops and []-dep
 * effects where a Context value would have to be mirrored into a ref. So the
 * store is the single authority: React reads it via useSyncExternalStore, the
 * engine subscribes to it directly.
 *
 * Nothing here imports the engine — that is what keeps synth.js out of
 * GameShell's chunk.
 *
 * Storage follows the useHighScore.js pattern: deterministic initial value so
 * server HTML matches the first client render, real value read later from an
 * effect, every localStorage touch wrapped in try/catch.
 */

const KEY = 'aiyu-arcade:muted';

let muted = false;
let hydrated = false;
const listeners = new Set();

function emit() {
    for (const fn of listeners) fn();
}

export function getMuted() {
    return muted;
}

export function getServerMuted() {
    return false;
}

export function setMuted(next) {
    if (muted === next) return;
    muted = next;
    try {
        window.localStorage.setItem(KEY, next ? 'true' : 'false');
    } catch {
        // Private mode / storage disabled — degrade to session-only.
    }
    emit();
}

export function toggleMuted() {
    setMuted(!muted);
}

export function subscribe(fn) {
    listeners.add(fn);
    return () => {
        listeners.delete(fn);
    };
}

/**
 * Pull the stored preference into the store. Call from an effect, never during
 * render. Safe to call more than once — only the first call reads storage, so
 * a second cabinet mounting cannot clobber a toggle made in between.
 */
export function hydrateFromStorage() {
    if (hydrated) return;
    hydrated = true;

    try {
        const stored = window.localStorage.getItem(KEY);
        if (stored !== null) {
            muted = stored === 'true';
            emit();
        }
    } catch {
        // Storage unavailable — keep the default.
    }

    try {
        window.addEventListener('storage', (event) => {
            if (event.key !== KEY) return;
            const next = event.newValue === 'true';
            if (next === muted) return;
            muted = next;
            emit();
        });
    } catch {
        // No window (should not happen — this runs from an effect).
    }
}
