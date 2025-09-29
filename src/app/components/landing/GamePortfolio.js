"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { name, homeRoles, githubLink, codeSnippets } from '../../data/homeScreenData';
import TypewriterEffect from '../shared/TypewriterEffect';
import SnakeGame from './SnakeGame';
import TicTacToe from './TicTacToe';

const GamePortfolio = ({ onUnlock = () => {} }) => {
  const [selectedGame, setSelectedGame] = useState(null);

  const renderGame = () => {
    switch (selectedGame) {
      case 'snake':
        return <SnakeGame onUnlock={onUnlock} />;
      case 'tictactoe':
        return <TicTacToe />;
      default:
        return (
          <div className="flex flex-col items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedGame('snake')}
              className="bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white px-6 py-3 rounded-lg font-mono text-lg transition-colors"
            >
              Play Snake
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedGame('tictactoe')}
              className="bg-cyan-500 hover:bg-cyan-600 active:bg-cyan-700 text-white px-6 py-3 rounded-lg font-mono text-lg transition-colors"
            >
              Play Tic-Tac-Toe
            </motion.button>
          </div>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="min-h-screen bg-gray-900 flex flex-col lg:flex-row items-center justify-center p-4 lg:p-8"
    >
      <div className="w-full max-w-6xl flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-8">
        <motion.div
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex-1 text-white text-center lg:text-left order-1 max-w-lg"
        >
          <motion.h1
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 line-hover-effect"
          >
            {name}
          </motion.h1>
          <TypewriterEffect roles={homeRoles} />
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="space-y-2 font-mono text-xs sm:text-sm text-left"
          >
            {codeSnippets.map((snippet, index) => (
              <p key={index} className="text-gray-400">{`// ${snippet}`}</p>
            ))}
            <p className="break-all">
              <span className="text-blue-400">const</span>{' '}
              <span className="text-cyan-400">githubLink</span>{' '}
              <span className="text-white">=</span>
              <br className="sm:hidden" />
              <span className="sm:ml-1 text-orange-400">{`"${githubLink}"`}</span>
            </p>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ x: 50, opacity: 0, rotateY: 15 }}
          animate={{ x: 0, opacity: 1, rotateY: 0 }}
          transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
          className="flex-shrink-0 order-2"
        >
          {renderGame()}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default GamePortfolio;
