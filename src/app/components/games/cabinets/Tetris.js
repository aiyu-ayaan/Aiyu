"use client";

import { useEffect, useRef, useState } from 'react';
import { useHighScore } from '../useHighScore';
import { useGameAudio } from '../audio/useGameAudio';

const COLS = 10;
const ROWS = 20;
const CELL = 26;
const PANEL_W = 110;
const W = COLS * CELL + PANEL_W;
const H = ROWS * CELL;
const LINE_POINTS = [0, 100, 300, 500, 800];

const PIECES = {
    I: { color: '#2ee6ff', shape: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]] },
    O: { color: '#ffc94f', shape: [[1, 1], [1, 1]] },
    T: { color: '#ff4fd8', shape: [[0, 1, 0], [1, 1, 1], [0, 0, 0]] },
    S: { color: '#33ff66', shape: [[0, 1, 1], [1, 1, 0], [0, 0, 0]] },
    Z: { color: '#ff5c5c', shape: [[1, 1, 0], [0, 1, 1], [0, 0, 0]] },
    J: { color: '#6b8cff', shape: [[1, 0, 0], [1, 1, 1], [0, 0, 0]] },
    L: { color: '#ff8a4f', shape: [[0, 0, 1], [1, 1, 1], [0, 0, 0]] },
};
const PIECE_KEYS = Object.keys(PIECES);

function rotateCW(shape) {
    const n = shape.length;
    const out = Array.from({ length: n }, () => Array(n).fill(0));
    for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
            out[x][n - 1 - y] = shape[y][x];
        }
    }
    return out;
}

function randomPiece() {
    const key = PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)];
    const def = PIECES[key];
    return {
        shape: def.shape.map((row) => [...row]),
        color: def.color,
        x: Math.floor((COLS - def.shape.length) / 2),
        y: -1,
    };
}

function collides(grid, piece, ox = 0, oy = 0, shape = piece.shape) {
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (!shape[y][x]) continue;
            const gx = piece.x + x + ox;
            const gy = piece.y + y + oy;
            if (gx < 0 || gx >= COLS || gy >= ROWS) return true;
            if (gy >= 0 && grid[gy][gx]) return true;
        }
    }
    return false;
}

