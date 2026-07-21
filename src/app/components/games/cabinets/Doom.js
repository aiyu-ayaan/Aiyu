"use client";

import { useEffect, useRef, useState } from 'react';
import { useHighScore } from '../useHighScore';
import { useGameAudio } from '../audio/useGameAudio';

/**
 * DOOM — a from-scratch raycasting FPS on a 2D canvas. No engine, no textures:
 * walls are shaded by distance + face, demons are billboarded emoji sprites
 * clipped against the wall depth buffer, and the whole scene is one rAF loop.
 *
 * Controls: W/S walk, A/D strafe, arrows / on-screen turn to rotate, drag the
 * view to look, SPACE / click / FIRE to shoot. Clear every demon in a wave to
 * advance; ammo is finite but each kill tops it back up.
 */
const W = 480;
const H = 300;
const RES = 160;                 // ray columns — chunky on purpose
const COL = W / RES;             // px per column
const FOV = 0.66;                // camera-plane half-width (~66° field of view)
const MOVE_SPEED = 2.6;          // world units / second
const TURN_SPEED = 2.7;          // radians / second
const TOUCH_RADIUS = 0.34;       // wall clearance so we never clip inside geometry
const FIRE_COOLDOWN = 320;       // ms between shots
const DEMON_GLYPH = '👹';
const IMP_GLYPH = '👺';

// 1 = wall (value picks a tint), 0 = open floor. Border is solid.
const MAP = [
    '1111111111111111',
    '1000000000002001',
    '1011110111102101',
    '1010000100001001',
    '1010330101101001',
    '1000010000100301',
    '1110010111100111',
    '1000000000000001',
    '1011101101110101',
    '1000100000010021',
    '1110101111010111',
    '1000100300010001',
    '1011111011110101',
    '1000000000000001',
    '1010111101111001',
    '1111111111111111',
].map((row) => row.split('').map(Number));
const MAP_H = MAP.length;
const MAP_W = MAP[0].length;

// Wall face tints, indexed by map value; darkened again per distance/face below.
const WALL_TINT = {
    1: [150, 40, 40],
    2: [120, 60, 130],
    3: [90, 90, 110],
};

const cellAt = (x, y) => {
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return 1;
    return MAP[y | 0][x | 0];
};
const isWall = (x, y) => cellAt(x, y) > 0;

// Open cells demons can spawn on, kept a little away from the player start.
const SPAWN_CELLS = [];
for (let y = 1; y < MAP_H - 1; y++) {
    for (let x = 1; x < MAP_W - 1; x++) {
        if (MAP[y][x] === 0 && (x > 4 || y > 4)) SPAWN_CELLS.push({ x: x + 0.5, y: y + 0.5 });
    }
}

function spawnWave(wave) {
    const count = Math.min(4 + wave * 2, 14);
    const speed = 0.7 + wave * 0.14;
    const demons = [];
    const pool = [...SPAWN_CELLS];
    for (let i = 0; i < count && pool.length; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        const cell = pool.splice(idx, 1)[0];
        const tough = wave > 2 && i % 3 === 0;
        demons.push({
            x: cell.x,
            y: cell.y,
            hp: tough ? 2 : 1,
            speed: tough ? speed * 0.8 : speed,
            glyph: tough ? DEMON_GLYPH : IMP_GLYPH,
            points: tough ? 150 : 100,
            hurt: 0,
        });
    }
    return demons;
}

