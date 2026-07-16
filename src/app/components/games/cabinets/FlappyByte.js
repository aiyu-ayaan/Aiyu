"use client";

import { useEffect, useRef, useState } from 'react';
import { useHighScore } from '../useHighScore';
import { useGameAudio } from '../audio/useGameAudio';

const W = 380;
const H = 560;
const BIRD_X = 100;
const BIRD_R = 13;
const GRAVITY = 1500; // px/s²
const FLAP_VY = -420;
const PIPE_W = 62;
const PIPE_GAP = 158;
const PIPE_EVERY = 1.6; // seconds
const PIPE_SPEED = 165; // px/s
const MAX_FALL = 620;

export default function FlappyByte() {
    const canvasRef = useRef(null);
    const [phase, setPhase] = useState('ready');
    const [score, setScore] = useState(0);
    const [highScore, submitScore] = useHighScore('flappy-byte');
    const audio = useGameAudio('flappy-byte', phase);

    const stateRef = useRef(null);
    const phaseRef = useRef('ready');
    const setPhaseBoth = (next) => {
        phaseRef.current = next;
        setPhase(next);
    };

    const resetGame = () => {
        stateRef.current = {
            y: H / 2,
            vy: 0,
            pipes: [], // { x, gapY, passed }
            spawn: 0.9, // first pipe arrives quickly but fair
            score: 0,
        };
        setScore(0);
    };

    const startGame = () => {
        resetGame();
        setPhaseBoth('playing');
    };

    useEffect(() => {
        resetGame();

        const flap = () => {
            if (phaseRef.current === 'ready' || phaseRef.current === 'over') {
                startGame();
                stateRef.current.vy = FLAP_VY;
                audio.sfx('jump');
                return;
            }
            if (phaseRef.current === 'paused') {
                setPhaseBoth('playing');
                return;
            }
            stateRef.current.vy = FLAP_VY;
            audio.sfx('jump');
        };

        const onKey = (e) => {
            const key = e.key.toLowerCase();
            if (key === ' ' || key === 'arrowup' || key === 'w' || key === 'enter') {
                e.preventDefault();
                flap();
            } else if (key === 'p') {
                e.preventDefault();
                if (phaseRef.current === 'playing') setPhaseBoth('paused');
                else if (phaseRef.current === 'paused') setPhaseBoth('playing');
            }
        };

        const canvas = canvasRef.current;
        const onPointer = (e) => {
            e.preventDefault();
            flap();
        };

        window.addEventListener('keydown', onKey);
        canvas.addEventListener('pointerdown', onPointer);
        return () => {
            window.removeEventListener('keydown', onKey);
            canvas.removeEventListener('pointerdown', onPointer);
        };
         
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let raf;
        let last = performance.now();

        const die = (s) => {
            submitScore(s.score);
            setPhaseBoth('over');
            audio.sfx('hit');
        };

        const update = (dt) => {
            const s = stateRef.current;
            const sec = dt / 1000;

            s.vy = Math.min(MAX_FALL, s.vy + GRAVITY * sec);
            s.y += s.vy * sec;

            s.spawn -= sec;
            if (s.spawn <= 0) {
                s.spawn = PIPE_EVERY;
                const margin = 70;
                const gapY = margin + PIPE_GAP / 2 + Math.random() * (H - 2 * margin - PIPE_GAP);
                s.pipes.push({ x: W + PIPE_W, gapY, passed: false });
            }

            for (const p of s.pipes) {
                p.x -= PIPE_SPEED * sec;
                if (!p.passed && p.x + PIPE_W < BIRD_X - BIRD_R) {
                    p.passed = true;
                    s.score += 1;
                    setScore(s.score);
                    audio.sfx('point');
                }
                // Collision
                const inX = BIRD_X + BIRD_R > p.x && BIRD_X - BIRD_R < p.x + PIPE_W;
                const inGap = s.y - BIRD_R > p.gapY - PIPE_GAP / 2 && s.y + BIRD_R < p.gapY + PIPE_GAP / 2;
                if (inX && !inGap) { die(s); return; }
            }
            s.pipes = s.pipes.filter((p) => p.x > -PIPE_W);

            if (s.y + BIRD_R > H || s.y - BIRD_R < 0) { die(s); }
        };

        const draw = () => {
            const s = stateRef.current;
            ctx.fillStyle = '#030208';
            ctx.fillRect(0, 0, W, H);

            // Parallax dots
            ctx.fillStyle = 'rgba(46, 230, 255, 0.14)';
            const t = performance.now() / 40;
            for (let i = 0; i < 26; i++) {
                const x = ((i * 61 - t) % W + W) % W;
                ctx.fillRect(x, (i * 97) % H, 2, 2);
            }

            // Pipes — green circuit pillars
            for (const p of s.pipes) {
                const topH = p.gapY - PIPE_GAP / 2;
                const botY = p.gapY + PIPE_GAP / 2;
                ctx.fillStyle = '#33ff66';
                ctx.shadowColor = '#33ff66';
                ctx.shadowBlur = 10;
                ctx.fillRect(p.x, 0, PIPE_W, topH);
                ctx.fillRect(p.x, botY, PIPE_W, H - botY);
                ctx.shadowBlur = 0;
                // Lip
                ctx.fillStyle = '#8dffab';
                ctx.fillRect(p.x - 4, topH - 12, PIPE_W + 8, 12);
                ctx.fillRect(p.x - 4, botY, PIPE_W + 8, 12);
            }

            // Bird — amber byte with a tilt
            ctx.save();
            ctx.translate(BIRD_X, s.y);
            ctx.rotate(Math.max(-0.5, Math.min(0.9, s.vy / 600)));
            ctx.fillStyle = '#ffc94f';
            ctx.shadowColor = '#ffc94f';
            ctx.shadowBlur = 14;
            ctx.fillRect(-BIRD_R, -BIRD_R, BIRD_R * 2, BIRD_R * 2);
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#030208';
            ctx.font = 'bold 13px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('01', 0, 1);
            ctx.restore();
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
                <span className="arc-hiscore">HI {String(Math.max(highScore, score)).padStart(6, '0')}</span>
            </div>

            <div className="arc-canvas-wrap arc-cab" style={{ '--arc-aspect': W / H }}>
                <canvas ref={canvasRef} width={W} height={H} />

                {phase !== 'playing' && (
                    <div className="arc-overlay">
                        {phase === 'ready' && (
                            <>
                                <p className="arc-overlay-title">FLAPPY BYTE</p>
                                <p className="arc-overlay-text">
                                    TAP / SPACE TO FLAP.
                                    <br />
                                    THREAD THE CIRCUIT PILLARS.
                                    <br />
                                    RAGE IS PART OF THE EXPERIENCE.
                                </p>
                                <button type="button" className="arc-btn" onClick={startGame}>
                                    ▶ FLAP
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
                                    CRASHED
                                </p>
                                <p className="arc-overlay-text">
                                    {score} PIPES CLEARED
                                    {score >= highScore && score > 0 ? ' — NEW RECORD!' : ''}
                                </p>
                                <button type="button" className="arc-btn" onClick={startGame}>
                                    ↻ ONE MORE
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
