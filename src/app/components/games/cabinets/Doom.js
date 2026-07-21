"use client";

import { useEffect, useRef, useState } from 'react';

/**
 * DOOM — the real 1993 id Software shareware (Episode 1: Knee-Deep in the Dead)
 * running in-browser on js-dos (DOSBox compiled to WebAssembly). The shareware
 * DOOM1.WAD and v1.9 executable are freely distributable and vendored under
 * /public/doom.
 *
 * The runtime is same-origin, so the on-screen WASD/turn/fire pad drives the
 * game through the js-dos CommandInterface (`ci.simulateKeyEvent`) — the same
 * hook js-dos uses for its own virtual keyboard. Desktop players can also click
 * the frame and use the real keyboard (arrows move/turn, Ctrl fire, Space use).
 */

// DOS keyCodes. DOOM's defaults: arrows move/turn, Ctrl fire, Space use, and
// Alt held turns turning into strafing.
const K = { UP: 38, DOWN: 40, LEFT: 37, RIGHT: 39, CTRL: 17, ALT: 18, SPACE: 32, ENTER: 13, ESC: 27 };

const JSDOS_SRC = '/doom/js-dos.js';
const WDOSBOX_URL = '/doom/wdosbox.js';   // js-dos derives wdosbox.wasm.js from this
const BUNDLE_URL = '/doom/doom.zip';

function loadJsDos() {
    if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
    if (window.Dos) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-jsdos]');
        if (existing) {
            existing.addEventListener('load', () => resolve());
            existing.addEventListener('error', () => reject(new Error('js-dos failed to load')));
            return;
        }
        const s = document.createElement('script');
        s.src = JSDOS_SRC;
        s.async = true;
        s.dataset.jsdos = '1';
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('js-dos failed to load'));
        document.body.appendChild(s);
    });
}

