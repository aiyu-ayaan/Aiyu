"use client";

import dynamic from 'next/dynamic';

function loadingScreen() {
    return (
        <div className="arc-canvas-wrap" style={{ minHeight: '20rem' }}>
            <div className="arc-overlay">
                <p className="arc-overlay-title arc-blink">LOADING…</p>
            </div>
        </div>
    );
}

// Each cabinet is its own client-only chunk — visiting one game never
// downloads the other four.
const CABINETS = {
    'snake': dynamic(() => import('./cabinets/SnakeGame'), { ssr: false, loading: loadingScreen }),
    'tic-tac-toe': dynamic(() => import('./cabinets/TicTacToe'), { ssr: false, loading: loadingScreen }),
    'byte-runner': dynamic(() => import('./cabinets/ByteRunner'), { ssr: false, loading: loadingScreen }),
    'moto-rush': dynamic(() => import('./cabinets/MotoRush'), { ssr: false, loading: loadingScreen }),
    'breakout': dynamic(() => import('./cabinets/Breakout'), { ssr: false, loading: loadingScreen }),
    'invaders': dynamic(() => import('./cabinets/Invaders'), { ssr: false, loading: loadingScreen }),
    'tetris': dynamic(() => import('./cabinets/Tetris'), { ssr: false, loading: loadingScreen }),
    'pong': dynamic(() => import('./cabinets/Pong'), { ssr: false, loading: loadingScreen }),
    'flappy-byte': dynamic(() => import('./cabinets/FlappyByte'), { ssr: false, loading: loadingScreen }),
};

export default function GameLoader({ slug }) {
    const Cabinet = CABINETS[slug];
    if (!Cabinet) {
        return (
            <div className="arc-canvas-wrap" style={{ minHeight: '20rem' }}>
                <div className="arc-overlay">
                    <p className="arc-overlay-title">IN DEVELOPMENT</p>
                    <p className="arc-overlay-text">THIS CABINET IS STILL BEING WIRED UP. CHECK BACK SOON.</p>
                </div>
            </div>
        );
    }
    return <Cabinet />;
}