export default function Doom() {
    const canvasRef = useRef(null);
    const [phase, setPhase] = useState('ready');
    const [score, setScore] = useState(0);
    const [health, setHealth] = useState(100);
    const [ammo, setAmmo] = useState(40);
    const [wave, setWave] = useState(1);
    const [highScore, submitScore] = useHighScore('doom');
    const audio = useGameAudio('doom', phase);

    const stateRef = useRef(null);
    const phaseRef = useRef('ready');
    const setPhaseBoth = (next) => {
        phaseRef.current = next;
        setPhase(next);
    };

    const resetGame = () => {
        stateRef.current = {
            px: 1.5,
            py: 1.5,
            angle: 0.4,
            keys: { fwd: false, back: false, left: false, right: false, turnL: false, turnR: false },
            demons: spawnWave(1),
            zbuf: new Float32Array(RES),
            score: 0,
            health: 100,
            ammo: 40,
            wave: 1,
            fireTimer: 0,
            muzzle: 0,
            hurtFlash: 0,
            dragX: null,
        };
        setScore(0);
        setHealth(100);
        setAmmo(40);
        setWave(1);
    };

    const startGame = () => {
        resetGame();
        setPhaseBoth('playing');
    };

    // Hitscan straight down the crosshair: the nearest demon within a narrow
    // aim cone in front of the player, not occluded by a wall, takes the hit.
    const fire = () => {
        const s = stateRef.current;
        if (!s || phaseRef.current !== 'playing') return;
        if (s.fireTimer > 0 || s.ammo <= 0) {
            if (s.ammo <= 0) audio.sfx('wall');
            return;
        }
        s.ammo -= 1;
        s.fireTimer = FIRE_COOLDOWN;
        s.muzzle = 90;
        setAmmo(s.ammo);
        audio.sfx('shoot');

        const dirX = Math.cos(s.angle);
        const dirY = Math.sin(s.angle);
        let best = null;
        let bestDist = Infinity;
        for (const d of s.demons) {
            const dx = d.x - s.px;
            const dy = d.y - s.py;
            const dist = Math.hypot(dx, dy);
            if (dist < 0.001) continue;
            const dot = (dx * dirX + dy * dirY) / dist;   // cos(angle to demon)
            const aim = 1 - 0.14 / Math.max(dist, 0.6);    // wider cone up close
            if (dot > aim && dist < bestDist && dist < 12) {
                best = d;
                bestDist = dist;
            }
        }
        if (best) {
            best.hp -= 1;
            best.hurt = 160;
            if (best.hp <= 0) {
                s.demons = s.demons.filter((d) => d !== best);
                s.score += best.points;
                s.ammo = Math.min(s.ammo + 6, 99);
                setScore(s.score);
                setAmmo(s.ammo);
                audio.sfx('explode');
                if (s.demons.length === 0) {
                    s.wave += 1;
                    setWave(s.wave);
                    s.demons = spawnWave(s.wave);
                    s.ammo = Math.min(s.ammo + 12, 99);
                    setAmmo(s.ammo);
                    audio.sfx('levelUp');
                }
            } else {
                audio.sfx('hit');
            }
        }
    };

    // Input: keyboard hold-flags + pause/start, plus drag-to-look on the canvas.
    useEffect(() => {
        resetGame();

        const primaryAction = () => {
            if (phaseRef.current === 'ready' || phaseRef.current === 'over') startGame();
            else if (phaseRef.current === 'playing') setPhaseBoth('paused');
            else setPhaseBoth('playing');
        };

        const onKey = (e) => {
            const s = stateRef.current;
            const down = e.type === 'keydown';
            const key = e.key.toLowerCase();
            switch (key) {
                case 'w': case 'arrowup': e.preventDefault(); s.keys.fwd = down; break;
                case 's': case 'arrowdown': e.preventDefault(); s.keys.back = down; break;
                case 'a': e.preventDefault(); s.keys.left = down; break;
                case 'd': e.preventDefault(); s.keys.right = down; break;
                case 'arrowleft': case 'q': e.preventDefault(); s.keys.turnL = down; break;
                case 'arrowright': case 'e': e.preventDefault(); s.keys.turnR = down; break;
                case ' ':
                    e.preventDefault();
                    if (down) { if (phaseRef.current === 'playing') fire(); else primaryAction(); }
                    break;
                case 'p': case 'enter':
                    if (down) { e.preventDefault(); primaryAction(); }
                    break;
                default: break;
            }
        };

        window.addEventListener('keydown', onKey);
        window.addEventListener('keyup', onKey);
        return () => {
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('keyup', onKey);
        };

    }, []);

    // Simulation + render loop.
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let raf;
        let last = performance.now();

        const tryMove = (s, nx, ny) => {
            if (!isWall(nx + Math.sign(nx - s.px) * TOUCH_RADIUS, s.py)) s.px = nx;
            if (!isWall(s.px, ny + Math.sign(ny - s.py) * TOUCH_RADIUS)) s.py = ny;
        };

        const update = (dt) => {
            const s = stateRef.current;
            const sec = dt / 1000;

            if (s.fireTimer > 0) s.fireTimer -= dt;
            if (s.muzzle > 0) s.muzzle -= dt;
            if (s.hurtFlash > 0) s.hurtFlash -= dt;

            if (s.keys.turnL) s.angle -= TURN_SPEED * sec;
            if (s.keys.turnR) s.angle += TURN_SPEED * sec;

            const dirX = Math.cos(s.angle);
            const dirY = Math.sin(s.angle);
            let mvX = 0, mvY = 0;
            if (s.keys.fwd) { mvX += dirX; mvY += dirY; }
            if (s.keys.back) { mvX -= dirX; mvY -= dirY; }
            if (s.keys.left) { mvX += dirY; mvY -= dirX; }   // strafe = perpendicular
            if (s.keys.right) { mvX -= dirY; mvY += dirX; }
            const len = Math.hypot(mvX, mvY);
            if (len > 0) {
                const step = MOVE_SPEED * sec / len;
                tryMove(s, s.px + mvX * step, s.py + mvY * step);
            }

            // Demons home in on the player and gnaw on contact.
            for (const d of s.demons) {
                if (d.hurt > 0) d.hurt -= dt;
                const dx = s.px - d.x;
                const dy = s.py - d.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 0.5) {
                    const step = d.speed * sec / dist;
                    const nx = d.x + dx * step;
                    const ny = d.y + dy * step;
                    if (!isWall(nx, d.y)) d.x = nx;
                    if (!isWall(d.x, ny)) d.y = ny;
                } else {
                    d.bite = (d.bite || 0) - dt;
                    if (d.bite <= 0) {
                        d.bite = 700;
                        s.health -= 9;
                        s.hurtFlash = 260;
                        setHealth(Math.max(0, s.health));
                        audio.sfx('hit');
                        if (s.health <= 0) {
                            submitScore(s.score);
                            setPhaseBoth('over');
                            audio.sfx('gameOver');
                            return;
                        }
                    }
                }
            }
        };

        const draw = () => {
            const s = stateRef.current;

            // Ceiling and floor as flat vertical gradients.
            const ceil = ctx.createLinearGradient(0, 0, 0, H / 2);
            ceil.addColorStop(0, '#1a0608');
            ceil.addColorStop(1, '#070206');
            ctx.fillStyle = ceil;
            ctx.fillRect(0, 0, W, H / 2);
            const floor = ctx.createLinearGradient(0, H / 2, 0, H);
            floor.addColorStop(0, '#0a0806');
            floor.addColorStop(1, '#241a10');
            ctx.fillStyle = floor;
            ctx.fillRect(0, H / 2, W, H / 2);

            const dirX = Math.cos(s.angle);
            const dirY = Math.sin(s.angle);
            const planeX = -dirY * FOV;
            const planeY = dirX * FOV;

            // Cast one ray per column with a DDA grid march.
            for (let i = 0; i < RES; i++) {
                const cameraX = (2 * i) / RES - 1;
                const rayX = dirX + planeX * cameraX;
                const rayY = dirY + planeY * cameraX;

                let mapX = s.px | 0;
                let mapY = s.py | 0;
                const deltaX = Math.abs(1 / rayX);
                const deltaY = Math.abs(1 / rayY);

                let stepX, stepY, sideX, sideY;
                if (rayX < 0) { stepX = -1; sideX = (s.px - mapX) * deltaX; }
                else { stepX = 1; sideX = (mapX + 1 - s.px) * deltaX; }
                if (rayY < 0) { stepY = -1; sideY = (s.py - mapY) * deltaY; }
                else { stepY = 1; sideY = (mapY + 1 - s.py) * deltaY; }

                let hit = 0;
                let side = 0;
                let guard = 0;
                while (!hit && guard++ < 64) {
                    if (sideX < sideY) { sideX += deltaX; mapX += stepX; side = 0; }
                    else { sideY += deltaY; mapY += stepY; side = 1; }
                    hit = cellAt(mapX, mapY);
                }

                const perp = side === 0
                    ? sideX - deltaX
                    : sideY - deltaY;
                s.zbuf[i] = perp;

                const lineH = Math.min(H * 4, H / perp);
                const y0 = (H - lineH) / 2;

                const tint = WALL_TINT[hit] || WALL_TINT[1];
                // Darker far away, and darker still on the shaded (y) faces.
                const shade = Math.max(0.18, 1 - perp / 9) * (side === 1 ? 0.66 : 1);
                ctx.fillStyle = `rgb(${(tint[0] * shade) | 0},${(tint[1] * shade) | 0},${(tint[2] * shade) | 0})`;
                ctx.fillRect(i * COL, y0, COL + 1, lineH);
            }

            // Depth-sort demons back-to-front, then billboard them with the
            // inverse camera matrix and clip against the wall depth buffer.
            const invDet = 1 / (planeX * dirY - dirX * planeY);
            const sprites = s.demons
                .map((d) => ({ d, dist: (d.x - s.px) ** 2 + (d.y - s.py) ** 2 }))
                .sort((a, b) => b.dist - a.dist);

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            for (const { d } of sprites) {
                const rx = d.x - s.px;
                const ry = d.y - s.py;
                const tX = invDet * (dirY * rx - dirX * ry);
                const tY = invDet * (-planeY * rx + planeX * ry);   // depth
                if (tY <= 0.2) continue;

                const screenX = (W / 2) * (1 + tX / tY);
                const size = Math.min(H * 1.4, Math.abs(H / tY));
                const col = Math.floor(screenX / COL);
                if (col < 0 || col >= RES || tY >= s.zbuf[col]) continue;   // behind a wall

                const alpha = Math.max(0.35, 1 - tY / 12);
                ctx.globalAlpha = alpha;
                if (d.hurt > 0) {
                    ctx.save();
                    ctx.shadowColor = '#ff3b3b';
                    ctx.shadowBlur = 24;
                }
                ctx.font = `${size}px serif`;
                ctx.fillText(d.glyph, screenX, H / 2 + size * 0.06);
                if (d.hurt > 0) ctx.restore();
                ctx.globalAlpha = 1;
            }

            // Weapon + muzzle flash, anchored bottom-centre.
            if (s.muzzle > 0) {
                const r = s.muzzle * 1.4;
                const g = ctx.createRadialGradient(W / 2, H - 46, 0, W / 2, H - 46, r);
                g.addColorStop(0, 'rgba(255,240,180,0.95)');
                g.addColorStop(0.5, 'rgba(255,140,40,0.6)');
                g.addColorStop(1, 'rgba(255,80,20,0)');
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(W / 2, H - 46, r, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = '#15181f';
            ctx.fillRect(W / 2 - 34, H - 40, 68, 40);
            ctx.fillStyle = '#2b3040';
            ctx.fillRect(W / 2 - 10, H - 74, 20, 40);
            ctx.fillStyle = '#0a0c10';
            ctx.fillRect(W / 2 - 4, H - 78, 8, 10);

            // Crosshair.
            ctx.strokeStyle = 'rgba(255,90,90,0.85)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(W / 2 - 9, H / 2); ctx.lineTo(W / 2 - 3, H / 2);
            ctx.moveTo(W / 2 + 3, H / 2); ctx.lineTo(W / 2 + 9, H / 2);
            ctx.moveTo(W / 2, H / 2 - 9); ctx.lineTo(W / 2, H / 2 - 3);
            ctx.moveTo(W / 2, H / 2 + 3); ctx.lineTo(W / 2, H / 2 + 9);
            ctx.stroke();

            // Damage vignette.
            if (s.hurtFlash > 0) {
                ctx.fillStyle = `rgba(180,0,0,${(s.hurtFlash / 260) * 0.4})`;
                ctx.fillRect(0, 0, W, H);
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

    // Drag anywhere on the view to look left/right; a tap fires.
    const dragRef = useRef({ id: null, x: 0, moved: false });
    const onPointerDown = (e) => {
        if (phaseRef.current !== 'playing') return;
        dragRef.current = { id: e.pointerId, x: e.clientX, moved: false };
        e.currentTarget.setPointerCapture?.(e.pointerId);
    };
    const onPointerMove = (e) => {
        const drag = dragRef.current;
        if (drag.id !== e.pointerId) return;
        const dx = e.clientX - drag.x;
        if (Math.abs(dx) > 3) {
            const s = stateRef.current;
            if (s) s.angle += dx * 0.006;
            drag.x = e.clientX;
            drag.moved = true;
        }
    };
    const onPointerUp = (e) => {
        const drag = dragRef.current;
        if (drag.id !== e.pointerId) return;
        if (!drag.moved) fire();
        dragRef.current = { id: null, x: 0, moved: false };
    };

    const hold = (key, down) => {
        const s = stateRef.current;
        if (s) s.keys[key] = down;
    };

    return (
        <div>
            <div className="arc-hud mb-3">
                <span>SCORE {String(score).padStart(6, '0')}</span>
                <span style={{ color: 'var(--arc-red)' }}>
                    ♥ {String(Math.max(0, health)).padStart(3, '0')}
                </span>
                <span style={{ color: 'var(--arc-amber)' }}>AMMO {String(ammo).padStart(2, '0')}</span>
                <span style={{ color: 'var(--arc-magenta)' }}>WAVE {wave}</span>
                <span className="arc-hiscore">HI {String(Math.max(highScore, score)).padStart(6, '0')}</span>
            </div>

            <div className="arc-canvas-wrap arc-cab" style={{ '--arc-aspect': W / H }}>
                <canvas
                    ref={canvasRef}
                    width={W}
                    height={H}
                    style={{ touchAction: 'none', cursor: 'crosshair' }}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                />

                {phase !== 'playing' && (
                    <div className="arc-overlay">
                        {phase === 'ready' && (
                            <>
                                <p className="arc-overlay-title" style={{ color: 'var(--arc-red)' }}>DOOM</p>
                                <p className="arc-overlay-text">
                                    THE HALLS ARE CRAWLING.
                                    <br />
                                    W/S WALK · A/D STRAFE · TURN TO AIM · FIRE.
                                    <br />
                                    CLEAR EVERY DEMON TO SURVIVE THE WAVE.
                                </p>
                                <button type="button" className="arc-btn" onClick={startGame}>
                                    ▶ RIP AND TEAR
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
                                    YOU ARE DEAD
                                </p>
                                <p className="arc-overlay-text">
                                    FINAL SCORE {String(score).padStart(6, '0')}
                                    {score >= highScore && score > 0 ? ' — NEW RECORD!' : ''}
                                </p>
                                <button type="button" className="arc-btn" onClick={startGame}>
                                    ↻ FIGHT AGAIN
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Modern WASD pad on the left, turn + fire on the right. */}
            <div className="arc-fps-pad mt-4">
                <div className="arc-wasd" aria-label="Movement">
                    <button
                        type="button" className="arc-key arc-key--w" aria-label="Forward"
                        onPointerDown={(e) => { e.preventDefault(); hold('fwd', true); }}
                        onPointerUp={() => hold('fwd', false)} onPointerLeave={() => hold('fwd', false)} onPointerCancel={() => hold('fwd', false)}
                    >W</button>
                    <button
                        type="button" className="arc-key arc-key--a" aria-label="Strafe left"
                        onPointerDown={(e) => { e.preventDefault(); hold('left', true); }}
                        onPointerUp={() => hold('left', false)} onPointerLeave={() => hold('left', false)} onPointerCancel={() => hold('left', false)}
                    >A</button>
                    <button
                        type="button" className="arc-key arc-key--s" aria-label="Back"
                        onPointerDown={(e) => { e.preventDefault(); hold('back', true); }}
                        onPointerUp={() => hold('back', false)} onPointerLeave={() => hold('back', false)} onPointerCancel={() => hold('back', false)}
                    >S</button>
                    <button
                        type="button" className="arc-key arc-key--d" aria-label="Strafe right"
                        onPointerDown={(e) => { e.preventDefault(); hold('right', true); }}
                        onPointerUp={() => hold('right', false)} onPointerLeave={() => hold('right', false)} onPointerCancel={() => hold('right', false)}
                    >D</button>
                </div>
                <div className="arc-fps-actions">
                    <button
                        type="button" className="arc-key arc-key--turn" aria-label="Turn left"
                        onPointerDown={(e) => { e.preventDefault(); hold('turnL', true); }}
                        onPointerUp={() => hold('turnL', false)} onPointerLeave={() => hold('turnL', false)} onPointerCancel={() => hold('turnL', false)}
                    >◀</button>
                    <button
                        type="button" className="arc-key arc-key--fire" aria-label="Fire"
                        onPointerDown={(e) => { e.preventDefault(); fire(); }}
                    >✦</button>
                    <button
                        type="button" className="arc-key arc-key--turn" aria-label="Turn right"
                        onPointerDown={(e) => { e.preventDefault(); hold('turnR', true); }}
                        onPointerUp={() => hold('turnR', false)} onPointerLeave={() => hold('turnR', false)} onPointerCancel={() => hold('turnR', false)}
                    >▶</button>
                </div>
            </div>
        </div>
    );
}
