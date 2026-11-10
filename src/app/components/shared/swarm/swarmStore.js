"use client";

import { useSyncExternalStore } from 'react';

/**
 * Visitor preference for the "swarm build" page animation. Off by default:
 * the animation only ever plays for someone who switched it on.
 *
 * The enabled key is also read by the pre-paint script in app/layout.js, so
 * keep the key name and the route test in sync with it.
 */
export const SWARM_KEY = 'aiyu:swarmBuild';
const AUTO_KEY = 'aiyu:swarmAuto';

/** App-shell routes where blanking the page would get in the way. */
export const SWARM_SKIP_ROUTE = /^\/(?:admin|desktop|games)(?:\/|$)/;

const read = (key) => {
    try {
        return window.localStorage.getItem(key) === '1';
    } catch {
        return false; // private mode / storage disabled
    }
};

const write = (key, on) => {
    try {
        if (on) window.localStorage.setItem(key, '1');
        else window.localStorage.removeItem(key);
    } catch {
        // The choice still holds for this page view.
    }
};

const SERVER_STATE = { enabled: false, auto: false };
let state = typeof window === 'undefined'
    ? SERVER_STATE
    : { enabled: read(SWARM_KEY), auto: read(AUTO_KEY) };
const listeners = new Set();

const emit = (patch) => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
};

const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

export function useSwarmPref() {
    return useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);
}

export const getSwarmPref = () => state;

export const setSwarmEnabled = (enabled) => {
    write(SWARM_KEY, enabled);
    emit({ enabled });
};

export const setSwarmAuto = (auto) => {
    write(AUTO_KEY, auto);
    emit({ auto });
};
