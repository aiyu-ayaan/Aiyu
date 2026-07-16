"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FaGamepad, FaXmark } from 'react-icons/fa6';

const DISMISS_KEY = 'arcade-popup-dismissed';
const V2_POPUP_DISMISS_KEY = 'v2-beta-popup-dismissed';
const SHOW_DELAY_MS = 2400;

/**
 * One-time "new update" nudge toward the /games arcade, same pattern as
 * V2BetaPopup: shown on the home page, dismissal remembered in localStorage.
 * If the V2 beta popup is still pending on the classic home page, this one
 * yields (both anchor bottom-left) and simply tries again on a later visit.
 */
export default function ArcadePopup() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        let dismissed = false;
        let v2PopupPending = false;
        try {
            dismissed = window.localStorage.getItem(DISMISS_KEY) === '1';
            v2PopupPending = window.localStorage.getItem(V2_POPUP_DISMISS_KEY) !== '1';
        } catch {
            // localStorage unavailable (private mode, etc.) — show anyway.
        }
        if (dismissed) return;

        // The V2 beta popup only renders on the classic home page (no v2 shell).
        const onClassicHome = !document.querySelector('[data-v2-shell]');
        if (onClassicHome && v2PopupPending) return;

        const timer = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);
        return () => window.clearTimeout(timer);
    }, []);

    const dismiss = () => {
        setVisible(false);
        try {
            window.localStorage.setItem(DISMISS_KEY, '1');
        } catch {
            // Ignore storage failures — worst case it reappears next visit.
        }
    };

    return (
        <div
            role="dialog"
            aria-label="Arcade announcement"
            className="fixed bottom-6 left-6 z-[95] max-w-sm transition-all duration-500 ease-out motion-reduce:transition-none"
            style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(16px)',
                pointerEvents: visible ? 'auto' : 'none',
            }}
            aria-hidden={visible ? undefined : 'true'}
        >
            <div
                className="glass-panel relative overflow-hidden rounded-2xl border p-5 shadow-2xl"
                style={{
                    borderColor: 'color-mix(in srgb, var(--accent-cyan) 40%, var(--border-secondary))',
                    background:
                        'linear-gradient(160deg, color-mix(in srgb, var(--bg-surface) 92%, transparent), color-mix(in srgb, var(--bg-secondary) 88%, transparent))',
                    backdropFilter: 'blur(20px) saturate(150%)',
                }}
            >
                <button
                    type="button"
                    onClick={dismiss}
                    aria-label="Dismiss"
                    className="absolute right-3 top-3 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 hover:bg-[rgba(255,255,255,0.08)]"
                    style={{ color: 'var(--text-muted)' }}
                >
                    <FaXmark size={12} />
                </button>

                <p
                    className="mb-2 inline-flex items-center gap-1.5 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.2em]"
                    style={{ color: 'var(--accent-cyan)' }}
                >
                    <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ backgroundColor: 'var(--accent-cyan)' }} />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ backgroundColor: 'var(--accent-cyan)' }} />
                    </span>
                    New Update · Arcade
                </p>

                <h2 className="mb-1.5 pr-6 text-lg font-bold tracking-tight" style={{ color: 'var(--text-bright)' }}>
                    The Aiyu Arcade just opened. 🕹️
                </h2>
                <p className="mb-4 text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                    Eight retro time-killers — a 3D Byte Runner, Tetris, Snake, Breakout, Space
                    Invaders, Pong, Flappy Byte, and an unbeatable Tic-Tac-Toe. High scores included.
                </p>

                <div className="flex items-center gap-3">
                    <Link
                        href="/games"
                        onClick={dismiss}
                        className="pill-solid inline-flex items-center gap-2 !py-2 !text-sm"
                    >
                        <FaGamepad size={13} /> Insert coin
                    </Link>
                    <button
                        type="button"
                        onClick={dismiss}
                        className="cursor-pointer text-sm font-medium underline-offset-4 hover:underline"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        Maybe later
                    </button>
                </div>
            </div>
        </div>
    );
}
