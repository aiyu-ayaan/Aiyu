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
      style={{ backgroundColor: 'transparent' }}
    >
      <div className="w-full max-w-7xl flex flex-col lg:flex-row items-center justify-between gap-12 relative z-10">
        <motion.div
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex-1 text-center lg:text-left order-1 max-w-lg relative"
        >
          <motion.h1
            className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 tracking-tight"
            style={{ color: 'var(--text-bright)' }}
          >
            {name || "Ayaan Ansari"}
          </motion.h1>

          <div className="mb-8">
            <TypewriterEffect roles={homeRoles || []} />
          </div>

          <motion.div
            className="p-6 rounded-xl border backdrop-blur-sm relative overflow-hidden group"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-secondary)'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

            <div className="space-y-2 font-mono text-xs sm:text-sm text-left">
              {codeSnippets && codeSnippets.map((snippet, index) => (
                <p key={index} style={{ color: 'var(--text-secondary)' }}>{`// ${snippet}`}</p>
              ))}
              <p className="break-all">
                <span style={{ color: 'var(--syntax-keyword)' }}>const</span>{' '}
                <span style={{ color: 'var(--syntax-variable)' }}>githubLink</span>{' '}
                <span style={{ color: 'var(--text-bright)' }}>=</span>
                <br className="sm:hidden" />
                <a
                  href={githubLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sm:ml-1 hover:underline transition-all"
                  style={{ color: 'var(--syntax-string)' }}
                >
                  &quot;{githubLink}&quot;
                </a>
              </p>

              {/* Dynamic Data Info */}
              <div className="mt-4 pt-4 border-t border-dashed" style={{ borderColor: 'var(--border-secondary)' }}>
                <p className="flex justify-between text-xs font-mono mb-1" style={{ color: 'var(--text-tertiary)' }}>
                  <span>STATUS</span>
                  <span style={{ color: 'var(--accent-cyan)' }}>{data?.resumeStatus || 'ONLINE'}</span>
                </p>
                <p className="flex justify-between text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
                  <span>MODE</span>
                  <span style={{ color: 'var(--accent-orange)' }}>{data?.resumeMode || 'DEV_01'}</span>
                </p>
              </div>
            </div>
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