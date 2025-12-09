"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Confetti from 'react-confetti';
import { useTheme } from '../../context/ThemeContext';

const TicTacToe = ({ onBack }) => {
  const { theme } = useTheme();
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [mode, setMode] = useState(null); // 'pvp' or 'pva'
  const [difficulty, setDifficulty] = useState(null); // 'easy', 'medium', 'impossible'
  const [showConfetti, setShowConfetti] = useState(false);

  const findBestMove = (board) => {
    // Easy mode: Random valid move
    if (difficulty === 'easy') {
      const validMoves = [];
      for (let i = 0; i < 9; i++) {
        if (board[i] === null) validMoves.push(i);
      }
      return validMoves[Math.floor(Math.random() * validMoves.length)];
    }

    // Medium mode: 50% optimal, 50% random
    if (difficulty === 'medium' && Math.random() < 0.5) {
      const validMoves = [];
      for (let i = 0; i < 9; i++) {
        if (board[i] === null) validMoves.push(i);
      }
      return validMoves[Math.floor(Math.random() * validMoves.length)];
    }

    // Impossible mode: Always optimal using minimax
    let bestVal = -Infinity;
    let bestMoves = [];

    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = 'O';
        let moveVal = minimax(board, 0, false);
        board[i] = null;

        if (moveVal > bestVal) {
          bestMoves = [i];
          bestVal = moveVal;
        } else if (moveVal === bestVal) {
          bestMoves.push(i);
        }
      }
    }
    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
  };

  const minimax = (board, depth, isMax) => {
    let score = evaluate(board);

    if (score === 10) return score - depth;
    if (score === -10) return score + depth;
    if (board.every(Boolean)) return 0;

    if (isMax) {
      let best = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (board[i] === null) {
          board[i] = 'O';
          best = Math.max(best, minimax(board, depth + 1, !isMax));
          board[i] = null;
        }
      }
      return best;
    } else {
      let best = Infinity;
      for (let i = 0; i < 9; i++) {
        if (board[i] === null) {
          board[i] = 'X';
          best = Math.min(best, minimax(board, depth + 1, !isMax));
          board[i] = null;
        }
      }
      return best;
    }
  };

  const evaluate = (board) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        if (board[a] === 'O') return 10;
        if (board[a] === 'X') return -10;
      }
    }
    return 0;
  };

  useEffect(() => {
    if (mode === 'pva' && !isXNext && difficulty) {
      const bestMove = findBestMove(board);
      if (bestMove !== undefined && bestMove !== -1) {
        setTimeout(() => {
          handleClick(bestMove);
        }, 500);
      }
    }
  }, [isXNext, board, mode, difficulty]);

  const handleClick = (i) => {
    const newBoard = [...board];
    if (calculateWinner(newBoard) || newBoard[i]) {
      return;
    }
    newBoard[i] = isXNext ? 'X' : 'O';
    setBoard(newBoard);
    setIsXNext(!isXNext);
  };

  const renderSquare = (i) => {
    return (
      <motion.button
        className="w-20 h-20 border flex items-center justify-center text-3xl font-bold transition-colors"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-primary)',
          color: 'var(--text-primary)',
          boxShadow: 'var(--shadow-sm)',
        }}
        onClick={() => handleClick(i)}
        whileHover={{ 
          boxShadow: 'var(--shadow-md)',
          backgroundColor: 'var(--bg-hover)',
        }}
        whileTap={{ scale: 0.98 }}
      >
        <span style={{ color: board[i] === 'X' ? 'var(--accent-cyan)' : 'var(--accent-orange)' }}>
          {board[i]}
        </span>
      </motion.button>
    );
  };

  const winner = calculateWinner(board);
  let status;
  let statusColor = 'text-white';

  useEffect(() => {
    if (winner) {
      setShowConfetti(true);
      setTimeout(() => {
        setShowConfetti(false);
      }, 5000);
    }
  }, [winner]);

  if (winner) {
    status = `Winner: ${winner}`;
    statusColor = winner === 'X' ? 'text-cyan-400' : 'text-orange-400';
  } else if (board.every(Boolean)) {
    status = 'Draw!';
    statusColor = 'text-yellow-400';
  } else {
    status = `Next player: ${isXNext ? 'X' : 'O'}`;
  }

  const handleRestart = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
    setMode(null);
    setDifficulty(null);
  };

  if (!mode) {
    return (
      <div className="flex flex-col items-center gap-4">
        {showConfetti && <Confetti recycle={false} />}
        <h2 
          className="text-4xl font-bold mb-4"
          style={{ color: 'var(--text-primary)' }}
        >
          Choose Game Mode
        </h2>
          <motion.button
            whileHover={{ boxShadow: 'var(--shadow-lg)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setMode('pvp')}
            className="text-white px-8 py-4 rounded font-medium text-xl transition-all duration-200"
            style={{
              backgroundColor: 'var(--accent-orange)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            🎮 Player vs Player
          </motion.button>
          <motion.button
            whileHover={{ boxShadow: 'var(--shadow-lg)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setMode('pva')}
            className="text-white px-8 py-4 rounded font-medium text-xl transition-all duration-200"
            style={{
              backgroundColor: 'var(--accent-cyan)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            🤖 Player vs AI
          </motion.button>
        <motion.button
          whileHover={{ boxShadow: 'var(--shadow-md)' }}
          whileTap={{ scale: 0.98 }}
          onClick={onBack}
          className="text-white px-6 py-3 rounded font-medium text-base transition-all duration-200 mt-4"
          style={{
            backgroundColor: 'var(--bg-hover)',
            color: 'var(--text-primary)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          ← Back
        </motion.button>
      </div>
    );
  }

  if (mode === 'pva' && !difficulty) {
    return (
      <div className="flex flex-col items-center gap-4">
        <h2 
          className="text-4xl font-bold mb-4"
          style={{ color: 'var(--text-primary)' }}
        >
          Choose Difficulty
        </h2>
          <motion.button
            whileHover={{ boxShadow: 'var(--shadow-lg)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setDifficulty('easy')}
            className="text-white px-8 py-4 rounded font-medium text-xl transition-all duration-200 w-64"
            style={{
              backgroundColor: 'var(--status-success)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            😊 Easy
          </motion.button>
          <motion.button
            whileHover={{ boxShadow: 'var(--shadow-lg)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setDifficulty('medium')}
            className="text-white px-8 py-4 rounded font-medium text-xl transition-all duration-200 w-64"
            style={{
              backgroundColor: 'var(--status-warning)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            😐 Medium
          </motion.button>
          <motion.button
            whileHover={{ boxShadow: 'var(--shadow-lg)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setDifficulty('impossible')}
            className="text-white px-8 py-4 rounded font-medium text-xl transition-all duration-200 w-64 animate-pulse"
            style={{
              backgroundColor: 'var(--status-error)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            💀 IMPOSSIBLE 💀
          </motion.button>
        <motion.button
          whileHover={{ boxShadow: 'var(--shadow-md)' }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setMode(null)}
          className="text-white px-6 py-3 rounded font-medium text-base transition-all duration-200 mt-4"
          style={{
            backgroundColor: 'var(--bg-hover)',
            color: 'var(--text-primary)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          ← Back
        </motion.button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      {showConfetti && <Confetti recycle={false} />}
      <div className={`text-3xl font-bold mb-6 font-mono ${statusColor}`}>{status}</div>
      {difficulty && (
        <div 
          className="text-lg mb-4 font-mono"
          style={{ color: 'var(--text-tertiary)' }}
        >
          Difficulty: <span className={
            difficulty === 'easy' ? 'text-green-400' :
              difficulty === 'medium' ? 'text-yellow-400' :
                'text-red-400'
          }>{difficulty.toUpperCase()}</span>
        </div>
      )}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {Array(9).fill(null).map((_, i) => renderSquare(i))}
      </div>
      <motion.button
        whileHover={{ boxShadow: 'var(--shadow-lg)' }}
        whileTap={{ scale: 0.98 }}
        className="text-white px-6 py-3 rounded font-medium text-lg transition-all duration-200"
        style={{
          backgroundColor: 'var(--accent-orange)',
          boxShadow: 'var(--shadow-md)',
        }}
        onClick={handleRestart}
      >
        🔄 Restart
      </motion.button>
    </div>
  );
};

const calculateWinner = (squares) => {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a];
    }
  }
  return null;
};

export default TicTacToe;
