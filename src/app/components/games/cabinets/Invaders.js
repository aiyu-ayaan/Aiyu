"use client";

import { useEffect, useRef, useState } from 'react';
import { useHighScore } from '../useHighScore';

const W = 480;
const H = 560;
const PLAYER_W = 40;
const PLAYER_H = 18;
const PLAYER_Y = H - 50;
const PLAYER_SPEED = 300;
const BULLET_SPEED = 480;
const ALIEN_BULLET_SPEED = 220;
const ALIEN_COLS = 8;
const ALIEN_ROWS = 4;
const ALIEN_W = 32;
const ALIEN_H = 22;
const ALIEN_GAP_X = 18;
const ALIEN_GAP_Y = 16;
const ALIEN_STEP_DOWN = 16;
const ROW_POINTS = [40, 30, 20, 10];
const ROW_GLYPHS = ['👾', '👾', '🛸', '🛸'];

function buildFleet(wave) {
    const aliens = [];
    for (let r = 0; r < ALIEN_ROWS; r++) {
        for (let c = 0; c < ALIEN_COLS; c++) {
            aliens.push({ r, c, alive: true });
        }
    }
    return {
        aliens,
        originX: 42,
        originY: 70,
        dir: 1,
        speed: 26 + wave * 8, // horizontal px/s, also scales with kills
        fireEvery: Math.max(420, 1100 - wave * 120),
        fireTimer: 0,
    };
}

