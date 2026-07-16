"use client";

import { useEffect, useRef, useState } from 'react';
import { useGameAudio } from '../audio/useGameAudio';

const LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
];

function getWinner(board) {
    for (const [a, b, c] of LINES) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return { player: board[a], line: [a, b, c] };
        }
    }
    return null;
}

function isFull(board) {
    return board.every(Boolean);
}

// Classic minimax with depth preference: win fast, lose slow. Board is tiny,
// so no memoization or alpha-beta needed.
function minimax(board, current, cpu, depth) {
    const winner = getWinner(board);
    if (winner) return winner.player === cpu ? 10 - depth : depth - 10;
    if (isFull(board)) return 0;

    const scores = [];
    for (let i = 0; i < 9; i++) {
        if (board[i]) continue;
        board[i] = current;
        scores.push(minimax(board, current === 'X' ? 'O' : 'X', cpu, depth + 1));
        board[i] = null;
    }
    return current === cpu ? Math.max(...scores) : Math.min(...scores);
}

function bestMove(board, cpu) {
    let best = -Infinity;
    let move = -1;
    for (let i = 0; i < 9; i++) {
        if (board[i]) continue;
        board[i] = cpu;
        const score = minimax(board, cpu === 'X' ? 'O' : 'X', cpu, 0);
        board[i] = null;
        if (score > best) {
            best = score;
            move = i;
        }
    }
    return move;
}

const CPU_MARK = 'O';
const CPU_THINK_MS = 450;

