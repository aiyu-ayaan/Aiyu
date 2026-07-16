"use client";

import { useEffect, useRef, useState } from 'react';
import { useHighScore } from '../useHighScore';

const W = 360;
const H = 520;
const LANES = 3;
const LANE_W = W / LANES;
const PLAYER_SIZE = 40;
const PLAYER_Y = H - 90;
const START_SPEED = 240; // px/s downward
const MAX_SPEED = 620;
const SPEED_RAMP = 6; // px/s gained per second survived
const SPAWN_EVERY_MS = 900;
const MIN_SPAWN_MS = 380;
const COIN_CHANCE = 0.35;
const SWIPE_THRESHOLD = 24;

function laneX(lane) {
    return lane * LANE_W + LANE_W / 2;
}

export default function ByteRunner() {
    const canvasRef = useRef(null);
    const [phase, setPhase] = useState('ready');
    const [score, setScore] = useState(0);
    const [highScore, submitScore] = useHighScore('byte-runner');

    const stateRef = useRef(null);
    const phaseRef = useRef('ready');
    const setPhaseBoth = (next) => {
        phaseRef.current = next;
        setPhase(next);
    };

    const resetGame = () => {
        stateRef.current = {
            lane: 1,
            x: laneX(1), // rendered x, lerps toward the target lane
            speed: START_SPEED,
            entities: [], // { lane, y, type: 'wall' | 'coin' }
            spawnTimer: 0,
            spawnEvery: SPAWN_EVERY_MS,
            distance: 0,
            coins: 0,
            score: 0,
            roadOffset: 0,
        };
        setScore(0);
    };

    const startGame = () => {
        resetGame();
        setPhaseBoth('playing');
    };

    useEffect(() => {
        resetGame();

        const move = (delta) => {
            const s = stateRef.current;
            if (!s) return;
            s.lane = Math.max(0, Math.min(LANES - 1, s.lane + delta));
        };

        const primaryAction = () => {
            if (phaseRef.current === 'ready' || phaseRef.current === 'over') startGame();
            else if (phaseRef.current === 'playing') setPhaseBoth('paused');
            else setPhaseBoth('playing');
        };

        const onKey = (e) => {
            const key = e.key.toLowerCase();
            if (key === 'arrowleft' || key === 'a') {
                e.preventDefault();
                if (phaseRef.current !== 'playing') primaryAction();
                move(-1);
            } else if (key === 'arrowright' || key === 'd') {
                e.preventDefault();
                if (phaseRef.current !== 'playing') primaryAction();
                move(1);
            } else if (key === ' ' || key === 'enter' || key === 'p') {
                e.preventDefault();
                primaryAction();
            }
        };

        const canvas = canvasRef.current;
        let touchStart = null;
        const onTouchStart = (e) => {
            touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        };
        const onTouchEnd = (e) => {
            if (!touchStart) return;
            const dx = e.changedTouches[0].clientX - touchStart.x;
            touchStart = null;
            if (Math.abs(dx) < SWIPE_THRESHOLD) {
                primaryAction();
                return;
            }
            if (phaseRef.current !== 'playing') startGame();
            move(dx > 0 ? 1 : -1);
        };

        window.addEventListener('keydown', onKey);
        canvas.addEventListener('touchstart', onTouchStart, { passive: true });
        canvas.addEventListener('touchend', onTouchEnd);
        return () => {
            window.removeEventListener('keydown', onKey);
            canvas.removeEventListener('touchstart', onTouchStart);
            canvas.removeEventListener('touchend', onTouchEnd);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let raf;
        let last = performance.now();

        const update = (dt) => {
            const s = stateRef.current;
            const sec = dt / 1000;

            s.speed = Math.min(MAX_SPEED, s.speed + SPEED_RAMP * sec);
            s.distance += s.speed * sec;
            s.roadOffset = (s.roadOffset + s.speed * sec) % 48;

            // Smooth lane change
            const targetX = laneX(s.lane);
            s.x += (targetX - s.x) * Math.min(1, sec * 14);

            // Spawn a row: one wall, sometimes a coin in another lane
            s.spawnTimer += dt;
            s.spawnEvery = Math.max(MIN_SPAWN_MS, SPAWN_EVERY_MS - s.distance / 40);
            if (s.spawnTimer >= s.spawnEvery) {
                s.spawnTimer = 0;
                const wallLane = Math.floor(Math.random() * LANES);
                s.entities.push({ lane: wallLane, y: -40, type: 'wall' });
                if (Math.random() < COIN_CHANCE) {
                    const free = [0, 1, 2].filter((l) => l !== wallLane);
                    const coinLane = free[Math.floor(Math.random() * free.length)];
                    s.entities.push({ lane: coinLane, y: -140, type: 'coin' });
                }
            }

            // Move entities, collide, cull
            const px = s.x;
            const half = PLAYER_SIZE / 2;
            for (const ent of s.entities) {
                ent.y += s.speed * sec;
                const ex = laneX(ent.lane);
                const size = ent.type === 'wall' ? 46 : 22;
                const overlapX = Math.abs(ex - px) < half + size / 2 - 6;
                const overlapY = Math.abs(ent.y - PLAYER_Y) < half + size / 2 - 6;
                if (overlapX && overlapY) {
                    if (ent.type === 'coin') {
                        ent.dead = true;
                        s.coins += 1;
                    } else {
                        s.score = Math.floor(s.distance / 10) + s.coins * 25;
                        setScore(s.score);
                        submitScore(s.score);
                        setPhaseBoth('over');
                        return;
                    }
                }
            }
            s.entities = s.entities.filter((e) => !e.dead && e.y < H + 60);

            s.score = Math.floor(s.distance / 10) + s.coins * 25;
            setScore(s.score);
        };

        const draw = () => {
            const s = stateRef.current;
            ctx.fillStyle = '#030208';
            ctx.fillRect(0, 0, W, H);

            // Lane dividers — dashed, scrolling to sell the speed
            ctx.strokeStyle = 'rgba(46, 230, 255, 0.25)';
            ctx.lineWidth = 3;
            ctx.setLineDash([22, 26]);
            for (let l = 1; l < LANES; l++) {
                ctx.beginPath();
                ctx.lineDashOffset = -s.roadOffset;
                ctx.moveTo(l * LANE_W, -48);
                ctx.lineTo(l * LANE_W, H + 48);
                ctx.stroke();
            }
            ctx.setLineDash([]);

            // Entities
            for (const ent of s.entities) {
                const ex = laneX(ent.lane);
                if (ent.type === 'wall') {
                    ctx.fillStyle = '#ff5c5c';
                    ctx.shadowColor = '#ff5c5c';
                    ctx.shadowBlur = 14;
                    ctx.fillRect(ex - 23, ent.y - 23, 46, 46);
                    ctx.shadowBlur = 0;
                    ctx.fillStyle = '#030208';
                    ctx.font = '10px monospace';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('FW', ex, ent.y);
                } else {
                    const spin = 0.6 + Math.abs(Math.sin(performance.now() / 200 + ent.y)) * 0.4;
                    ctx.fillStyle = '#ffc94f';
                    ctx.shadowColor = '#ffc94f';
                    ctx.shadowBlur = 12;
                    ctx.beginPath();
                    ctx.ellipse(ex, ent.y, 11 * spin, 11, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
            }

            // Player — cyan runner block with a little trail
            ctx.fillStyle = 'rgba(46, 230, 255, 0.25)';
            ctx.fillRect(s.x - PLAYER_SIZE / 2 + 6, PLAYER_Y + PLAYER_SIZE / 2, PLAYER_SIZE - 12, 16);
            ctx.fillStyle = '#2ee6ff';
            ctx.shadowColor = '#2ee6ff';
            ctx.shadowBlur = 16;
            ctx.fillRect(s.x - PLAYER_SIZE / 2, PLAYER_Y - PLAYER_SIZE / 2, PLAYER_SIZE, PLAYER_SIZE);
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#030208';
            ctx.font = '14px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('▶▶', s.x, PLAYER_Y);
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [submitScore]);

    return (
        <div>
            <div className="arc-hud mb-3">
                <span>SCORE {String(score).padStart(6, '0')}</span>
                <span className="arc-hiscore">HI {String(Math.max(highScore, score)).padStart(6, '0')}</span>
            </div>

            <div className="arc-canvas-wrap mx-auto" style={{ maxWidth: W }}>
                <canvas ref={canvasRef} width={W} height={H} />

                {phase !== 'playing' && (
                    <div className="arc-overlay">
                        {phase === 'ready' && (
                            <>
                                <p className="arc-overlay-title">BYTE RUNNER</p>
                                <p className="arc-overlay-text">
                                    DODGE THE RED FIREWALLS.
                                    <br />
                                    GRAB THE GOLD DATA BITS (+25).
                                    <br />
                                    THE NET ONLY GETS FASTER.
                                </p>
                                <button type="button" className="arc-btn" onClick={startGame}>
                                    ▶ RUN
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
                                    CONNECTION LOST
                                </p>
                                <p className="arc-overlay-text">
                                    FINAL SCORE {String(score).padStart(6, '0')}
                                    {score >= highScore && score > 0 ? ' — NEW RECORD!' : ''}
                                </p>
                                <button type="button" className="arc-btn" onClick={startGame}>
                                    ↻ RUN AGAIN
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            <div className="arc-touch-controls mt-4">
                <button
                    type="button"
                    className="arc-touch-btn"
                    aria-label="Move left"
                    onClick={() => {
                        const s = stateRef.current;
                        if (s && phaseRef.current === 'playing') s.lane = Math.max(0, s.lane - 1);
                    }}
                >
                    ◀
                </button>
                <button
                    type="button"
                    className="arc-touch-btn"
                    aria-label="Move right"
                    onClick={() => {
                        const s = stateRef.current;
                        if (s && phaseRef.current === 'playing') s.lane = Math.min(LANES - 1, s.lane + 1);
                    }}
                >
                    ▶
                </button>
            </div>
        </div>
    );
}
