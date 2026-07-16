"use client";

import { useEffect, useRef, useState } from 'react';
import { useHighScore } from '../useHighScore';
import { useGameAudio } from '../audio/useGameAudio';

const COLS = 22;
const ROWS = 22;
const CELL = 22;
const START_STEP_MS = 150;
const MIN_STEP_MS = 70;
const STEP_DECAY_MS = 2.5; // faster per food eaten
const SWIPE_THRESHOLD = 24;

const DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
};

function opposite(a, b) {
    return a.x === -b.x && a.y === -b.y;
}

function randomFood(snake) {
    while (true) {
        const food = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
        if (!snake.some((seg) => seg.x === food.x && seg.y === food.y)) return food;
    }
}

export default function SnakeGame() {
    const canvasRef = useRef(null);
    const [phase, setPhase] = useState('ready'); // ready | playing | paused | over
    const [score, setScore] = useState(0);
    const [highScore, submitScore] = useHighScore('snake');
    const audio = useGameAudio('snake', phase);

    const stateRef = useRef(null);
    const phaseRef = useRef('ready');
    const setPhaseBoth = (next) => {
        phaseRef.current = next;
        setPhase(next);
    };

    const resetGame = () => {
        const snake = [
            { x: 8, y: 11 },
            { x: 7, y: 11 },
            { x: 6, y: 11 },
        ];
        stateRef.current = {
            snake,
            dir: DIRS.right,
            queue: [],
            food: randomFood(snake),
            stepMs: START_STEP_MS,
            acc: 0,
            score: 0,
        };
        setScore(0);
    };

    const startGame = () => {
        resetGame();
        setPhaseBoth('playing');
    };

    // Input: keyboard + swipe. Registered once; reads phase via ref.
    useEffect(() => {
        resetGame();

        const queueDir = (dir) => {
            const s = stateRef.current;
            if (!s) return;
            const last = s.queue.length ? s.queue[s.queue.length - 1] : s.dir;
            if (!opposite(dir, last) && !(dir.x === last.x && dir.y === last.y)) {
                s.queue.push(dir);
            }
        };

        const primaryAction = () => {
            if (phaseRef.current === 'ready' || phaseRef.current === 'over') {
                startGame();
            } else if (phaseRef.current === 'playing') {
                setPhaseBoth('paused');
            } else if (phaseRef.current === 'paused') {
                setPhaseBoth('playing');
            }
        };

        const onKey = (e) => {
            const key = e.key.toLowerCase();
            const dirKeys = {
                arrowup: DIRS.up, w: DIRS.up,
                arrowdown: DIRS.down, s: DIRS.down,
                arrowleft: DIRS.left, a: DIRS.left,
                arrowright: DIRS.right, d: DIRS.right,
            };
            if (dirKeys[key]) {
                e.preventDefault();
                if (phaseRef.current === 'ready' || phaseRef.current === 'over') startGame();
                queueDir(dirKeys[key]);
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
            const dy = e.changedTouches[0].clientY - touchStart.y;
            touchStart = null;
            if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) {
                primaryAction();
                return;
            }
            if (phaseRef.current === 'ready' || phaseRef.current === 'over') startGame();
            if (Math.abs(dx) > Math.abs(dy)) {
                queueDir(dx > 0 ? DIRS.right : DIRS.left);
            } else {
                queueDir(dy > 0 ? DIRS.down : DIRS.up);
            }
        };

        window.addEventListener('keydown', onKey);
        canvas.addEventListener('touchstart', onTouchStart, { passive: true });
        canvas.addEventListener('touchend', onTouchEnd);

        return () => {
            window.removeEventListener('keydown', onKey);
            canvas.removeEventListener('touchstart', onTouchStart);
            canvas.removeEventListener('touchend', onTouchEnd);
        };
         
    }, []);

    // Game loop + rendering.
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let raf;
        let last = performance.now();

        const step = () => {
            const s = stateRef.current;
            if (s.queue.length) s.dir = s.queue.shift();

            const head = {
                x: s.snake[0].x + s.dir.x,
                y: s.snake[0].y + s.dir.y,
            };

            const hitWall = head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS;
            const hitSelf = s.snake.some((seg) => seg.x === head.x && seg.y === head.y);
            if (hitWall || hitSelf) {
                submitScore(s.score);
                setPhaseBoth('over');
                audio.sfx('gameOver');
                return;
            }

            s.snake.unshift(head);
            if (head.x === s.food.x && head.y === s.food.y) {
                s.score += 10;
                setScore(s.score);
                s.food = randomFood(s.snake);
                s.stepMs = Math.max(MIN_STEP_MS, s.stepMs - STEP_DECAY_MS);
                audio.sfx('point');
            } else {
                s.snake.pop();
            }
        };

        const draw = () => {
            const s = stateRef.current;
            ctx.fillStyle = '#030208';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // faint grid
            ctx.strokeStyle = 'rgba(51, 255, 102, 0.06)';
            ctx.lineWidth = 1;
            for (let i = 1; i < COLS; i++) {
                ctx.beginPath();
                ctx.moveTo(i * CELL + 0.5, 0);
                ctx.lineTo(i * CELL + 0.5, ROWS * CELL);
                ctx.stroke();
            }
            for (let j = 1; j < ROWS; j++) {
                ctx.beginPath();
                ctx.moveTo(0, j * CELL + 0.5);
                ctx.lineTo(COLS * CELL, j * CELL + 0.5);
                ctx.stroke();
            }

            // food — pulsing apple
            const pulse = 2 + Math.sin(performance.now() / 180) * 1.5;
            ctx.fillStyle = '#ff4fd8';
            ctx.shadowColor = '#ff4fd8';
            ctx.shadowBlur = 12;
            ctx.fillRect(
                s.food.x * CELL + pulse,
                s.food.y * CELL + pulse,
                CELL - pulse * 2,
                CELL - pulse * 2
            );
            ctx.shadowBlur = 0;

            // snake — head glows brighter
            s.snake.forEach((seg, i) => {
                const isHead = i === 0;
                ctx.fillStyle = isHead ? '#8dffab' : '#33ff66';
                ctx.shadowColor = '#33ff66';
                ctx.shadowBlur = isHead ? 14 : 4;
                ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
            });
            ctx.shadowBlur = 0;
        };

        const frame = (now) => {
            const dt = Math.min(now - last, 100);
            last = now;
            if (phaseRef.current === 'playing') {
                const s = stateRef.current;
                s.acc += dt;
                while (s.acc >= s.stepMs && phaseRef.current === 'playing') {
                    s.acc -= s.stepMs;
                    step();
                }
            }
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

            <div className="arc-canvas-wrap arc-cab" style={{ '--arc-aspect': COLS / ROWS }}>
                <canvas ref={canvasRef} width={COLS * CELL} height={ROWS * CELL} />

                {phase !== 'playing' && (
                    <div className="arc-overlay">
                        {phase === 'ready' && (
                            <>
                                <p className="arc-overlay-title">SNAKE</p>
                                <p className="arc-overlay-text">
                                    EAT THE PINK BITS. DO NOT EAT YOURSELF.
                                    <br />
                                    IT GETS FASTER. IT ALWAYS GETS FASTER.
                                </p>
                                <button type="button" className="arc-btn" onClick={startGame}>
                                    ▶ START
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
