"use client";

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useHighScore } from '../useHighScore';

// Internal render size — CSS (.arc-cab) scales the canvas to the viewport.
const W = 640;
const H = 440;
const LANES = [-3, 0, 3];
const ROAD_W = 9.6;
const SPAWN_Z = -130;
const KILL_Z = 12;
const PLAYER_Z = 0;
const START_SPEED = 26; // world units/s toward the camera
const MAX_SPEED = 68;
const SPEED_RAMP = 0.55; // units/s gained per second survived
const SPAWN_EVERY_MS = 900;
const MIN_SPAWN_MS = 420;
const COIN_CHANCE = 0.4;
const SWIPE_THRESHOLD = 24;

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
        const s = stateRef.current;
        if (!s) return;
        s.lane = 1;
        s.speed = START_SPEED;
        s.spawnTimer = 0;
        s.spawnEvery = SPAWN_EVERY_MS;
        s.distance = 0;
        s.coins = 0;
        s.score = 0;
        for (const ent of s.entities) ent.mesh.visible = false;
        s.entities.forEach((ent) => { ent.active = false; });
        setScore(0);
    };

    const startGame = () => {
        resetGame();
        setPhaseBoth('playing');
    };

    // Input — same scheme as the other cabinets.
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

    // Three.js scene + game loop.
    useEffect(() => {
        const canvas = canvasRef.current;
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(W, H, false);

        const scene = new THREE.Scene();
        scene.background = new THREE.Color('#030208');
        scene.fog = new THREE.Fog('#030208', 30, 125);

        const camera = new THREE.PerspectiveCamera(72, W / H, 0.1, 300);
        camera.position.set(0, 4.4, 9.5);
        camera.lookAt(0, 0.6, -24);

        scene.add(new THREE.AmbientLight(0x8899ff, 0.55));
        const keyLight = new THREE.PointLight(0x2ee6ff, 90, 60);
        keyLight.position.set(0, 8, 4);
        scene.add(keyLight);

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

        // Player — glowing cyan cube with a wireframe shell
        const player = new THREE.Group();
        const core = new THREE.Mesh(
            new THREE.BoxGeometry(1.5, 1.5, 1.5),
            new THREE.MeshStandardMaterial({ color: 0x2ee6ff, emissive: 0x1899bb, roughness: 0.35 })
        );
        const shell = new THREE.Mesh(
            new THREE.BoxGeometry(1.72, 1.72, 1.72),
            new THREE.MeshBasicMaterial({ color: 0x9df2ff, wireframe: true, transparent: true, opacity: 0.6 })
        );
        player.add(core, shell);
        player.position.set(0, 0.85, PLAYER_Z);
        scene.add(player);

        // Entity pool: firewalls (red boxes) and data bits (gold octahedrons)
        const wallGeo = new THREE.BoxGeometry(2.4, 2.4, 0.8);
        const wallMat = new THREE.MeshStandardMaterial({ color: 0xff3344, emissive: 0x881122, roughness: 0.4 });
        const coinGeo = new THREE.OctahedronGeometry(0.65);
        const coinMat = new THREE.MeshStandardMaterial({ color: 0xffc94f, emissive: 0xaa7718, roughness: 0.3 });
        const entities = [];
        for (let i = 0; i < 24; i++) {
            const isWall = i < 14;
            const mesh = new THREE.Mesh(isWall ? wallGeo : coinGeo, isWall ? wallMat : coinMat);
            mesh.visible = false;
            scene.add(mesh);
            entities.push({ mesh, type: isWall ? 'wall' : 'coin', active: false, lane: 0 });
        }

        stateRef.current = {
            lane: 1,
            speed: START_SPEED,
            spawnTimer: 0,
            spawnEvery: SPAWN_EVERY_MS,
            distance: 0,
            coins: 0,
            score: 0,
            entities,
        };
        resetGame();

        const spawn = (type, lane, z) => {
            const ent = entities.find((e) => !e.active && e.type === type);
            if (!ent) return;
            ent.active = true;
            ent.lane = lane;
            ent.mesh.visible = true;
            ent.mesh.position.set(LANES[lane], type === 'wall' ? 1.2 : 1.0, z);
        };

        const update = (dt) => {
            const s = stateRef.current;
            const sec = dt / 1000;

            s.speed = Math.min(MAX_SPEED, s.speed + SPEED_RAMP * sec);
            s.distance += s.speed * sec;

            // Scroll the grid — modulo one cell (400/100 = 4 units)
            grid.position.z = -150 + ((s.distance % 4));

            // Lane lerp + banking tilt
            const targetX = LANES[s.lane];
            player.position.x += (targetX - player.position.x) * Math.min(1, sec * 10);
            player.rotation.z = (player.position.x - targetX) * 0.14;
            player.rotation.x -= sec * 2.2; // rolling forward
            player.position.y = 0.85 + Math.sin(performance.now() / 260) * 0.06;
            camera.position.x = player.position.x * 0.35;

            // Spawns
            s.spawnTimer += dt;
            s.spawnEvery = Math.max(MIN_SPAWN_MS, SPAWN_EVERY_MS - s.distance / 6);
            if (s.spawnTimer >= s.spawnEvery) {
                s.spawnTimer = 0;
                const wallLane = Math.floor(Math.random() * LANES.length);
                spawn('wall', wallLane, SPAWN_Z);
                if (Math.random() < COIN_CHANCE) {
                    const free = [0, 1, 2].filter((l) => l !== wallLane);
                    spawn('coin', free[Math.floor(Math.random() * free.length)], SPAWN_Z - 14);
                }
            }

            // Move entities toward the camera, collide with the player
            for (const ent of entities) {
                if (!ent.active) continue;
                ent.mesh.position.z += s.speed * sec;
                if (ent.type === 'coin') ent.mesh.rotation.y += sec * 4;

                const closeZ = Math.abs(ent.mesh.position.z - PLAYER_Z) < (ent.type === 'wall' ? 1.4 : 1.2);
                const closeX = Math.abs(ent.mesh.position.x - player.position.x) < (ent.type === 'wall' ? 1.8 : 1.3);
                if (closeZ && closeX) {
                    if (ent.type === 'coin') {
                        ent.active = false;
                        ent.mesh.visible = false;
                        s.coins += 1;
                    } else {
                        s.score = Math.floor(s.distance) + s.coins * 25;
                        setScore(s.score);
                        submitScore(s.score);
                        setPhaseBoth('over');
                        return;
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
            document.removeEventListener('visibilitychange', onVisibility);
            scene.traverse((obj) => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach((m) => m.dispose());
                }
            });
            renderer.dispose();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
                                <p className="arc-overlay-title">BYTE RUNNER 3D</p>
                                <p className="arc-overlay-text">
                                    RUN THE NEON HIGHWAY. DODGE RED FIREWALLS.
                                    <br />
                                    GRAB GOLD DATA BITS (+25).
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
                        if (s && phaseRef.current === 'playing') s.lane = Math.min(LANES.length - 1, s.lane + 1);
                    }}
                >
                    ▶
                </button>
            </div>
        </div>
    );
}
