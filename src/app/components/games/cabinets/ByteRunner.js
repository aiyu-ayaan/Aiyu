"use client";

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useHighScore } from '../useHighScore';

const LANES = [-3, 0, 3];
const ROAD_W = 9.6;
const SPAWN_Z = -130;
const KILL_Z = 12;
const PLAYER_Z = 0;
const START_SPEED = 26; // world units/s toward the camera
const MAX_SPEED = 68;
const SPEED_RAMP = 0.55; // units/s gained per second survived
const SPAWN_EVERY_MS = 950;
const MIN_SPAWN_MS = 440;
const COIN_CHANCE = 0.4;
const SWIPE_THRESHOLD = 26;

// Jump / roll (Subway Surfer moves)
const GRAVITY = 40; // u/s²
const JUMP_VY = 13.5; // apex ≈ 2.3u, airtime ≈ 0.68s
const FAST_FALL_VY = -26; // pressing ▼ mid-air slams you down
const ROLL_TIME = 0.6; // seconds
const RUN_HEIGHT = 1.9;
const ROLL_HEIGHT = 0.95;

// Obstacle kinds: wall = switch lanes, hurdle = jump it, bar = roll under it.
const OBSTACLE_MIX = [
    ['wall', 0.44],
    ['hurdle', 0.28],
    ['bar', 0.28],
];

function pickObstacle() {
    let r = Math.random();
    for (const [kind, p] of OBSTACLE_MIX) {
        if ((r -= p) <= 0) return kind;
    }
    return 'wall';
}

// Low-poly runner built from primitives: feet at y=0 so the roll crouch can
// scale the body toward the ground. Returns the group plus animatable limbs.
function buildRunner() {
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2ee6ff, emissive: 0x0e7a99, roughness: 0.35 });
    const limbMat = new THREE.MeshStandardMaterial({ color: 0x1899bb, emissive: 0x07495e, roughness: 0.45 });
    const headMat = new THREE.MeshStandardMaterial({ color: 0x9df2ff, emissive: 0x2d8fa8, roughness: 0.3 });
    const visorMat = new THREE.MeshBasicMaterial({ color: 0x061018 });

    const body = new THREE.Group();

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.85, 0.42), bodyMat);
    torso.position.y = 1.22;
    body.add(torso);

    const hips = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.22, 0.38), limbMat);
    hips.position.y = 0.72;
    body.add(hips);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.42, 0.44), headMat);
    head.position.y = 1.92;
    body.add(head);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.06), visorMat);
    visor.position.set(0, 1.94, -0.23);
    body.add(visor);

    // Limbs pivot at their top (shoulder / hip) so rotation.x swings them.
    const makeLimb = (w, len, mat) => {
        const geo = new THREE.BoxGeometry(w, len, w);
        geo.translate(0, -len / 2, 0);
        return new THREE.Mesh(geo, mat);
    };

    const armL = makeLimb(0.2, 0.75, limbMat);
    armL.position.set(-0.5, 1.6, 0);
    const armR = makeLimb(0.2, 0.75, limbMat);
    armR.position.set(0.5, 1.6, 0);
    const legL = makeLimb(0.24, 0.72, bodyMat);
    legL.position.set(-0.2, 0.68, 0);
    const legR = makeLimb(0.24, 0.72, bodyMat);
    legR.position.set(0.2, 0.68, 0);
    body.add(armL, armR, legL, legR);

    const group = new THREE.Group();
    group.add(body);
    return { group, body, armL, armR, legL, legR };
}

