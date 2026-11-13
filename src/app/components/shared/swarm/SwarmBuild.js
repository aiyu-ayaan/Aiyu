"use client";

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { History, Play, RotateCcw, X } from 'lucide-react';
import { BOOT_READY_EVENT, isBootReady } from '../bootSignal';
import { createSwarm, SWARM_SPEEDS } from './swarmEngine';
import { getSwarmPref, setSwarmAuto, SWARM_SKIP_ROUTE } from './swarmStore';

const POLL_MS = 120;
const DONE_LINGER_MS = 10000;

const seconds = (ms) => `${(ms / 1000).toFixed(1)}s`;

const pill = {
    borderColor: 'color-mix(in srgb, var(--border-secondary) 80%, transparent)',
    backgroundColor: 'color-mix(in srgb, var(--bg-surface) 94%, transparent)',
    color: 'var(--text-primary)',
};

function HudButton({ active, children, ...props }) {
    return (
        <button
            type="button"
            className="inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-full border px-2.5 font-mono text-[0.68rem] font-semibold transition-colors duration-150"
            style={{
                borderColor: active ? 'var(--accent-cyan)' : 'color-mix(in srgb, var(--border-secondary) 80%, transparent)',
                backgroundColor: active ? 'color-mix(in srgb, var(--accent-cyan) 18%, transparent)' : 'transparent',
                color: active ? 'var(--accent-cyan)' : 'var(--text-secondary, var(--text-primary))',
            }}
            {...props}
        >
            {children}
        </button>
    );
}

/**
 * Runs the swarm build on each page while the visitor has it switched on, and
 * shows its controls: progress, auto-scroll, speed, the build history, replay.
 * Mounted only when the preference is on (see ClientEnhancements).
 */
