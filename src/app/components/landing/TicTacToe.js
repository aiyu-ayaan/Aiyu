"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const TicTacToe = ({ onBack }) => {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [mode, setMode] = useState(null); // 'pvp' or 'pva'
  const [difficulty, setDifficulty] = useState(null); // 'easy', 'medium', 'impossible'

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
        className="w-20 h-20 bg-gray-800 border-2 border-gray-700 flex items-center justify-center text-3xl font-bold text-white hover:bg-gray-700 transition-colors"
        onClick={() => handleClick(i)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className={board[i] === 'X' ? 'text-cyan-400' : 'text-orange-400'}>
          {board[i]}
        </span>
      </motion.button>
    );
  };

  const winner = calculateWinner(board);
  let status;
  let statusColor = 'text-white';

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
      <div className="bg-gray-900 p-8 rounded-lg">
        <div className="flex flex-col items-center gap-4">
          <h2 className="text-4xl font-bold text-white mb-4 font-mono">Choose Game Mode</h2>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setMode('pvp')}
            className="bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white px-8 py-4 rounded-lg font-mono text-xl transition-colors shadow-lg"
          >
            🎮 Player vs Player
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setMode('pva')}
            className="bg-cyan-500 hover:bg-cyan-600 active:bg-cyan-700 text-white px-8 py-4 rounded-lg font-mono text-xl transition-colors shadow-lg"
          >
            🤖 Player vs AI
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-mono text-base transition-colors mt-4"
          >
            ← Back
          </motion.button>
        </div>
      </div>
    );
  }

  if (mode === 'pva' && !difficulty) {
    return (
      <div className="bg-gray-900 p-8 rounded-lg">
        <div className="flex flex-col items-center gap-4">
          <h2 className="text-4xl font-bold text-white mb-4 font-mono">Choose Difficulty</h2>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setDifficulty('easy')}
            className="bg-green-500 hover:bg-green-600 active:bg-green-700 text-white px-8 py-4 rounded-lg font-mono text-xl transition-colors w-64 shadow-lg"
          >
            😊 Easy
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setDifficulty('medium')}
            className="bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700 text-white px-8 py-4 rounded-lg font-mono text-xl transition-colors w-64 shadow-lg"
          >
            😐 Medium
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setDifficulty('impossible')}
            className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-8 py-4 rounded-lg font-mono text-xl transition-colors w-64 shadow-lg animate-pulse"
          >
            💀 IMPOSSIBLE 💀
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setMode(null)}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-mono text-base transition-colors mt-4"
          >
            ← Back
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 p-8 rounded-lg">
      <div className="flex flex-col items-center">
        <div className={`text-3xl font-bold mb-6 font-mono ${statusColor}`}>{status}</div>
        {difficulty && (
          <div className="text-lg text-gray-400 mb-4 font-mono">
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
        <button
          className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-mono text-lg transition-colors shadow-lg"
          onClick={handleRestart}
        >
          🔄 Restart
        </button>
      </div>
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