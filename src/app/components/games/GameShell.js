"use client";

import Link from 'next/link';

/**
 * Shared cabinet chrome around every arcade game: marquee title, back link,
 * and the controls hint. The game itself (canvas + HUD) renders as children.
 */
export default function GameShell({ game, children }) {
    return (
        <main style={{ '--arc-frame': game.color, '--arc-btn-color': game.color }}>
            <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <Link
                    href="/games"
                    className="arc-btn arc-btn--ghost"
                    style={{ '--arc-btn-color': 'var(--arc-dim)' }}
                >
                    ◀ ARCADE
                </Link>
                <h1 className="arc-title" style={{ fontSize: 'clamp(1rem, 4vw, 1.6rem)', color: game.color }}>
                    {game.icon} {game.title}
                </h1>
            </header>

            {children}

            <p className="arc-subtitle mt-6 text-center">{game.controls.toUpperCase()}</p>
        </main>
    );
}