export default function SwarmBuild() {
    const pathname = usePathname();
    const listRef = useRef(null);
    const [engine, setEngine] = useState(null);
    const [snap, setSnap] = useState(null);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [run, setRun] = useState(0);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        const skip = SWARM_SKIP_ROUTE.test(pathname) || window.self !== window.top;
        if (skip) {
            document.documentElement.removeAttribute('data-swarm-boot');
            return undefined;
        }
        let swarm = null;
        let poll = 0;
        const start = () => {
            swarm = createSwarm({ auto: getSwarmPref().auto });
            setEngine(swarm);
            setDismissed(false);
            setSnap(swarm.snapshot());
            poll = window.setInterval(() => setSnap(swarm.snapshot()), POLL_MS);
        };
        // Wait for the boot splash to clear so the build is not played behind it.
        if (isBootReady()) start();
        else window.addEventListener(BOOT_READY_EVENT, start, { once: true });

        return () => {
            window.removeEventListener(BOOT_READY_EVENT, start);
            window.clearInterval(poll);
            swarm?.destroy();
            setEngine(null);
            setSnap(null);
        };
    }, [pathname, run]);

    // Esc skips the build in progress.
    const running = !!snap && !snap.finished && !dismissed;
    useEffect(() => {
        if (!running) return undefined;
        const onKey = (event) => {
            if (event.key !== 'Escape') return;
            engine.destroy();
            setDismissed(true);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [running, engine]);

    // The summary steps aside by itself unless the history is being read.
    const finished = !!snap?.finished;
    useEffect(() => {
        if (!finished || historyOpen) return undefined;
        const timer = window.setTimeout(() => setDismissed(true), DONE_LINGER_MS);
        return () => window.clearTimeout(timer);
    }, [finished, historyOpen]);

    // Keep the newest history row in view while the build runs.
    const built = snap?.built ?? 0;
    useEffect(() => {
        const list = listRef.current;
        if (list && running) list.scrollTop = list.scrollHeight;
    }, [built, historyOpen, running]);

    if (!snap || !engine || dismissed) return null;

    const stop = () => {
        engine.destroy();
        setDismissed(true);
    };
    const progress = snap.total ? snap.done / snap.total : 1;
    const nextSpeed = SWARM_SPEEDS[(SWARM_SPEEDS.indexOf(snap.speed) + 1) % SWARM_SPEEDS.length];

    return (
        <div
            data-swarm-ui=""
            className="fixed inset-x-0 bottom-4 z-[9001] flex flex-col items-center gap-2 px-3 pointer-events-none"
        >
            {historyOpen && (
                <div
                    className="pointer-events-auto w-full max-w-md overflow-hidden rounded-2xl border shadow-2xl"
                    style={pill}
                    role="log"
                    aria-label="Build history"
                >
                    <div
                        className="flex items-center justify-between border-b px-4 py-2 font-mono text-[0.68rem] uppercase tracking-[0.16em]"
                        style={{ borderColor: pill.borderColor, color: 'var(--text-tertiary)' }}
                    >
                        <span>Build history</span>
                        <span>{snap.built} layers</span>
                    </div>
                    <ol ref={listRef} className="max-h-[42vh] overflow-y-auto overscroll-contain py-1" data-lenis-prevent="">
                        {engine.history.length === 0 && (
                            <li className="px-4 py-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                                Nothing built yet. Scroll to give the cursors something to do.
                            </li>
                        )}
                        {engine.history.map((entry) => (
                            <li key={entry.id}>
                                <button
                                    type="button"
                                    onClick={() => engine.locate(entry)}
                                    title="Show this layer"
                                    className="flex w-full cursor-pointer items-baseline gap-2 px-4 py-1 text-left text-xs transition-colors duration-100 hover:bg-[color-mix(in_srgb,var(--accent-cyan)_10%,transparent)]"
                                >
                                    <span className="w-10 shrink-0 font-mono tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
                                        {seconds(entry.t)}
                                    </span>
                                    <span className="h-2 w-2 shrink-0 self-center rounded-full" style={{ backgroundColor: entry.color }} />
                                    <span className="shrink-0 font-semibold">{entry.name}</span>
                                    <span className="shrink-0" style={{ color: 'var(--text-tertiary)' }}>{entry.verb}</span>
                                    <span className="min-w-0 truncate font-mono">{entry.label}</span>
                                </button>
                            </li>
                        ))}
                    </ol>
                </div>
            )}

            <div
                className="pointer-events-auto relative flex max-w-full items-center gap-2 overflow-hidden rounded-full border py-1.5 pl-2 pr-1.5 shadow-xl"
                style={pill}
            >
                <div className="flex shrink-0 -space-x-1.5" aria-hidden="true">
                    {engine.agents.slice(0, 4).map((agent) => (
                        <span
                            key={agent.name}
                            title={agent.name}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[0.62rem] font-bold text-white"
                            style={{ backgroundColor: agent.color, boxShadow: '0 0 0 2px var(--bg-surface)' }}
                        >
                            {agent.name[0]}
                        </span>
                    ))}
                </div>

                <p className="min-w-0 truncate px-1 font-mono text-[0.72rem]" aria-live="polite">
                    {snap.finished
                        ? `Built by ${engine.agents.length} cursors in ${seconds(snap.elapsed)}`
                        : `${snap.done} / ${snap.total} layers`}
                </p>

                {!snap.finished && (
                    <>
                        <HudButton
                            active={snap.auto}
                            aria-pressed={snap.auto}
                            title={snap.auto ? 'Auto-scroll is on. Scroll yourself to take over.' : 'Scroll for me while the cursors build'}
                            onClick={() => {
                                setSwarmAuto(!snap.auto);
                                engine.setAuto(!snap.auto);
                            }}
                        >
                            <Play size={10} fill="currentColor" aria-hidden="true" />
                            Auto
                        </HudButton>
                        <HudButton title="Build speed" aria-label={`Build speed ${snap.speed}x`} onClick={() => engine.setSpeed(nextSpeed)}>
                            {snap.speed}×
                        </HudButton>
                    </>
                )}
                <HudButton active={historyOpen} aria-expanded={historyOpen} title="Build history" onClick={() => setHistoryOpen((open) => !open)}>
                    <History size={11} aria-hidden="true" />
                    <span className="hidden sm:inline">History</span>
                </HudButton>
                {snap.finished && (
                    <HudButton
                        title="Wipe the page and build it again"
                        onClick={() => {
                            window.scrollTo({ top: 0, behavior: 'instant' });
                            setRun((n) => n + 1);
                        }}
                    >
                        <RotateCcw size={11} aria-hidden="true" />
                        Replay
                    </HudButton>
                )}
                <button
                    type="button"
                    onClick={stop}
                    aria-label={snap.finished ? 'Close' : 'Skip the build animation'}
                    title={snap.finished ? 'Close' : 'Skip (Esc)'}
                    className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--text-primary)_10%,transparent)]"
                >
                    <X size={13} aria-hidden="true" />
                </button>

                {!snap.finished && (
                    <span
                        className="absolute bottom-0 left-0 h-0.5 transition-[width] duration-200 ease-out"
                        style={{ width: `${progress * 100}%`, backgroundColor: 'var(--accent-cyan)' }}
                        aria-hidden="true"
                    />
                )}
            </div>
        </div>
    );
}
