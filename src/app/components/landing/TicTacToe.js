"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';

const TicTacToe = () => {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);

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
        className="w-16 h-16 bg-gray-800 border border-gray-700 flex items-center justify-center text-2xl font-bold"
        onClick={() => handleClick(i)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {board[i]}
      </motion.button>
    );
  };

  const winner = calculateWinner(board);
  let status;
  if (winner) {
    status = `Winner: ${winner}`;
  } else if (board.every(Boolean)) {
    status = 'Draw!';
  } else {
    status = `Next player: ${isXNext ? 'X' : 'O'}`;
  }

  const handleRestart = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
  };

  return (
    <div className="flex flex-col items-center">
      <div className="text-2xl font-bold mb-4">{status}</div>
      <div className="grid grid-cols-3 gap-1">
        {Array(9).fill(null).map((_, i) => renderSquare(i))}
      </div>
      <button
        className="mt-4 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded"
        onClick={handleRestart}
      >
        Restart
      </button>
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
