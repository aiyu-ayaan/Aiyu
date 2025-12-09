"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import TypewriterEffect from '../shared/TypewriterEffect';
import SnakeGame from './SnakeGame';
import TicTacToe from './TicTacToe';
import { useTheme } from '../../context/ThemeContext';

const GamePortfolio = ({ data, onUnlock = () => { } }) => {
  const { theme } = useTheme();
  const [selectedGame, setSelectedGame] = useState(null);
  const { name, homeRoles, githubLink, codeSnippets } = data || {};

  const renderGame = () => {
    switch (selectedGame) {
      case 'snake':
        return <SnakeGame onUnlock={onUnlock} onBack={() => setSelectedGame(null)} />;
      case 'tictactoe':
        return <TicTacToe onBack={() => setSelectedGame(null)} />;
      default:
        return (
          <div className="flex flex-col items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedGame('snake')}
              className="text-white px-6 py-3 rounded-lg font-mono text-lg transition-colors"
              style={{
                backgroundColor: theme === 'dark' ? '#f97316' : '#ea580c',
              }}
            >
              Play Snake
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedGame('tictactoe')}
              className="text-white px-6 py-3 rounded-lg font-mono text-lg transition-colors"
              style={{
                backgroundColor: theme === 'dark' ? '#22d3ee' : '#0891b2',
              }}
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
      className="min-h-screen flex flex-col lg:flex-row items-center justify-center p-4 lg:p-8 relative transition-colors duration-300"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div
          className="absolute top-10 left-10 w-72 h-72 rounded-full mix-blend-multiply filter blur-xl animate-blob"
          style={{ backgroundColor: 'var(--accent-cyan)' }}
        ></div>
        <div
          className="absolute top-10 right-10 w-72 h-72 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"
          style={{ backgroundColor: 'var(--accent-orange)' }}
        ></div>
        <div
          className="absolute bottom-10 left-1/2 w-72 h-72 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"
          style={{ backgroundColor: 'var(--accent-pink)' }}
        ></div>
      </div>

      <div className="w-full max-w-6xl flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-8 relative z-10">
        <motion.div
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex-1 text-center lg:text-left order-1 max-w-lg"
          style={{ color: 'var(--text-primary)' }}
        >
          <motion.h1
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 line-hover-effect"
            style={{ color: 'var(--text-bright)' }}
          >
            {name}
          </motion.h1>
          <TypewriterEffect roles={homeRoles || []} />
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="space-y-2 font-mono text-xs sm:text-sm text-left"
          >
            {codeSnippets && codeSnippets.map((snippet, index) => (
              <p key={index} style={{ color: 'var(--text-tertiary)' }}>{`// ${snippet}`}</p>
            ))}
            <p className="break-all">
              <span style={{ color: 'var(--syntax-keyword)' }}>const</span>{' '}
              <span style={{ color: 'var(--syntax-variable)' }}>githubLink</span>{' '}
              <span style={{ color: 'var(--text-bright)' }}>=</span>
              <br className="sm:hidden" />
              <span className="sm:ml-1" style={{ color: 'var(--syntax-string)' }}>{`"${githubLink}"`}</span>
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