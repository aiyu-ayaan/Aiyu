"use client";

import { useEffect, useRef, useState } from 'react';

const W = 640;
const H = 420;
const PADDLE_W = 12;
const PADDLE_H = 78;
const BALL_R = 7;
const PLAYER_X = 26;
const CPU_X = W - 26 - PADDLE_W;
const START_BALL_SPEED = 330;
const MAX_BALL_SPEED = 640;
const CPU_MAX_SPEED = 265; // beatable on purpose
const WIN_SCORE = 7;

export default function Pong() {
    const canvasRef = useRef(null);
    const [phase, setPhase] = useState('ready');
    const [scores, setScores] = useState({ you: 0, cpu: 0 });

    const stateRef = useRef(null);
    const phaseRef = useRef('ready');
    const setPhaseBoth = (next) => {
        phaseRef.current = next;
        setPhase(next);
    };

    const serve = (s, toward = Math.random() > 0.5 ? 1 : -1) => {
        const angle = (Math.random() * 0.7 - 0.35);
        s.ball = {
            x: W / 2,
            y: H / 2,
            vx: Math.cos(angle) * s.ballSpeed * toward,
            vy: Math.sin(angle) * s.ballSpeed,
        };
    };

    const resetGame = () => {
        stateRef.current = {
            playerY: H / 2,
            cpuY: H / 2,
            keys: { up: false, down: false },
            ballSpeed: START_BALL_SPEED,
            you: 0,
            cpu: 0,
        };
        serve(stateRef.current);
        setScores({ you: 0, cpu: 0 });
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
            if (key === 'arrowup' || key === 'w') { e.preventDefault(); s.keys.up = e.type === 'keydown'; }
            else if (key === 'arrowdown' || key === 's') { e.preventDefault(); s.keys.down = e.type === 'keydown'; }
            else if ((key === ' ' || key === 'enter' || key === 'p') && e.type === 'keydown') {
                e.preventDefault();
                primaryAction();
            }
        };

        const canvas = canvasRef.current;
        const pointToPaddle = (clientY) => {
            const rect = canvas.getBoundingClientRect();
            const scale = H / rect.height;
            const y = (clientY - rect.top) * scale;
            const s = stateRef.current;
            s.playerY = Math.max(PADDLE_H / 2, Math.min(H - PADDLE_H / 2, y));
        };
        const onMouseMove = (e) => pointToPaddle(e.clientY);
        const onTouchMove = (e) => {
            e.preventDefault();
            pointToPaddle(e.touches[0].clientY);
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

        const bouncePaddle = (b, paddleY, dir) => {
            const hit = (b.y - paddleY) / (PADDLE_H / 2); // -1..1
            const angle = hit * (Math.PI / 3.2);
            const speed = Math.min(MAX_BALL_SPEED, Math.hypot(b.vx, b.vy) * 1.04);
            b.vx = Math.cos(angle) * speed * dir;
            b.vy = Math.sin(angle) * speed;
        };

        const update = (dt) => {
            const s = stateRef.current;
            const sec = dt / 1000;
            const b = s.ball;

            if (s.keys.up) s.playerY -= 380 * sec;
            if (s.keys.down) s.playerY += 380 * sec;
            s.playerY = Math.max(PADDLE_H / 2, Math.min(H - PADDLE_H / 2, s.playerY));

            // CPU tracks the ball with capped speed (only when it's incoming)
            const target = b.vx > 0 ? b.y : H / 2;
            const diff = target - s.cpuY;
            s.cpuY += Math.max(-CPU_MAX_SPEED * sec, Math.min(CPU_MAX_SPEED * sec, diff));
            s.cpuY = Math.max(PADDLE_H / 2, Math.min(H - PADDLE_H / 2, s.cpuY));

            b.x += b.vx * sec;
            b.y += b.vy * sec;

            if (b.y < BALL_R) { b.y = BALL_R; b.vy = Math.abs(b.vy); }
            if (b.y > H - BALL_R) { b.y = H - BALL_R; b.vy = -Math.abs(b.vy); }

            // Player paddle
            if (
                b.vx < 0 &&
                b.x - BALL_R <= PLAYER_X + PADDLE_W && b.x - BALL_R > PLAYER_X - 10 &&
                Math.abs(b.y - s.playerY) <= PADDLE_H / 2 + BALL_R
            ) {
                b.x = PLAYER_X + PADDLE_W + BALL_R;
                bouncePaddle(b, s.playerY, 1);
            }

            // CPU paddle
            if (
                b.vx > 0 &&
                b.x + BALL_R >= CPU_X && b.x + BALL_R < CPU_X + PADDLE_W + 10 &&
                Math.abs(b.y - s.cpuY) <= PADDLE_H / 2 + BALL_R
            ) {
                b.x = CPU_X - BALL_R;
                bouncePaddle(b, s.cpuY, -1);
            }

            // Points
            if (b.x < -BALL_R * 2) {
                s.cpu += 1;
                setScores({ you: s.you, cpu: s.cpu });
                if (s.cpu >= WIN_SCORE) { setPhaseBoth('over'); return; }
                s.ballSpeed = Math.min(MAX_BALL_SPEED, s.ballSpeed + 12);
                serve(s, -1);
            } else if (b.x > W + BALL_R * 2) {
                s.you += 1;
                setScores({ you: s.you, cpu: s.cpu });
                if (s.you >= WIN_SCORE) { setPhaseBoth('over'); return; }
                s.ballSpeed = Math.min(MAX_BALL_SPEED, s.ballSpeed + 12);
                serve(s, 1);
            }
        };

        const draw = () => {
            const s = stateRef.current;
            ctx.fillStyle = '#030208';
            ctx.fillRect(0, 0, W, H);

            // Center net
            ctx.strokeStyle = 'rgba(125, 122, 153, 0.4)';
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 14]);
            ctx.beginPath();
            ctx.moveTo(W / 2, 0);
            ctx.lineTo(W / 2, H);
            ctx.stroke();
            ctx.setLineDash([]);

            // Paddles
            ctx.fillStyle = '#2ee6ff';
            ctx.shadowColor = '#2ee6ff';
            ctx.shadowBlur = 12;
            ctx.fillRect(PLAYER_X, s.playerY - PADDLE_H / 2, PADDLE_W, PADDLE_H);
            ctx.fillStyle = '#ff4fd8';
            ctx.shadowColor = '#ff4fd8';
            ctx.fillRect(CPU_X, s.cpuY - PADDLE_H / 2, PADDLE_W, PADDLE_H);
            ctx.shadowBlur = 0;

            // Ball
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 10;
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
         
    }, []);

    const youWon = scores.you >= WIN_SCORE;

    return (
        <div>
            <div className="arc-hud mb-3">
                <span style={{ color: 'var(--arc-cyan)' }}>YOU {scores.you}</span>
                <span style={{ color: 'var(--arc-dim)' }}>FIRST TO {WIN_SCORE}</span>
                <span style={{ color: 'var(--arc-magenta)' }}>CPU {scores.cpu}</span>
            </div>

            <div className="arc-canvas-wrap arc-cab" style={{ '--arc-aspect': W / H }}>
                <canvas ref={canvasRef} width={W} height={H} />

                {phase !== 'playing' && (
                    <div className="arc-overlay">
                        {phase === 'ready' && (
                            <>
                                <p className="arc-overlay-title">PONG</p>
                                <p className="arc-overlay-text">
                                    THE GAME THAT STARTED EVERYTHING. 1972.
                                    <br />
                                    FIRST TO {WIN_SCORE} TAKES THE MATCH.
                                    <br />
                                    HIT WITH THE PADDLE EDGE FOR SHARP ANGLES.
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
                                <p className="arc-overlay-title" style={{ color: youWon ? 'var(--arc-green)' : 'var(--arc-red)' }}>
                                    {youWon ? 'YOU WIN' : 'CPU WINS'}
                                </p>
                                <p className="arc-overlay-text">
                                    {scores.you} — {scores.cpu}
                                </p>
                                <button type="button" className="arc-btn" onClick={startGame}>
                                    ↻ REMATCH
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
