/**
 * Aiyu Arcade game registry — single source of truth for the menu page,
 * the /games/[slug] routes, and high-score storage keys.
 *
 * Colors reference the arcade palette defined in src/app/games/games.css.
 */
export const GAMES = [
    {
        slug: 'byte-runner',
        title: 'BYTE RUNNER',
        icon: '🏃',
        color: 'var(--arc-cyan)',
        tagline: 'Endless 3-lane dodge. Firewalls incoming — collect data bits, do not get flattened.',
        controls: '◀ ▶ or A/D to switch lanes · swipe on mobile',
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
