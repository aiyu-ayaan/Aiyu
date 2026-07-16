"use client";

import { useEffect, useRef, useState } from 'react';
import { useHighScore } from '../useHighScore';

const W = 380;
const H = 560;
const ROAD_X = 34;
const ROAD_W = 312;
const LANE_COUNT = 4;
const LANE_W = ROAD_W / LANE_COUNT;
const BIKE_W = 22;
const BIKE_H = 46;
const BIKE_Y = 452; // top edge of the bike
const STEER_SPEED = 310; // px/s sideways while holding
const PX_PER_M = 12; // scroll px per metre travelled
const START_SPEED = 300; // px/s world scroll (~90 km/h)
const LEVEL_METERS = 250; // distance per level-up
const LEVEL_BOOST = 45; // px/s added per level
const MAX_SPEED = 740;
const CAR_W = 40;
const CAR_H = 68;
const NEAR_MISS_PX = 30; // extra clearance that still counts as a graze
const NEAR_MISS_BONUS = 30;
const CAR_COLORS = ['#ff5c5c', '#33ff66', '#ffc94f', '#ff4fd8', '#8d7dff'];

const laneCenter = (lane) => ROAD_X + LANE_W / 2 + lane * LANE_W;

export default function MotoRush() {
    const canvasRef = useRef(null);
    const [phase, setPhase] = useState('ready');
    const [score, setScore] = useState(0);
    const [level, setLevel] = useState(1);
    const [highScore, submitScore] = useHighScore('moto-rush');

    const stateRef = useRef(null);
    const phaseRef = useRef('ready');
    const setPhaseBoth = (next) => {
        phaseRef.current = next;
        setPhase(next);
    };

    const resetGame = () => {
        stateRef.current = {
            x: W / 2,
            steer: 0, // -1 | 0 | 1, from held key / pointer
            keySteer: 0,
            touchSteer: 0,
            speed: START_SPEED,
            dist: 0, // scroll px
            level: 1,
            bonus: 0,
            score: 0,
            spawn: 0.7,
            cars: [], // { lane, x, y, speed, color, passed }
            floats: [], // { x, y, text, life }
            flash: 0, // level-up banner countdown (s)
        };
        setScore(0);
        setLevel(1);
    };

    const startGame = () => {
        resetGame();
        setPhaseBoth('playing');
    };

    // Input — hold to steer.
    useEffect(() => {
        resetGame();

        const primaryAction = () => {
            if (phaseRef.current === 'ready' || phaseRef.current === 'over') startGame();
            else if (phaseRef.current === 'playing') setPhaseBoth('paused');
            else setPhaseBoth('playing');
        };

        const applySteer = () => {
            const s = stateRef.current;
            if (s) s.steer = s.keySteer !== 0 ? s.keySteer : s.touchSteer;
        };

        const held = new Set();
        const syncKeySteer = () => {
            const s = stateRef.current;
            if (!s) return;
            const left = held.has('arrowleft') || held.has('a');
            const right = held.has('arrowright') || held.has('d');
            s.keySteer = left === right ? 0 : (left ? -1 : 1);
            applySteer();
        };

        const onKeyDown = (e) => {
            const key = e.key.toLowerCase();
            if (key === 'arrowleft' || key === 'a' || key === 'arrowright' || key === 'd') {
                e.preventDefault();
                if (phaseRef.current !== 'playing') primaryAction();
                held.add(key);
                syncKeySteer();
            } else if (key === ' ' || key === 'enter' || key === 'p') {
                e.preventDefault();
                primaryAction();
            }
        };
        const onKeyUp = (e) => {
            held.delete(e.key.toLowerCase());
            syncKeySteer();
        };

        // Touch / mouse: hold the left or right half of the road to steer.
        const canvas = canvasRef.current;
        const pointerSteer = (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * W;
            return x < W / 2 ? -1 : 1;
        };
        const onPointerDown = (e) => {
            e.preventDefault();
            if (phaseRef.current !== 'playing') {
                primaryAction();
                return;
            }
            const s = stateRef.current;
            s.touchSteer = pointerSteer(e);
            applySteer();
        };
        const onPointerMove = (e) => {
            const s = stateRef.current;
            if (!s || s.touchSteer === 0) return;
            s.touchSteer = pointerSteer(e);
            applySteer();
        };
        const onPointerUp = () => {
            const s = stateRef.current;
            if (!s) return;
            s.touchSteer = 0;
            applySteer();
        };

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        canvas.addEventListener('pointerdown', onPointerDown);
        canvas.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerUp);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            canvas.removeEventListener('pointerdown', onPointerDown);
            canvas.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            window.removeEventListener('pointercancel', onPointerUp);
        };

    }, []);

    // Game loop + rendering.
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let raf;
        let last = performance.now();

        const die = (s) => {
            s.score = Math.floor(s.dist / PX_PER_M) + s.bonus;
            setScore(s.score);
            submitScore(s.score);
            setPhaseBoth('over');
        };

        const update = (dt) => {
            const s = stateRef.current;
            const sec = dt / 1000;

            // Speed IS the level: each level-up cranks the throttle.
            s.speed = Math.min(MAX_SPEED, START_SPEED + (s.level - 1) * LEVEL_BOOST);
            s.dist += s.speed * sec;
            const meters = s.dist / PX_PER_M;
            const newLevel = 1 + Math.floor(meters / LEVEL_METERS);
            if (newLevel !== s.level) {
                s.level = newLevel;
                s.flash = 1.4;
                setLevel(newLevel);
            }
            if (s.flash > 0) s.flash -= sec;

            // Steering
            s.x += s.steer * STEER_SPEED * sec;
            const minX = ROAD_X + BIKE_W / 2 + 6;
            const maxX = ROAD_X + ROAD_W - BIKE_W / 2 - 6;
            s.x = Math.max(minX, Math.min(maxX, s.x));

            // Traffic spawns — faster with level, but the entry zone never
            // holds more than 2 cars so a line always stays open.
            s.spawn -= sec;
            if (s.spawn <= 0) {
                s.spawn = Math.max(0.38, 1.0 - s.level * 0.055);
                const lane = Math.floor(Math.random() * LANE_COUNT);
                const entryZone = s.cars.filter((c) => c.y < 180);
                const laneBlocked = s.cars.some((c) => c.lane === lane && c.y < 150);
                if (entryZone.length < 2 && !laneBlocked) {
                    s.cars.push({
                        lane,
                        x: laneCenter(lane),
                        y: -CAR_H - Math.random() * 50,
                        speed: s.speed * (0.35 + Math.random() * 0.25),
                        color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
                        passed: false,
                    });
                }
            }

            // Move traffic, score grazes, resolve crashes
            for (const car of s.cars) {
                car.y += (s.speed - car.speed) * sec;

                const overlapX = Math.abs(car.x - s.x) < (CAR_W + BIKE_W) / 2;
                const overlapY = car.y + CAR_H > BIKE_Y && car.y < BIKE_Y + BIKE_H;
                if (overlapX && overlapY) {
                    die(s);
                    return;
                }

                if (!car.passed && car.y > BIKE_Y + BIKE_H) {
                    car.passed = true;
                    if (Math.abs(car.x - s.x) < (CAR_W + BIKE_W) / 2 + NEAR_MISS_PX) {
                        s.bonus += NEAR_MISS_BONUS;
                        s.floats.push({ x: car.x, y: car.y - 10, text: `+${NEAR_MISS_BONUS}`, life: 0.9 });
                    }
                }
            }
            s.cars = s.cars.filter((c) => c.y < H + 100);

            for (const f of s.floats) {
                f.life -= sec;
                f.y -= 45 * sec;
            }
            s.floats = s.floats.filter((f) => f.life > 0);

            s.score = Math.floor(meters) + s.bonus;
            setScore(s.score);
        };

        const draw = () => {
            const s = stateRef.current;
            ctx.fillStyle = '#030208';
            ctx.fillRect(0, 0, W, H);

            // Shoulders — parallax neon ticks racing past
            ctx.fillStyle = 'rgba(46, 230, 255, 0.18)';
            const tickOff = (s.dist * 1.4) % 64;
            for (let y = -64 + tickOff; y < H; y += 64) {
                ctx.fillRect(ROAD_X - 18, y, 6, 26);
                ctx.fillRect(ROAD_X + ROAD_W + 12, y, 6, 26);
            }

            // Road bed
            ctx.fillStyle = '#0a0620';
            ctx.fillRect(ROAD_X, 0, ROAD_W, H);

            // Edge rails
            ctx.shadowColor = '#ff4fd8';
            ctx.shadowBlur = 8;
            ctx.fillStyle = '#ff4fd8';
            ctx.fillRect(ROAD_X - 3, 0, 3, H);
            ctx.fillRect(ROAD_X + ROAD_W, 0, 3, H);
            ctx.shadowBlur = 0;

            // Lane dashes, scrolling with the world
            ctx.fillStyle = 'rgba(46, 230, 255, 0.45)';
            const dashOff = (s.dist % 56);
            for (let i = 1; i < LANE_COUNT; i++) {
                const x = ROAD_X + i * LANE_W - 2;
                for (let y = -56 + dashOff; y < H; y += 56) {
                    ctx.fillRect(x, y, 4, 30);
                }
            }

            // Traffic — rear view: roof, windshield band, taillights
            for (const car of s.cars) {
                const cx = car.x - CAR_W / 2;
                ctx.shadowColor = car.color;
                ctx.shadowBlur = 10;
                ctx.fillStyle = car.color;
                ctx.beginPath();
                ctx.roundRect(cx, car.y, CAR_W, CAR_H, 8);
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.fillStyle = 'rgba(3, 2, 8, 0.55)';
                ctx.fillRect(cx + 5, car.y + 10, CAR_W - 10, 14);
                ctx.fillStyle = '#ff2222';
                ctx.fillRect(cx + 4, car.y + CAR_H - 7, 9, 4);
                ctx.fillRect(cx + CAR_W - 13, car.y + CAR_H - 7, 9, 4);
            }

            // Bike + rider, leaning into the steer
            ctx.save();
            ctx.translate(s.x, BIKE_Y + BIKE_H / 2);
            ctx.rotate(s.steer * 0.14);
            // headlight beam
            const beam = ctx.createLinearGradient(0, -BIKE_H / 2, 0, -BIKE_H / 2 - 90);
            beam.addColorStop(0, 'rgba(255, 201, 79, 0.28)');
            beam.addColorStop(1, 'rgba(255, 201, 79, 0)');
            ctx.fillStyle = beam;
            ctx.beginPath();
            ctx.moveTo(-6, -BIKE_H / 2);
            ctx.lineTo(6, -BIKE_H / 2);
            ctx.lineTo(16, -BIKE_H / 2 - 90);
            ctx.lineTo(-16, -BIKE_H / 2 - 90);
            ctx.closePath();
            ctx.fill();
            // wheels
            ctx.fillStyle = '#123344';
            ctx.fillRect(-5, -BIKE_H / 2, 10, 13);
            ctx.fillRect(-5, BIKE_H / 2 - 13, 10, 13);
            // body
            ctx.shadowColor = '#2ee6ff';
            ctx.shadowBlur = 12;
            ctx.fillStyle = '#2ee6ff';
            ctx.beginPath();
            ctx.roundRect(-BIKE_W / 2, -BIKE_H / 2 + 8, BIKE_W, BIKE_H - 16, 7);
            ctx.fill();
            ctx.shadowBlur = 0;
            // rider helmet
            ctx.fillStyle = '#ffc94f';
            ctx.beginPath();
            ctx.arc(0, -2, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Floating graze bonuses
            ctx.font = 'bold 13px monospace';
            ctx.textAlign = 'center';
            for (const f of s.floats) {
                ctx.fillStyle = `rgba(255, 201, 79, ${Math.min(1, f.life * 1.6)})`;
                ctx.fillText(f.text, f.x, f.y);
            }

            // Speedometer
            const kmh = Math.round((s.speed / PX_PER_M) * 3.6);
            ctx.fillStyle = 'rgba(46, 230, 255, 0.8)';
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`${kmh} KM/H`, ROAD_X + 8, H - 12);

            // Level-up banner
            if (s.flash > 0 && phaseRef.current === 'playing') {
                const a = Math.min(1, s.flash * 2);
                ctx.fillStyle = `rgba(255, 201, 79, ${a})`;
                ctx.shadowColor = '#ffc94f';
                ctx.shadowBlur = 16;
                ctx.font = 'bold 26px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(`LEVEL ${s.level}`, W / 2, H / 2 - 40);
                ctx.font = 'bold 14px monospace';
                ctx.fillText('SPEED UP!', W / 2, H / 2 - 16);
                ctx.shadowBlur = 0;
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

    const holdSteer = (dir) => {
        const s = stateRef.current;
        if (!s) return;
        s.touchSteer = dir;
        s.steer = s.keySteer !== 0 ? s.keySteer : s.touchSteer;
    };

    return (
        <div>
            <div className="arc-hud mb-3">
                <span>SCORE {String(score).padStart(6, '0')}</span>
                <span>LV {level}</span>
                <span className="arc-hiscore">HI {String(Math.max(highScore, score)).padStart(6, '0')}</span>
            </div>

            <div className="arc-canvas-wrap arc-cab" style={{ '--arc-aspect': W / H }}>
                <canvas ref={canvasRef} width={W} height={H} style={{ touchAction: 'none' }} />

                {phase !== 'playing' && (
                    <div className="arc-overlay">
                        {phase === 'ready' && (
                            <>
                                <p className="arc-overlay-title">MOTO RUSH</p>
                                <p className="arc-overlay-text">
                                    HOLD ◀ ▶ TO WEAVE THROUGH TRAFFIC.
                                    <br />
                                    GRAZE A CAR FOR +{NEAR_MISS_BONUS} — TOUCH ONE AND YOU'RE PASTE.
                                    <br />
                                    EVERY {LEVEL_METERS}M IS A LEVEL — AND MORE THROTTLE.
                                </p>
                                <button type="button" className="arc-btn" onClick={startGame}>
                                    ▶ THROTTLE UP
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
                                    WIPEOUT
                                </p>
                                <p className="arc-overlay-text">
                                    FINAL SCORE {String(score).padStart(6, '0')} · LEVEL {level}
                                    {score >= highScore && score > 0 ? ' — NEW RECORD!' : ''}
                                </p>
                                <button type="button" className="arc-btn" onClick={startGame}>
                                    ↻ RIDE AGAIN
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
                    aria-label="Steer left"
                    onPointerDown={(e) => { e.preventDefault(); holdSteer(-1); }}
                    onPointerUp={() => holdSteer(0)}
                    onPointerLeave={() => holdSteer(0)}
                    onPointerCancel={() => holdSteer(0)}
                >
                    ◀
                </button>
                <button
                    type="button"
                    className="arc-touch-btn"
                    aria-label="Steer right"
                    onPointerDown={(e) => { e.preventDefault(); holdSteer(1); }}
                    onPointerUp={() => holdSteer(0)}
                    onPointerLeave={() => holdSteer(0)}
                    onPointerCancel={() => holdSteer(0)}
                >
                    ▶
                </button>
            </div>
        </div>
    );
}
