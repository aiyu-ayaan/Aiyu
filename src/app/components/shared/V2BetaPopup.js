"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FaArrowRight, FaXmark } from 'react-icons/fa6';

const DISMISS_KEY = 'v2-beta-popup-dismissed';
const SHOW_DELAY_MS = 1600;

/**
 * One-time nudge toward the /v2 redesign, shown only on the classic home
 * page. Dismissal is remembered in localStorage so it doesn't nag returning
 * visitors; "Try it" also counts as dismissal since they've seen it.
 */
export default function V2BetaPopup() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        let dismissed = false;
        try {
            dismissed = window.localStorage.getItem(DISMISS_KEY) === '1';
        } catch {
            // localStorage unavailable (private mode, etc.) — show anyway.
        }
        if (dismissed) return;

        const timer = window.setTimeout(() => {
            // When v2 is the admin default, the proxy serves the v2 page AT "/"
            // — don't promote v2 to someone already looking at it.
            if (document.querySelector('[data-v2-shell]')) return;
            setVisible(true);
        }, SHOW_DELAY_MS);
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
            aria-label="V2 beta announcement"
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
                    New · Beta
                </p>

                <h2 className="mb-1.5 pr-6 text-lg font-bold tracking-tight" style={{ color: 'var(--text-bright)' }}>
                    A 3D scroll experience is live.
                </h2>
                <p className="mb-4 text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                    Same home and about pages, redesigned with depth, GSAP-driven scroll, and a pinned card deck.
                </p>

                <div className="flex items-center gap-3">
                    <Link
                        href="/v2"
                        onClick={() => {
                            // Clear any classic opt-out so v2-as-default kicks back in.
                            document.cookie = 'site-version=v2; path=/; max-age=31536000';
                            dismiss();
                        }}
                        className="pill-solid inline-flex items-center gap-2 !py-2 !text-sm"
                    >
                        Try V2 <FaArrowRight size={11} />
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