export default function Doom() {
    const canvasRef = useRef(null);
    const ciRef = useRef(null);
    const startedRef = useRef(false);
    const [phase, setPhase] = useState('ready'); // ready | loading | playing | error

    // Leaving the cabinet tears the emulator down so audio/timers stop.
    useEffect(() => {
        return () => {
            try { ciRef.current?.exit?.(); } catch { /* already gone */ }
            ciRef.current = null;
        };
    }, []);

    const start = async () => {
        if (startedRef.current) return;
        startedRef.current = true;
        setPhase('loading');
        try {
            await loadJsDos();
            const canvas = canvasRef.current;
            window.Dos(canvas, { wdosboxUrl: WDOSBOX_URL, autolock: false }).ready((fs, main) => {
                fs.extract(BUNDLE_URL).then(() => {
                    // -userconf keeps DOSBox from writing to a real home dir;
                    // the bundle already cd's us to the DOOM folder on mount.
                    Promise.resolve(main(['-c', 'cd DOOM', '-c', 'DOOM.EXE'])).then((ci) => {
                        ciRef.current = ci;
                        setPhase('playing');
                    });
                });
            });
        } catch {
            startedRef.current = false;
            setPhase('error');
        }
    };

    // Low-level key helpers into the emulator.
    const key = (code, down) => ciRef.current?.simulateKeyEvent?.(code, down);
    const tap = (code) => ciRef.current?.simulateKeyPress?.(code);
    // Strafing = Alt held while a turn key is down.
    const strafeDown = (dir) => { key(K.ALT, true); key(dir, true); };
    const strafeUp = (dir) => { key(dir, false); key(K.ALT, false); };

    return (
        <div>
            <div className="arc-hud mb-3">
                <span style={{ color: 'var(--arc-red)' }}>KNEE-DEEP IN THE DEAD</span>
                <span style={{ color: 'var(--arc-dim)' }}>SHAREWARE v1.9 · DOSBOX/WASM</span>
            </div>

            <div className="arc-canvas-wrap arc-cab" style={{ '--arc-aspect': 1.6 }}>
                <canvas ref={canvasRef} width={640} height={400} className="doom-canvas" />

                {phase !== 'playing' && (
                    <div className="arc-overlay">
                        {phase === 'ready' && (
                            <>
                                <p className="arc-overlay-title" style={{ color: 'var(--arc-red)' }}>DOOM</p>
                                <p className="arc-overlay-text">
                                    THE REAL 1993 SHAREWARE, EMULATED IN YOUR BROWSER.
                                    <br />
                                    W/S MOVE · A/D STRAFE · TURN · FIRE · SPACE OPENS DOORS.
                                    <br />
                                    AT THE TITLE, HIT ⏎ TO PICK NEW GAME.
                                </p>
                                <button type="button" className="arc-btn" onClick={start}>
                                    ▶ INSERT COIN
                                </button>
                            </>
                        )}
                        {phase === 'loading' && (
                            <p className="arc-overlay-title arc-blink">LOADING DOS…</p>
                        )}
                        {phase === 'error' && (
                            <>
                                <p className="arc-overlay-title" style={{ color: 'var(--arc-red)' }}>
                                    DISK ERROR
                                </p>
                                <p className="arc-overlay-text">COULD NOT BOOT THE EMULATOR. RELOAD AND TRY AGAIN.</p>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Modern WASD pad — drives the emulator via js-dos key events. */}
            <div className="arc-fps-pad mt-4">
                <div className="arc-wasd" aria-label="Movement">
                    <button
                        type="button" className="arc-key arc-key--w" aria-label="Forward"
                        onPointerDown={(e) => { e.preventDefault(); key(K.UP, true); }}
                        onPointerUp={() => key(K.UP, false)} onPointerLeave={() => key(K.UP, false)} onPointerCancel={() => key(K.UP, false)}
                    >W</button>
                    <button
                        type="button" className="arc-key arc-key--a" aria-label="Strafe left"
                        onPointerDown={(e) => { e.preventDefault(); strafeDown(K.LEFT); }}
                        onPointerUp={() => strafeUp(K.LEFT)} onPointerLeave={() => strafeUp(K.LEFT)} onPointerCancel={() => strafeUp(K.LEFT)}
                    >A</button>
                    <button
                        type="button" className="arc-key arc-key--s" aria-label="Back"
                        onPointerDown={(e) => { e.preventDefault(); key(K.DOWN, true); }}
                        onPointerUp={() => key(K.DOWN, false)} onPointerLeave={() => key(K.DOWN, false)} onPointerCancel={() => key(K.DOWN, false)}
                    >S</button>
                    <button
                        type="button" className="arc-key arc-key--d" aria-label="Strafe right"
                        onPointerDown={(e) => { e.preventDefault(); strafeDown(K.RIGHT); }}
                        onPointerUp={() => strafeUp(K.RIGHT)} onPointerLeave={() => strafeUp(K.RIGHT)} onPointerCancel={() => strafeUp(K.RIGHT)}
                    >D</button>
                </div>

                <div className="arc-fps-right">
                    <div className="arc-fps-actions">
                        <button
                            type="button" className="arc-key arc-key--turn" aria-label="Turn left"
                            onPointerDown={(e) => { e.preventDefault(); key(K.LEFT, true); }}
                            onPointerUp={() => key(K.LEFT, false)} onPointerLeave={() => key(K.LEFT, false)} onPointerCancel={() => key(K.LEFT, false)}
                        >◀</button>
                        <button
                            type="button" className="arc-key arc-key--fire" aria-label="Fire"
                            onPointerDown={(e) => { e.preventDefault(); key(K.CTRL, true); }}
                            onPointerUp={() => key(K.CTRL, false)} onPointerLeave={() => key(K.CTRL, false)} onPointerCancel={() => key(K.CTRL, false)}
                        >✦</button>
                        <button
                            type="button" className="arc-key arc-key--turn" aria-label="Turn right"
                            onPointerDown={(e) => { e.preventDefault(); key(K.RIGHT, true); }}
                            onPointerUp={() => key(K.RIGHT, false)} onPointerLeave={() => key(K.RIGHT, false)} onPointerCancel={() => key(K.RIGHT, false)}
                        >▶</button>
                    </div>
                    <div className="arc-fps-extra">
                        <button type="button" className="arc-key arc-key--sm" aria-label="Use / open door" onPointerDown={(e) => { e.preventDefault(); tap(K.SPACE); }}>USE</button>
                        <button type="button" className="arc-key arc-key--sm" aria-label="Menu select" onPointerDown={(e) => { e.preventDefault(); tap(K.ENTER); }}>⏎</button>
                        <button type="button" className="arc-key arc-key--sm" aria-label="Menu / back" onPointerDown={(e) => { e.preventDefault(); tap(K.ESC); }}>ESC</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