export default function TicTacToe() {
    const [board, setBoard] = useState(Array(9).fill(null));
    const [turn, setTurn] = useState('X');
    const [mode, setMode] = useState('cpu'); // cpu | 2p
    const [tally, setTally] = useState({ X: 0, O: 0, draw: 0 });
    const [phase, setPhase] = useState('playing');
    const phaseRef = useRef('playing');
    const setPhaseBoth = (next) => {
        phaseRef.current = next;
        setPhase(next);
    };
    const audio = useGameAudio('tic-tac-toe', phase);
    const cpuTimer = useRef(null);

    useEffect(() => {
        const onVisibility = () => {
            if (document.hidden && phaseRef.current === 'playing') {
                setPhaseBoth('paused');
            } else if (!document.hidden && phaseRef.current === 'paused') {
                setPhaseBoth('playing');
            }
        };
        document.addEventListener('visibilitychange', onVisibility);
        return () => document.removeEventListener('visibilitychange', onVisibility);
    }, []);

    const winner = getWinner(board);
    const draw = !winner && isFull(board);
    const gameOver = Boolean(winner) || draw;
    const cpuThinking = mode === 'cpu' && turn === CPU_MARK && !gameOver;

    // Record result once per finished game.
    const recordedRef = useRef(false);
    useEffect(() => {
        if (!gameOver) {
            recordedRef.current = false;
            return;
        }
        if (recordedRef.current) return;
        recordedRef.current = true;

        if (winner) {
            if (mode === 'cpu') {
                if (winner.player === 'X') {
                    audio.sfx('win');
                } else {
                    audio.sfx('lose');
                }
            } else {
                audio.sfx('win');
            }
        } else if (draw) {
            audio.sfx('draw');
        }

        setTally((t) => {
            if (winner) return { ...t, [winner.player]: t[winner.player] + 1 };
            return { ...t, draw: t.draw + 1 };
        });
    }, [gameOver, winner, draw, mode]);

    // CPU move with a small "thinking" delay for arcade feel.
    useEffect(() => {
        if (!cpuThinking) return;
        cpuTimer.current = setTimeout(() => {
            setBoard((b) => {
                if (getWinner(b) || isFull(b)) return b;
                const move = bestMove([...b], CPU_MARK);
                if (move < 0) return b;
                const next = [...b];
                next[move] = CPU_MARK;
                return next;
            });
            setTurn('X');
            audio.sfx('blip');
        }, CPU_THINK_MS);
        return () => clearTimeout(cpuTimer.current);
    }, [cpuThinking, board]);

    const play = (i) => {
        if (board[i] || gameOver || cpuThinking) return;
        const next = [...board];
        next[i] = turn;
        setBoard(next);
        setTurn(turn === 'X' ? 'O' : 'X');
        audio.sfx('blip');
    };

    const newRound = () => {
        clearTimeout(cpuTimer.current);
        setBoard(Array(9).fill(null));
        setTurn('X');
        audio.sfx('coin');
    };

    const switchMode = (nextMode) => {
        setMode(nextMode);
        setTally({ X: 0, O: 0, draw: 0 });
        clearTimeout(cpuTimer.current);
        setBoard(Array(9).fill(null));
        setTurn('X');
        audio.sfx('coin');
    };

    const status = winner
        ? `${winner.player} WINS!`
        : draw
            ? 'DRAW GAME'
            : cpuThinking
                ? 'CPU THINKING…'
                : `${turn} TO MOVE`;

    const markColor = (mark) => (mark === 'X' ? 'var(--arc-cyan)' : 'var(--arc-magenta)');

    return (
        <div className="mx-auto" style={{ maxWidth: '26rem' }}>
            <div className="arc-hud mb-3">
                <span style={{ color: 'var(--arc-cyan)' }}>X {tally.X}</span>
                <span style={{ color: 'var(--arc-dim)' }}>DRAW {tally.draw}</span>
                <span style={{ color: 'var(--arc-magenta)' }}>O {tally.O}</span>
            </div>

            <div className="mb-4 flex justify-center gap-3">
                <button
                    type="button"
                    className={`arc-btn ${mode === 'cpu' ? '' : 'arc-btn--ghost'}`}
                    onClick={() => switchMode('cpu')}
                >
                    VS CPU
                </button>
                <button
                    type="button"
                    className={`arc-btn ${mode === '2p' ? '' : 'arc-btn--ghost'}`}
                    onClick={() => switchMode('2p')}
                >
                    2 PLAYERS
                </button>
            </div>

            <div
                className="pixel-frame grid grid-cols-3 gap-2 p-3"
                role="grid"
                aria-label="Tic-tac-toe board"
            >
                {board.map((cell, i) => {
                    const inWinningLine = winner?.line.includes(i);
                    return (
                        <button
                            key={i}
                            type="button"
                            role="gridcell"
                            aria-label={cell ? `Cell ${i + 1}: ${cell}` : `Cell ${i + 1}: empty`}
                            onClick={() => play(i)}
                            disabled={Boolean(cell) || gameOver || cpuThinking}
                            className="flex items-center justify-center font-bold"
                            style={{
                                aspectRatio: '1',
                                fontSize: '2rem',
                                fontFamily: 'inherit',
                                color: markColor(cell),
                                textShadow: cell ? `0 0 14px ${markColor(cell)}` : 'none',
                                background: inWinningLine
                                    ? 'rgba(51, 255, 102, 0.18)'
                                    : 'rgba(46, 230, 255, 0.04)',
                                border: `2px solid ${inWinningLine ? 'var(--arc-green)' : 'rgba(125, 122, 153, 0.3)'}`,
                                cursor: cell || gameOver || cpuThinking ? 'default' : 'pointer',
                            }}
                        >
                            {cell}
                        </button>
                    );
                })}
            </div>

            <p
                className="mt-4 text-center"
                style={{
                    fontSize: '0.7rem',
                    letterSpacing: '0.12em',
                    color: winner ? markColor(winner.player) : 'var(--arc-green)',
                    textShadow: '0 0 10px currentColor',
                }}
                aria-live="polite"
            >
                {status}
            </p>

            {gameOver && (
                <p className="mt-4 text-center">
                    <button type="button" className="arc-btn" onClick={newRound}>
                        ↻ NEW ROUND
                    </button>
                </p>
            )}

            {mode === 'cpu' && (
                <p className="arc-subtitle mt-4 text-center">
                    THE CPU PLAYS PERFECT MINIMAX. A DRAW IS A MORAL VICTORY.
                </p>
            )}
        </div>
    );
}
