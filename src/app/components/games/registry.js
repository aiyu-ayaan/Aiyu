/**
 * Aiyu Arcade game registry — single source of truth for the menu page,
 * the /games/[slug] routes, and high-score storage keys.
 *
 * Colors reference the arcade palette defined in src/app/games/games.css.
 */
export const GAMES = [
    {
        slug: 'byte-runner',
        title: 'BYTE RUNNER 3D',
        icon: '🏃',
        color: 'var(--arc-cyan)',
        tagline: 'Full-3D endless run down a neon highway. Dodge walls, jump hurdles, roll under bars, grab data bits.',
        controls: '◀ ▶ lanes · ▲ jump · ▼ roll · swipe on mobile',
        scored: true,
    },
    {
        slug: 'tetris',
        title: 'TETRIS',
        icon: '🟪',
        color: 'var(--arc-magenta)',
        tagline: 'Seven pieces, ghost drop, hard drop, and gravity that stops being polite at level 5.',
        controls: '◀ ▶ move · ▲ rotate · ▼ soft drop · SPACE hard drop · touch pad on mobile',
        scored: true,
    },
    {
        slug: 'snake',
        title: 'SNAKE',
        icon: '🐍',
        color: 'var(--arc-green)',
        tagline: 'The classic. Eat, grow, and try not to bite yourself. Speed ramps up as you feast.',
        controls: 'Arrows or WASD · swipe on mobile · P to pause',
        scored: true,
    },
    {
        slug: 'breakout',
        title: 'BREAKOUT',
        icon: '🧱',
        color: 'var(--arc-magenta)',
        tagline: 'Smash the wall, keep the ball alive. Three lives, rainbow bricks, pure 1976 energy.',
        controls: '◀ ▶ or mouse · drag on mobile',
        scored: true,
    },
    {
        slug: 'invaders',
        title: 'SPACE INVADERS',
        icon: '👾',
        color: 'var(--arc-amber)',
        tagline: 'The fleet descends. Hold the line, cannon commander — waves only get meaner.',
        controls: '◀ ▶ to move · SPACE to fire · touch buttons on mobile',
        scored: true,
    },
    {
        slug: 'pong',
        title: 'PONG',
        icon: '🏓',
        color: 'var(--arc-cyan)',
        tagline: 'The 1972 original, vs a beatable-but-mean CPU. First to 7. Edge hits go fast.',
        controls: '▲ ▼ or W/S · mouse / drag on mobile',
        scored: false,
    },
    {
        slug: 'flappy-byte',
        title: 'FLAPPY BYTE',
        icon: '🐤',
        color: 'var(--arc-amber)',
        tagline: 'One button. Infinite regret. Thread the circuit pillars as long as your nerves hold.',
        controls: 'TAP / SPACE / ▲ to flap · P to pause',
        scored: true,
    },
    {
        slug: 'tic-tac-toe',
        title: 'TIC-TAC-TOE',
        icon: '⭕',
        color: 'var(--arc-red)',
        tagline: 'X vs O against a merciless minimax CPU — or grab a friend for 2P couch mode.',
        controls: 'Tap a cell · that is it, it is tic-tac-toe',
        scored: false,
    },
];

export function getGame(slug) {
    return GAMES.find((game) => game.slug === slug) || null;
}

export function highScoreKey(slug) {
    return `aiyu-arcade:hs:${slug}`;
}
