import Link from 'next/link';
import { GAMES } from '@/app/components/games/registry';
import HighScoreBadge from '@/app/components/games/HighScoreBadge';

export const metadata = {
    title: 'Aiyu Arcade | Insert Coin',
    description:
        'Eight retro time-killers built into the portfolio: Byte Runner 3D, Tetris, Snake, Breakout, Space Invaders, Pong, Flappy Byte, and Tic-Tac-Toe.',
};

export default function GamesPage() {
    return (
        <main>
            <header className="mb-10 text-center">
                <p className="arc-subtitle mb-4">
                    ★ ★ ★ WELCOME TO ★ ★ ★
                </p>
                <h1 className="arc-title mb-5">AIYU ARCADE</h1>
                <p className="arc-subtitle mx-auto max-w-2xl">
                    EIGHT CABINETS. ZERO QUARTERS REQUIRED.
                    <br />
                    HIGH SCORES LIVE IN YOUR BROWSER — DEFEND THEM.
                </p>
                <p className="arc-subtitle mt-6">
                    <span className="arc-blink" style={{ color: 'var(--arc-green)' }}>
                        ▶ SELECT A GAME TO START ◀
                    </span>
                </p>
            </header>

            <section
                aria-label="Game cabinets"
                className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
                {GAMES.map((game) => (
                    <Link
                        key={game.slug}
                        href={`/games/${game.slug}`}
                        className="pixel-frame arc-card"
                        style={{ '--arc-frame': game.color }}
                    >
                        <span className="arc-card-icon" aria-hidden="true">
                            {game.icon}
                        </span>
                        <span className="arc-card-title">{game.title}</span>
                        <span className="arc-card-tagline">{game.tagline}</span>
                        <span className="arc-card-footer">
                            {game.scored ? (
                                <HighScoreBadge slug={game.slug} />
                            ) : (
                                <span className="arc-hiscore">VS CPU / 2P</span>
                            )}
                            <span className="arc-press-start arc-blink">PRESS START</span>
                        </span>
                    </Link>
                ))}
            </section>

            <footer className="mt-12 text-center">
                <p className="arc-subtitle">
                    BUILT PIXEL BY PIXEL · NO GAME ENGINES WERE HARMED
                </p>
                <p className="mt-4">
                    <Link href="/" className="arc-btn arc-btn--ghost" style={{ '--arc-btn-color': 'var(--arc-dim)' }}>
                        ◀ EXIT ARCADE
                    </Link>
                </p>
            </footer>
        </main>
    );
}