export default function Invaders() {
    const canvasRef = useRef(null);
    const [phase, setPhase] = useState('ready');
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [wave, setWave] = useState(1);
    const [highScore, submitScore] = useHighScore('invaders');

    const stateRef = useRef(null);
    const phaseRef = useRef('ready');
    const setPhaseBoth = (next) => {
        phaseRef.current = next;
        setPhase(next);
    };

    const resetGame = () => {
        stateRef.current = {
            playerX: W / 2,
            keys: { left: false, right: false },
            bullet: null, // classic rule: one player shot on screen
            alienBullets: [],
            fleet: buildFleet(1),
            score: 0,
            lives: 3,
            wave: 1,
            hitFlash: 0,
        };
        setScore(0);
        setLives(3);
        setWave(1);
    };

    const startGame = () => {
        resetGame();
        setPhaseBoth('playing');
    };

    const fire = () => {
        const s = stateRef.current;
        if (!s || s.bullet) return;
        s.bullet = { x: s.playerX, y: PLAYER_Y - PLAYER_H / 2 };
    };

    useEffect(() => {
        resetGame();

        const primaryAction = () => {
            if (phaseRef.current === 'ready' || phaseRef.current === 'over') startGame();
            else if (phaseRef.current === 'playing') setPhaseBoth('paused');
            else setPhaseBoth('playing');
        };

        const onKey = (e) => {
            const key = e.key.toLowerCase();
            const s = stateRef.current;
            if (key === 'arrowleft' || key === 'a') { e.preventDefault(); s.keys.left = e.type === 'keydown'; }
            else if (key === 'arrowright' || key === 'd') { e.preventDefault(); s.keys.right = e.type === 'keydown'; }
            else if (key === ' ' && e.type === 'keydown') {
                e.preventDefault();
                if (phaseRef.current === 'playing') fire();
                else primaryAction();
            } else if ((key === 'enter' || key === 'p') && e.type === 'keydown') {
                e.preventDefault();
                primaryAction();
            }
        };

        window.addEventListener('keydown', onKey);
        window.addEventListener('keyup', onKey);
        return () => {
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('keyup', onKey);
        };
         
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let raf;
        let last = performance.now();

        const alienPos = (fleet, alien) => ({
            x: fleet.originX + alien.c * (ALIEN_W + ALIEN_GAP_X),
            y: fleet.originY + alien.r * (ALIEN_H + ALIEN_GAP_Y),
        });

        const loseLife = (s) => {
            s.lives -= 1;
            s.hitFlash = 300;
            s.alienBullets = [];
            setLives(s.lives);
            if (s.lives <= 0) {
                submitScore(s.score);
                setPhaseBoth('over');
            }
        };

        const update = (dt) => {
            const s = stateRef.current;
            const sec = dt / 1000;
            const fleet = s.fleet;

            if (s.hitFlash > 0) s.hitFlash -= dt;

            // Player
            if (s.keys.left) s.playerX -= PLAYER_SPEED * sec;
            if (s.keys.right) s.playerX += PLAYER_SPEED * sec;
            s.playerX = Math.max(PLAYER_W / 2, Math.min(W - PLAYER_W / 2, s.playerX));

            // Fleet march: fewer aliens → faster (classic accelerating dread)
            const alive = fleet.aliens.filter((a) => a.alive);
            const speedScale = 1 + (1 - alive.length / (ALIEN_COLS * ALIEN_ROWS)) * 2.2;
            fleet.originX += fleet.dir * fleet.speed * speedScale * sec;

            let minX = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const a of alive) {
                const p = alienPos(fleet, a);
                minX = Math.min(minX, p.x);
                maxX = Math.max(maxX, p.x + ALIEN_W);
                maxY = Math.max(maxY, p.y + ALIEN_H);
            }
            if (alive.length && (minX < 10 || maxX > W - 10)) {
                fleet.dir = -fleet.dir;
                fleet.originX += fleet.dir * 4;
                fleet.originY += ALIEN_STEP_DOWN;
            }

            // Invasion reaches the cannon line → instant defeat
            if (maxY >= PLAYER_Y - PLAYER_H) {
                s.lives = 0;
                setLives(0);
                submitScore(s.score);
                setPhaseBoth('over');
                return;
            }

            // Alien fire — random alive shooter
            fleet.fireTimer += dt;
            if (alive.length && fleet.fireTimer >= fleet.fireEvery) {
                fleet.fireTimer = 0;
                const shooter = alive[Math.floor(Math.random() * alive.length)];
                const p = alienPos(fleet, shooter);
                s.alienBullets.push({ x: p.x + ALIEN_W / 2, y: p.y + ALIEN_H });
            }

            // Player bullet
            if (s.bullet) {
                s.bullet.y -= BULLET_SPEED * sec;
                if (s.bullet.y < -10) {
                    s.bullet = null;
                } else {
                    for (const a of alive) {
                        const p = alienPos(fleet, a);
                        if (
                            s.bullet.x > p.x && s.bullet.x < p.x + ALIEN_W &&
                            s.bullet.y > p.y && s.bullet.y < p.y + ALIEN_H
                        ) {
                            a.alive = false;
                            s.bullet = null;
                            s.score += ROW_POINTS[a.r] * s.wave;
                            setScore(s.score);
                            break;
                        }
                    }
                }
            }

            // Alien bullets → player
            for (const b of s.alienBullets) {
                b.y += ALIEN_BULLET_SPEED * sec;
                if (
                    b.y > PLAYER_Y - PLAYER_H / 2 && b.y < PLAYER_Y + PLAYER_H &&
                    Math.abs(b.x - s.playerX) < PLAYER_W / 2
                ) {
                    b.dead = true;
                    loseLife(s);
                    if (phaseRef.current !== 'playing') return;
                }
            }
            s.alienBullets = s.alienBullets.filter((b) => !b.dead && b.y < H + 10);

            // Wave cleared
            if (!fleet.aliens.some((a) => a.alive)) {
                s.wave += 1;
                setWave(s.wave);
                s.fleet = buildFleet(s.wave);
                s.bullet = null;
                s.alienBullets = [];
            }
        };

        const draw = () => {
            const s = stateRef.current;
            ctx.fillStyle = s.hitFlash > 0 ? '#1a0510' : '#030208';
            ctx.fillRect(0, 0, W, H);

            // Stars
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            for (let i = 0; i < 40; i++) {
                const sx = (i * 137) % W;
                const sy = (i * 89 + Math.floor(performance.now() / 60)) % H;
                ctx.fillRect(sx, sy, 2, 2);
            }

            // Aliens
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '22px serif';
            for (const a of s.fleet.aliens) {
                if (!a.alive) continue;
                const p = alienPos(s.fleet, a);
                ctx.fillText(ROW_GLYPHS[a.r], p.x + ALIEN_W / 2, p.y + ALIEN_H / 2);
            }

            // Player cannon
            ctx.fillStyle = '#ffc94f';
            ctx.shadowColor = '#ffc94f';
            ctx.shadowBlur = 14;
            ctx.fillRect(s.playerX - PLAYER_W / 2, PLAYER_Y, PLAYER_W, PLAYER_H / 2);
            ctx.fillRect(s.playerX - 4, PLAYER_Y - PLAYER_H / 2, 8, PLAYER_H / 2);
            ctx.shadowBlur = 0;

            // Bullets
            if (s.bullet) {
                ctx.fillStyle = '#33ff66';
                ctx.shadowColor = '#33ff66';
                ctx.shadowBlur = 10;
                ctx.fillRect(s.bullet.x - 2, s.bullet.y - 10, 4, 12);
                ctx.shadowBlur = 0;
            }
            ctx.fillStyle = '#ff5c5c';
            for (const b of s.alienBullets) {
                ctx.fillRect(b.x - 2, b.y, 4, 10);
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

    const holdKey = (key, down) => {
        const s = stateRef.current;
        if (s) s.keys[key] = down;
    };

    return (
        <div>
            <div className="arc-hud mb-3">
                <span>SCORE {String(score).padStart(6, '0')}</span>
                <span style={{ color: 'var(--arc-amber)' }}>WAVE {wave}</span>
                <span style={{ color: 'var(--arc-red)' }}>{'♥'.repeat(Math.max(0, lives))}{'♡'.repeat(Math.max(0, 3 - lives))}</span>
                <span className="arc-hiscore">HI {String(Math.max(highScore, score)).padStart(6, '0')}</span>
            </div>

            <div className="arc-canvas-wrap mx-auto" style={{ maxWidth: W }}>
                <canvas ref={canvasRef} width={W} height={H} />

                {phase !== 'playing' && (
                    <div className="arc-overlay">
                        {phase === 'ready' && (
                            <>
                                <p className="arc-overlay-title">SPACE INVADERS</p>
                                <p className="arc-overlay-text">
                                    ONE SHOT ON SCREEN AT A TIME — MAKE IT COUNT.
                                    <br />
                                    THE FEWER THEY ARE, THE FASTER THEY GET.
                                    <br />
                                    DO NOT LET THEM LAND.
                                </p>
                                <button type="button" className="arc-btn" onClick={startGame}>
                                    ▶ DEFEND
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
                                    EARTH INVADED
                                </p>
                                <p className="arc-overlay-text">
                                    FINAL SCORE {String(score).padStart(6, '0')}
                                    {score >= highScore && score > 0 ? ' — NEW RECORD!' : ''}
                                </p>
                                <button type="button" className="arc-btn" onClick={startGame}>
                                    ↻ DEFEND AGAIN
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            <div className="arc-touch-controls mt-4">
                <button
                    type="button" className="arc-touch-btn" aria-label="Move left"
                    onTouchStart={() => holdKey('left', true)} onTouchEnd={() => holdKey('left', false)}
                    onMouseDown={() => holdKey('left', true)} onMouseUp={() => holdKey('left', false)}
                >
                    ◀
                </button>
                <button
                    type="button" className="arc-touch-btn" aria-label="Fire"
                    style={{ color: 'var(--arc-green)', borderColor: 'rgba(51, 255, 102, 0.5)' }}
                    onClick={() => { if (phaseRef.current === 'playing') fire(); }}
                >
                    ▲
                </button>
                <button
                    type="button" className="arc-touch-btn" aria-label="Move right"
                    onTouchStart={() => holdKey('right', true)} onTouchEnd={() => holdKey('right', false)}
                    onMouseDown={() => holdKey('right', true)} onMouseUp={() => holdKey('right', false)}
                >
                    ▶
                </button>
            </div>
        </div>
    );
}