export default function Tetris() {
    const canvasRef = useRef(null);
    const [phase, setPhase] = useState('ready');
    const [score, setScore] = useState(0);
    const [lines, setLines] = useState(0);
    const [level, setLevel] = useState(1);
    const [highScore, submitScore] = useHighScore('tetris');
    const audio = useGameAudio('tetris', phase);

    const stateRef = useRef(null);
    const phaseRef = useRef('ready');
    const setPhaseBoth = (next) => {
        phaseRef.current = next;
        setPhase(next);
    };

    const resetGame = () => {
        stateRef.current = {
            grid: Array.from({ length: ROWS }, () => Array(COLS).fill(null)),
            piece: randomPiece(),
            next: randomPiece(),
            score: 0,
            lines: 0,
            level: 1,
            acc: 0,
            actions: stateRef.current?.actions, // survive resets — wired once on mount
        };
        setScore(0);
        setLines(0);
        setLevel(1);
    };

    const startGame = () => {
        resetGame();
        setPhaseBoth('playing');
    };

    useEffect(() => {
        resetGame();

        const s = () => stateRef.current;

        const tryMove = (dx) => {
            if (phaseRef.current !== 'playing') return;
            if (!collides(s().grid, s().piece, dx, 0)) s().piece.x += dx;
        };

        const tryRotate = () => {
            if (phaseRef.current !== 'playing') return;
            const rotated = rotateCW(s().piece.shape);
            for (const kick of [0, -1, 1, -2, 2]) {
                if (!collides(s().grid, s().piece, kick, 0, rotated)) {
                    s().piece.shape = rotated;
                    s().piece.x += kick;
                    audio.sfx('rotate');
                    return;
                }
            }
        };

        const softDrop = () => {
            if (phaseRef.current !== 'playing') return;
            if (!collides(s().grid, s().piece, 0, 1)) {
                s().piece.y += 1;
                s().score += 1;
                setScore(s().score);
            }
        };

        const hardDrop = () => {
            if (phaseRef.current !== 'playing') return;
            let fell = 0;
            while (!collides(s().grid, s().piece, 0, 1)) {
                s().piece.y += 1;
                fell += 1;
            }
            s().score += fell * 2;
            s().acc = Number.POSITIVE_INFINITY; // lock on the next tick
            setScore(s().score);
        };

        const primaryAction = () => {
            if (phaseRef.current === 'ready' || phaseRef.current === 'over') startGame();
            else if (phaseRef.current === 'playing') setPhaseBoth('paused');
            else setPhaseBoth('playing');
        };

        const onKey = (e) => {
            const key = e.key.toLowerCase();
            if (key === 'arrowleft' || key === 'a') { e.preventDefault(); tryMove(-1); }
            else if (key === 'arrowright' || key === 'd') { e.preventDefault(); tryMove(1); }
            else if (key === 'arrowup' || key === 'w') { e.preventDefault(); tryRotate(); }
            else if (key === 'arrowdown' || key === 's') { e.preventDefault(); softDrop(); }
            else if (key === ' ') {
                e.preventDefault();
                if (phaseRef.current === 'playing') hardDrop();
                else primaryAction();
            } else if (key === 'enter' || key === 'p') {
                e.preventDefault();
                primaryAction();
            }
        };

        window.addEventListener('keydown', onKey);

        // expose for the touch buttons
        stateRef.current.actions = { tryMove, tryRotate, softDrop, hardDrop, primaryAction };

        return () => window.removeEventListener('keydown', onKey);
         
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let raf;
        let last = performance.now();

        const lockPiece = (s) => {
            const { grid, piece } = s;
            for (let y = 0; y < piece.shape.length; y++) {
                for (let x = 0; x < piece.shape[y].length; x++) {
                    if (!piece.shape[y][x]) continue;
                    const gy = piece.y + y;
                    if (gy < 0) {
                        submitScore(s.score);
                        setPhaseBoth('over');
                        audio.sfx('gameOver');
                        return;
                    }
                    grid[gy][piece.x + x] = piece.color;
                }
            }
            audio.sfx('lock');

            // Clear lines
            let cleared = 0;
            for (let y = ROWS - 1; y >= 0; y--) {
                if (grid[y].every(Boolean)) {
                    grid.splice(y, 1);
                    grid.unshift(Array(COLS).fill(null));
                    cleared += 1;
                    y += 1;
                }
            }
            if (cleared) {
                s.score += LINE_POINTS[cleared] * s.level;
                s.lines += cleared;
                const nextLevel = Math.floor(s.lines / 10) + 1;
                const didLevelUp = nextLevel !== s.level;
                s.level = nextLevel;
                setScore(s.score);
                setLines(s.lines);
                setLevel(s.level);
                if (didLevelUp) {
                    audio.sfx('levelUp');
                } else {
                    audio.sfx('lineClear');
                }
            }

            s.piece = s.next;
            s.next = randomPiece();
            if (collides(s.grid, s.piece)) {
                submitScore(s.score);
                setPhaseBoth('over');
                audio.sfx('gameOver');
            }
        };

        const update = (dt) => {
            const s = stateRef.current;
            const gravityMs = Math.max(90, 800 - (s.level - 1) * 70);
            s.acc += dt;
            while (s.acc >= gravityMs && phaseRef.current === 'playing') {
                s.acc = Number.isFinite(s.acc) ? s.acc - gravityMs : 0;
                if (!collides(s.grid, s.piece, 0, 1)) {
                    s.piece.y += 1;
                } else {
                    lockPiece(s);
                    break;
                }
            }
        };

        const drawCell = (x, y, color, px = 0) => {
            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 6;
            ctx.fillRect(px + x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
            ctx.shadowBlur = 0;
        };

        const draw = () => {
            const s = stateRef.current;
            ctx.fillStyle = '#030208';
            ctx.fillRect(0, 0, W, H);

            // Board frame
            ctx.strokeStyle = 'rgba(46, 230, 255, 0.25)';
            ctx.strokeRect(0.5, 0.5, COLS * CELL - 1, H - 1);

            // Settled cells
            for (let y = 0; y < ROWS; y++) {
                for (let x = 0; x < COLS; x++) {
                    if (s.grid[y][x]) drawCell(x, y, s.grid[y][x]);
                }
            }

            // Ghost piece
            let ghostY = 0;
            while (!collides(s.grid, s.piece, 0, ghostY + 1)) ghostY += 1;
            ctx.globalAlpha = 0.22;
            for (let y = 0; y < s.piece.shape.length; y++) {
                for (let x = 0; x < s.piece.shape[y].length; x++) {
                    if (s.piece.shape[y][x] && s.piece.y + y + ghostY >= 0) {
                        drawCell(s.piece.x + x, s.piece.y + y + ghostY, s.piece.color);
                    }
                }
            }
            ctx.globalAlpha = 1;

            // Active piece
            for (let y = 0; y < s.piece.shape.length; y++) {
                for (let x = 0; x < s.piece.shape[y].length; x++) {
                    if (s.piece.shape[y][x] && s.piece.y + y >= 0) {
                        drawCell(s.piece.x + x, s.piece.y + y, s.piece.color);
                    }
                }
            }

            // Side panel: NEXT preview
            const panelX = COLS * CELL;
            ctx.fillStyle = '#0c0820';
            ctx.fillRect(panelX, 0, PANEL_W, H);
            ctx.fillStyle = '#7d7a99';
            ctx.font = '12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('NEXT', panelX + PANEL_W / 2, 30);
            const n = s.next;
            const size = n.shape.length;
            const cell = 18;
            const ox = panelX + (PANEL_W - size * cell) / 2;
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < (n.shape[y] || []).length; x++) {
                    if (!n.shape[y][x]) continue;
                    ctx.fillStyle = n.color;
                    ctx.shadowColor = n.color;
                    ctx.shadowBlur = 5;
                    ctx.fillRect(ox + x * cell, 50 + y * cell, cell - 2, cell - 2);
                    ctx.shadowBlur = 0;
                }
            }
        };

        const frame = (now) => {
            const dt = Math.min(now - last, 100);
            last = now;
            if (phaseRef.current === 'playing') update(dt);
            draw();
            raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);

        const onVisibility = () => {
            if (document.hidden && phaseRef.current === 'playing') setPhaseBoth('paused');
        };
        document.addEventListener('visibilitychange', onVisibility);

        return () => {
            cancelAnimationFrame(raf);
            document.removeEventListener('visibilitychange', onVisibility);
        };
         
    }, [submitScore]);

    const act = (name) => stateRef.current?.actions?.[name]?.();

    return (
        <div>
            <div className="arc-hud mb-3">
                <span>SCORE {String(score).padStart(6, '0')}</span>
                <span style={{ color: 'var(--arc-magenta)' }}>LVL {level}</span>
                <span style={{ color: 'var(--arc-cyan)' }}>LINES {lines}</span>
                <span className="arc-hiscore">HI {String(Math.max(highScore, score)).padStart(6, '0')}</span>
            </div>

            <div className="arc-canvas-wrap arc-cab" style={{ '--arc-aspect': W / H }}>
                <canvas ref={canvasRef} width={W} height={H} />

                {phase !== 'playing' && (
                    <div className="arc-overlay">
                        {phase === 'ready' && (
                            <>
                                <p className="arc-overlay-title">TETRIS</p>
                                <p className="arc-overlay-text">
                                    STACK. CLEAR. REPEAT.
                                    <br />
                                    ▲ ROTATE · ▼ SOFT DROP · SPACE HARD DROP
                                    <br />
                                    EVERY 10 LINES THE GRAVITY BITES HARDER.
                                </p>
                                <button type="button" className="arc-btn" onClick={startGame}>
                                    ▶ DROP IN
                                </button>
                            </>
                        )}
                        {phase === 'paused' && (
                            <>
                                <p className="arc-overlay-title arc-blink">PAUSED</p>
                                <button type="button" className="arc-btn" onClick={() => setPhaseBoth('playing')}>
                                    ▶ RESUME
                                </button>
                            </>
                        )}
                        {phase === 'over' && (
                            <>
                                <p className="arc-overlay-title" style={{ color: 'var(--arc-red)' }}>
                                    TOPPED OUT
                                </p>
                                <p className="arc-overlay-text">
                                    FINAL SCORE {String(score).padStart(6, '0')} · {lines} LINES
                                    {score >= highScore && score > 0 ? ' — NEW RECORD!' : ''}
                                </p>
                                <button type="button" className="arc-btn" onClick={startGame}>
                                    ↻ PLAY AGAIN
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            <div className="arc-touch-controls mt-4">
                <button type="button" className="arc-touch-btn" aria-label="Move left" onClick={() => stateRef.current?.actions?.tryMove(-1)}>◀</button>
                <button type="button" className="arc-touch-btn" aria-label="Rotate" onClick={() => act('tryRotate')}>⟳</button>
                <button type="button" className="arc-touch-btn" aria-label="Move right" onClick={() => stateRef.current?.actions?.tryMove(1)}>▶</button>
                <button type="button" className="arc-touch-btn" aria-label="Soft drop" onClick={() => act('softDrop')}>▼</button>
                <button type="button" className="arc-touch-btn" aria-label="Hard drop" onClick={() => act('hardDrop')}>⤓</button>
            </div>
        </div>
    );
}