export default function ByteRunner() {
    const canvasRef = useRef(null);
    const wrapRef = useRef(null);
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
        const s = stateRef.current;
        if (!s) return;
        s.lane = 1;
        s.speed = START_SPEED;
        s.spawnTimer = 0;
        s.spawnEvery = SPAWN_EVERY_MS;
        s.distance = 0;
        s.coins = 0;
        s.score = 0;
        s.jumpY = 0;
        s.vy = 0;
        s.airborne = false;
        s.rollTimer = 0;
        for (const ent of s.entities) {
            ent.active = false;
            ent.mesh.visible = false;
        }
        setScore(0);
    };

    const startGame = () => {
        resetGame();
        setPhaseBoth('playing');
    };

    const doJump = () => {
        const s = stateRef.current;
        if (!s || phaseRef.current !== 'playing') return;
        if (!s.airborne) {
            s.airborne = true;
            s.vy = JUMP_VY;
            s.rollTimer = 0;
        }
    };

    const doRoll = () => {
        const s = stateRef.current;
        if (!s || phaseRef.current !== 'playing') return;
        if (s.airborne) {
            s.vy = FAST_FALL_VY; // slam down, roll starts on landing
            s.queueRoll = true;
        } else {
            s.rollTimer = ROLL_TIME;
        }
    };

    // Input — lanes, jump, roll.
    useEffect(() => {
        const move = (delta) => {
            const s = stateRef.current;
            if (!s) return;
            s.lane = Math.max(0, Math.min(LANES.length - 1, s.lane + delta));
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
            } else if (key === 'arrowup' || key === 'w') {
                e.preventDefault();
                if (phaseRef.current !== 'playing') primaryAction();
                else doJump();
            } else if (key === 'arrowdown' || key === 's') {
                e.preventDefault();
                doRoll();
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
            if (phaseRef.current !== 'playing') startGame();
            if (Math.abs(dx) > Math.abs(dy)) {
                move(dx > 0 ? 1 : -1);
            } else if (dy < 0) {
                doJump();
            } else {
                doRoll();
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

    // Three.js scene + game loop.
    useEffect(() => {
        const canvas = canvasRef.current;
        const wrap = wrapRef.current;
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

        const scene = new THREE.Scene();
        scene.background = new THREE.Color('#030208');
        scene.fog = new THREE.Fog('#030208', 30, 125);

        const camera = new THREE.PerspectiveCamera(72, 16 / 10, 0.1, 300);
        camera.position.set(0, 4.4, 9.5);
        camera.lookAt(0, 0.6, -24);

        // Fill the wrapper — rerender at its real size whenever it changes.
        const resize = () => {
            const w = Math.max(1, wrap.clientWidth);
            const h = Math.max(1, wrap.clientHeight);
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        };
        resize();
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(wrap);

        scene.add(new THREE.AmbientLight(0x8899ff, 0.6));
        const keyLight = new THREE.PointLight(0x2ee6ff, 120, 70);
        keyLight.position.set(0, 8, 4);
        scene.add(keyLight);
        const backLight = new THREE.PointLight(0xff4fd8, 60, 50);
        backLight.position.set(0, 5, -18);
        scene.add(backLight);

        // Road bed
        const road = new THREE.Mesh(
            new THREE.PlaneGeometry(ROAD_W, 400),
            new THREE.MeshStandardMaterial({ color: 0x0a0620, roughness: 0.9 })
        );
        road.rotation.x = -Math.PI / 2;
        road.position.z = -150;
        scene.add(road);

        // Infinite neon grid — scrolled by modulo, never actually moves far.
        const grid = new THREE.GridHelper(400, 100, 0x2ee6ff, 0x2ee6ff);
        grid.material.transparent = true;
        grid.material.opacity = 0.16;
        grid.position.y = 0.01;
        grid.position.z = -150;
        scene.add(grid);

        // Lane divider + edge rails, glowing
        const railMat = new THREE.MeshBasicMaterial({ color: 0xff4fd8 });
        const laneMat = new THREE.MeshBasicMaterial({ color: 0x2ee6ff, transparent: true, opacity: 0.5 });
        const railGeo = new THREE.BoxGeometry(0.12, 0.12, 400);
        for (const x of [-ROAD_W / 2, ROAD_W / 2]) {
            const rail = new THREE.Mesh(railGeo, railMat);
            rail.position.set(x, 0.06, -150);
            scene.add(rail);
        }
        for (const x of [-1.5, 1.5]) {
            const line = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 400), laneMat);
            line.position.set(x, 0.02, -150);
            scene.add(line);
        }

        // The runner
        const runner = buildRunner();
        runner.group.position.set(0, 0, PLAYER_Z);
        scene.add(runner.group);

        // Entity pools.
        // wall: full blocker (change lanes) · hurdle: low, jump it ·
        // bar: overhead, roll under it · coin: +25
        const wallMat = new THREE.MeshStandardMaterial({ color: 0xff3344, emissive: 0x881122, roughness: 0.4 });
        const hurdleMat = new THREE.MeshStandardMaterial({ color: 0xff8a4f, emissive: 0x8a3a12, roughness: 0.4 });
        const barMat = new THREE.MeshStandardMaterial({ color: 0xff4fd8, emissive: 0x8a1670, roughness: 0.4 });
        const coinMat = new THREE.MeshStandardMaterial({ color: 0xffc94f, emissive: 0xaa7718, roughness: 0.3 });

        const makePool = (count, build) => {
            const pool = [];
            for (let i = 0; i < count; i++) {
                const mesh = build();
                mesh.visible = false;
                scene.add(mesh);
                pool.push(mesh);
            }
            return pool;
        };

        const wallGeo = new THREE.BoxGeometry(2.6, 2.6, 0.8);
        const hurdleGeo = new THREE.BoxGeometry(2.6, 1.0, 0.55);
        const barTopGeo = new THREE.BoxGeometry(2.6, 1.1, 0.55);
        const postGeo = new THREE.BoxGeometry(0.16, 2.6, 0.16);
        const coinGeo = new THREE.OctahedronGeometry(0.65);

        const entities = [];
        const addPool = (type, count, build) => {
            for (const mesh of makePool(count, build)) {
                entities.push({ mesh, type, active: false, lane: 0 });
            }
        };

        addPool('wall', 8, () => {
            const m = new THREE.Mesh(wallGeo, wallMat);
            m.position.y = 1.3;
            return m;
        });
        addPool('hurdle', 8, () => {
            const m = new THREE.Mesh(hurdleGeo, hurdleMat);
            m.position.y = 0.5;
            return m;
        });
        addPool('bar', 8, () => {
            // Overhead bar on two posts — gap underneath is roll height.
            const g = new THREE.Group();
            const top = new THREE.Mesh(barTopGeo, barMat);
            top.position.y = 2.05; // underside at 1.5
            const postL = new THREE.Mesh(postGeo, barMat);
            postL.position.set(-1.25, 1.3, 0);
            const postR = new THREE.Mesh(postGeo, barMat);
            postR.position.set(1.25, 1.3, 0);
            g.add(top, postL, postR);
            return g;
        });
        addPool('coin', 10, () => {
            const m = new THREE.Mesh(coinGeo, coinMat);
            m.position.y = 1.0;
            return m;
        });

        stateRef.current = {
            lane: 1,
            speed: START_SPEED,
            spawnTimer: 0,
            spawnEvery: SPAWN_EVERY_MS,
            distance: 0,
            coins: 0,
            score: 0,
            jumpY: 0,
            vy: 0,
            airborne: false,
            rollTimer: 0,
            queueRoll: false,
            entities,
        };
        resetGame();

        const spawn = (type, lane, z) => {
            const ent = entities.find((e) => !e.active && e.type === type);
            if (!ent) return;
            ent.active = true;
            ent.lane = lane;
            ent.mesh.visible = true;
            ent.mesh.position.x = LANES[lane];
            ent.mesh.position.z = z;
        };

        const die = (s) => {
            s.score = Math.floor(s.distance) + s.coins * 25;
            setScore(s.score);
            submitScore(s.score);
            setPhaseBoth('over');
        };

        const update = (dt) => {
            const s = stateRef.current;
            const sec = dt / 1000;

            s.speed = Math.min(MAX_SPEED, s.speed + SPEED_RAMP * sec);
            s.distance += s.speed * sec;

            // Scroll the grid — modulo one cell (400/100 = 4 units)
            grid.position.z = -150 + (s.distance % 4);

            // Jump physics
            if (s.airborne) {
                s.vy -= GRAVITY * sec;
                s.jumpY += s.vy * sec;
                if (s.jumpY <= 0) {
                    s.jumpY = 0;
                    s.vy = 0;
                    s.airborne = false;
                    if (s.queueRoll) {
                        s.queueRoll = false;
                        s.rollTimer = ROLL_TIME;
                    }
                }
            }
            const rolling = s.rollTimer > 0;
            if (rolling) s.rollTimer -= sec;

            // Lane lerp + posture animation
            const targetX = LANES[s.lane];
            const g = runner.group;
            g.position.x += (targetX - g.position.x) * Math.min(1, sec * 10);
            g.position.y = s.jumpY;
            g.rotation.z = (g.position.x - targetX) * 0.12; // banking

            const crouch = rolling ? 0.45 : 1;
            runner.body.scale.y += (crouch - runner.body.scale.y) * Math.min(1, sec * 18);
            runner.body.rotation.x = rolling ? 0.55 : (s.airborne ? -0.18 : 0);

            const t = performance.now() / 1000;
            const swing = Math.sin(t * (7 + s.speed * 0.12));
            if (s.airborne) {
                // tucked mid-air pose
                runner.legL.rotation.x = 0.85;
                runner.legR.rotation.x = -0.35;
                runner.armL.rotation.x = -2.4;
                runner.armR.rotation.x = -2.4;
            } else if (rolling) {
                runner.legL.rotation.x = 0.5;
                runner.legR.rotation.x = 0.5;
                runner.armL.rotation.x = -0.6;
                runner.armR.rotation.x = -0.6;
            } else {
                runner.legL.rotation.x = swing * 0.95;
                runner.legR.rotation.x = -swing * 0.95;
                runner.armL.rotation.x = -swing * 0.7;
                runner.armR.rotation.x = swing * 0.7;
                runner.body.position.y = Math.abs(Math.sin(t * (7 + s.speed * 0.12))) * 0.08;
            }

            camera.position.x = g.position.x * 0.35;
            camera.position.y = 4.4 + s.jumpY * 0.25;

            // Spawns
            s.spawnTimer += dt;
            s.spawnEvery = Math.max(MIN_SPAWN_MS, SPAWN_EVERY_MS - s.distance / 6);
            if (s.spawnTimer >= s.spawnEvery) {
                s.spawnTimer = 0;
                const lane = Math.floor(Math.random() * LANES.length);
                spawn(pickObstacle(), lane, SPAWN_Z);
                if (Math.random() < COIN_CHANCE) {
                    const free = [0, 1, 2].filter((l) => l !== lane);
                    spawn('coin', free[Math.floor(Math.random() * free.length)], SPAWN_Z - 14);
                }
            }

            // Move entities toward the camera, resolve collisions
            const playerHeight = rolling ? ROLL_HEIGHT : RUN_HEIGHT;
            for (const ent of entities) {
                if (!ent.active) continue;
                ent.mesh.position.z += s.speed * sec;
                if (ent.type === 'coin') ent.mesh.rotation.y += sec * 4;

                const closeZ = Math.abs(ent.mesh.position.z - PLAYER_Z) < 1.3;
                const closeX = Math.abs(ent.mesh.position.x - g.position.x) < 1.7;
                if (closeZ && closeX) {
                    if (ent.type === 'coin') {
                        ent.active = false;
                        ent.mesh.visible = false;
                        s.coins += 1;
                    } else if (ent.type === 'wall') {
                        die(s);
                        return;
                    } else if (ent.type === 'hurdle') {
                        // clear it only if your feet are above the hurdle top (1.0)
                        if (s.jumpY < 1.0) {
                            die(s);
                            return;
                        }
                    } else if (ent.type === 'bar') {
                        // underside at 1.5 — get under it or eat it
                        if (s.jumpY + playerHeight > 1.5) {
                            die(s);
                            return;
                        }
                    }
                }
                if (ent.mesh.position.z > KILL_Z) {
                    ent.active = false;
                    ent.mesh.visible = false;
                }
            }

            s.score = Math.floor(s.distance) + s.coins * 25;
            setScore(s.score);
        };

        let raf;
        let last = performance.now();
        const frame = (now) => {
            const dt = Math.min(now - last, 100);
            last = now;
            if (phaseRef.current === 'playing') update(dt);
            renderer.render(scene, camera);
            raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);

        const onVisibility = () => {
            if (document.hidden && phaseRef.current === 'playing') setPhaseBoth('paused');
        };
        document.addEventListener('visibilitychange', onVisibility);

        return () => {
            cancelAnimationFrame(raf);
            resizeObserver.disconnect();
            document.removeEventListener('visibilitychange', onVisibility);
            scene.traverse((obj) => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach((m) => m.dispose());
                }
            });
            renderer.dispose();
        };
         
    }, [submitScore]);

    return (
        <div>
            <div className="arc-hud mb-3">
                <span>SCORE {String(score).padStart(6, '0')}</span>
                <span className="arc-hiscore">HI {String(Math.max(highScore, score)).padStart(6, '0')}</span>
            </div>

            <div ref={wrapRef} className="arc-canvas-wrap arc-cab-full">
                <canvas ref={canvasRef} />

                {phase !== 'playing' && (
                    <div className="arc-overlay">
                        {phase === 'ready' && (
                            <>
                                <p className="arc-overlay-title">BYTE RUNNER 3D</p>
                                <p className="arc-overlay-text">
                                    RED WALLS — SWITCH LANES.
                                    <br />
                                    ORANGE HURDLES — JUMP (▲).
                                    <br />
                                    PINK BARS — ROLL UNDER (▼).
                                    <br />
                                    GOLD DATA BITS — GRAB THEM (+25).
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
                <button type="button" className="arc-touch-btn" aria-label="Jump" onClick={doJump}>
                    ▲
                </button>
                <button type="button" className="arc-touch-btn" aria-label="Roll" onClick={doRoll}>
                    ▼
                </button>
                <button
                    type="button"
                    className="arc-touch-btn"
                    aria-label="Move right"
                    onClick={() => {
                        const s = stateRef.current;
                        if (s && phaseRef.current === 'playing') s.lane = Math.min(LANES.length - 1, s.lane + 1);
                    }}
                >
                    ▶
                </button>
            </div>
        </div>
    );
}
