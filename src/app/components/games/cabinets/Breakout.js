"use client";

import { useEffect, useRef, useState } from 'react';
import { useHighScore } from '../useHighScore';
import { useGameAudio } from '../audio/useGameAudio';

const W = 480;
const H = 560;
const PADDLE_W = 84;
const PADDLE_H = 14;
const PADDLE_Y = H - 40;
const BALL_R = 7;
const ROWS = 6;
const COLS = 8;
const BRICK_W = W / COLS;
const BRICK_H = 24;
const BRICK_TOP = 70;
const START_BALL_SPEED = 320;
const MAX_BALL_SPEED = 560;
const ROW_COLORS = ['#ff5c5c', '#ff8a4f', '#ffc94f', '#33ff66', '#2ee6ff', '#ff4fd8'];
const ROW_POINTS = [60, 50, 40, 30, 20, 10];

function buildBricks() {
    const bricks = [];
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            bricks.push({ r, c, alive: true });
        }
    }
    return bricks;
}

export default function Breakout() {
    const canvasRef = useRef(null);
    const [phase, setPhase] = useState('ready');
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [level, setLevel] = useState(1);
    const [highScore, submitScore] = useHighScore('breakout');
    const audio = useGameAudio('breakout', phase);

    const stateRef = useRef(null);
    const phaseRef = useRef('ready');
    const setPhaseBoth = (next) => {
        phaseRef.current = next;
        setPhase(next);
    };

    const launchBall = (s) => {
        const angle = (-Math.PI / 2) + (Math.random() * 0.8 - 0.4);
        s.ball = {
            x: s.paddleX,
            y: PADDLE_Y - BALL_R - 2,
            vx: Math.cos(angle) * s.ballSpeed,
            vy: Math.sin(angle) * s.ballSpeed,
            stuck: false,
        };
    };

    const resetGame = () => {
        stateRef.current = {
            paddleX: W / 2,
            bricks: buildBricks(),
            ballSpeed: START_BALL_SPEED,
            score: 0,
            lives: 3,
            level: 1,
            keys: { left: false, right: false },
            ball: null,
        };
        launchBall(stateRef.current);
        setScore(0);
        setLives(3);
        setLevel(1);
    };

    const startGame = () => {
        resetGame();
        setPhaseBoth('playing');
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
            else if ((key === ' ' || key === 'enter' || key === 'p') && e.type === 'keydown') {
                e.preventDefault();
                primaryAction();
            }
        };

        const canvas = canvasRef.current;
        const pointToPaddle = (clientX) => {
            const rect = canvas.getBoundingClientRect();
            const scale = W / rect.width;
            const x = (clientX - rect.left) * scale;
            const s = stateRef.current;
            s.paddleX = Math.max(PADDLE_W / 2, Math.min(W - PADDLE_W / 2, x));
        };
        const onMouseMove = (e) => pointToPaddle(e.clientX);
        const onTouchMove = (e) => {
            e.preventDefault();
            pointToPaddle(e.touches[0].clientX);
        };
        const onPointerTap = () => {
            if (phaseRef.current !== 'playing') primaryAction();
        };

        window.addEventListener('keydown', onKey);
        window.addEventListener('keyup', onKey);
        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('touchmove', onTouchMove, { passive: false });
        canvas.addEventListener('click', onPointerTap);
        return () => {
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('keyup', onKey);
            canvas.removeEventListener('mousemove', onMouseMove);
            canvas.removeEventListener('touchmove', onTouchMove);
            canvas.removeEventListener('click', onPointerTap);
        };
         
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let raf;
        let last = performance.now();

        const update = (dt) => {
            const s = stateRef.current;
            const sec = dt / 1000;

            if (s.keys.left) s.paddleX -= 420 * sec;
            if (s.keys.right) s.paddleX += 420 * sec;
            s.paddleX = Math.max(PADDLE_W / 2, Math.min(W - PADDLE_W / 2, s.paddleX));

            const b = s.ball;
            b.x += b.vx * sec;
            b.y += b.vy * sec;

            // Walls
            if (b.x < BALL_R) { b.x = BALL_R; b.vx = Math.abs(b.vx); audio.sfx('wall'); }
            if (b.x > W - BALL_R) { b.x = W - BALL_R; b.vx = -Math.abs(b.vx); audio.sfx('wall'); }
            if (b.y < BALL_R) { b.y = BALL_R; b.vy = Math.abs(b.vy); audio.sfx('wall'); }

            // Paddle — reflect angle by where the ball lands on it
            if (
                b.vy > 0 &&
                b.y + BALL_R >= PADDLE_Y &&
                b.y + BALL_R <= PADDLE_Y + PADDLE_H + 8 &&
                Math.abs(b.x - s.paddleX) <= PADDLE_W / 2 + BALL_R
            ) {
                const hit = (b.x - s.paddleX) / (PADDLE_W / 2); // -1..1
                const angle = (-Math.PI / 2) + hit * (Math.PI / 3); // ±60°
                const speed = Math.min(MAX_BALL_SPEED, Math.hypot(b.vx, b.vy) * 1.02);
                b.vx = Math.cos(angle) * speed;
                b.vy = Math.sin(angle) * speed;
                b.y = PADDLE_Y - BALL_R;
                audio.sfx('bounce');
            }

            // Bricks
            for (const brick of s.bricks) {
                if (!brick.alive) continue;
                const bx = brick.c * BRICK_W;
                const by = BRICK_TOP + brick.r * BRICK_H;
                if (
                    b.x + BALL_R > bx && b.x - BALL_R < bx + BRICK_W &&
                    b.y + BALL_R > by && b.y - BALL_R < by + BRICK_H
                ) {
                    brick.alive = false;
                    s.score += ROW_POINTS[brick.r] * s.level;
                    setScore(s.score);

                    // Reflect off the nearest face
                    const overlapX = Math.min(b.x + BALL_R - bx, bx + BRICK_W - (b.x - BALL_R));
                    const overlapY = Math.min(b.y + BALL_R - by, by + BRICK_H - (b.y - BALL_R));
                    if (overlapX < overlapY) b.vx = -b.vx;
                    else b.vy = -b.vy;
                    audio.sfx('blip');
                    break;
                }
            }

            // Cleared the wall → next level, faster ball
            if (s.bricks.every((brick) => !brick.alive)) {
                s.level += 1;
                setLevel(s.level);
                s.bricks = buildBricks();
                s.ballSpeed = Math.min(MAX_BALL_SPEED, s.ballSpeed + 40);
                launchBall(s);
                audio.sfx('levelUp');
                return;
            }

            // Dropped the ball
            if (b.y > H + BALL_R) {
                s.lives -= 1;
                setLives(s.lives);
                if (s.lives <= 0) {
                    submitScore(s.score);
                    setPhaseBoth('over');
                    audio.sfx('gameOver');
                } else {
                    launchBall(s);
                    audio.sfx('lose');
                }
            }
        };

        const draw = () => {
            const s = stateRef.current;
            ctx.fillStyle = '#030208';
            ctx.fillRect(0, 0, W, H);

            for (const brick of s.bricks) {
                if (!brick.alive) continue;
                const bx = brick.c * BRICK_W;
                const by = BRICK_TOP + brick.r * BRICK_H;
                ctx.fillStyle = ROW_COLORS[brick.r];
                ctx.shadowColor = ROW_COLORS[brick.r];
                ctx.shadowBlur = 6;
                ctx.fillRect(bx + 2, by + 2, BRICK_W - 4, BRICK_H - 4);
                ctx.shadowBlur = 0;
            }

            // Paddle
            ctx.fillStyle = '#ff4fd8';
            ctx.shadowColor = '#ff4fd8';
            ctx.shadowBlur = 14;
            ctx.fillRect(s.paddleX - PADDLE_W / 2, PADDLE_Y, PADDLE_W, PADDLE_H);
            ctx.shadowBlur = 0;

            // Ball
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#2ee6ff';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(s.ball.x, s.ball.y, BALL_R, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
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

    return (
        <div>
            <div className="arc-hud mb-3">
                <span>SCORE {String(score).padStart(6, '0')}</span>
                <span style={{ color: 'var(--arc-magenta)' }}>LVL {level}</span>
                <span style={{ color: 'var(--arc-red)' }}>{'♥'.repeat(Math.max(0, lives))}{'♡'.repeat(Math.max(0, 3 - lives))}</span>
                <span className="arc-hiscore">HI {String(Math.max(highScore, score)).padStart(6, '0')}</span>
            </div>

            <div className="arc-canvas-wrap arc-cab" style={{ '--arc-aspect': W / H }}>
                <canvas ref={canvasRef} width={W} height={H} />

                {phase !== 'playing' && (
                    <div className="arc-overlay">
                        {phase === 'ready' && (
                            <>
                                <p className="arc-overlay-title">BREAKOUT</p>
                                <p className="arc-overlay-text">
                                    SMASH ALL 48 BRICKS. TOP ROWS PAY MORE.
                                    <br />
                                    THE PADDLE EDGE PUTS SPIN ON THE BALL.
                                    <br />
                                    3 LIVES. MAKE THEM COUNT.
                                </p>
                                <button type="button" className="arc-btn" onClick={startGame}>
                                    ▶ SERVE
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
                                    GAME OVER
                                </p>
                                <p className="arc-overlay-text">
                                    FINAL SCORE {String(score).padStart(6, '0')}
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
        </div>
    );
}
