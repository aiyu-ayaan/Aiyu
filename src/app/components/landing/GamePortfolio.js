"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import TypewriterEffect from '../shared/TypewriterEffect';
import { useTheme } from '../../context/ThemeContext';

const SnakeGame = dynamic(() => import('./SnakeGame'), {
  loading: () => (
    <div className="w-[320px] h-[320px] rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-elevated)] flex items-center justify-center text-sm text-[var(--text-secondary)]">
      Loading snake...
    </div>
  ),
});

const TicTacToe = dynamic(() => import('./TicTacToe'), {
  loading: () => (
    <div className="w-[320px] h-[320px] rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-elevated)] flex items-center justify-center text-sm text-[var(--text-secondary)]">
      Loading game...
    </div>
  ),
});

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
          <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedGame('snake')}
              className="rounded-2xl border px-6 py-5 text-left transition-colors"
              style={{
                borderColor: 'var(--hairline)',
                backgroundColor: theme === 'dark'
                  ? 'color-mix(in srgb, var(--bg-elevated) 72%, transparent)'
                  : 'color-mix(in srgb, var(--bg-elevated) 90%, white)',
                color: 'var(--text-primary)',
              }}
            >
              <span className="block text-sm font-semibold" style={{ color: 'var(--text-bright)' }}>Play Snake</span>
              <span className="mt-1 block text-xs" style={{ color: 'var(--text-tertiary)' }}>Unlock the portfolio interaction.</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedGame('tictactoe')}
              className="rounded-2xl border px-6 py-5 text-left transition-colors"
              style={{
                borderColor: 'var(--hairline)',
                backgroundColor: theme === 'dark'
                  ? 'color-mix(in srgb, var(--bg-elevated) 72%, transparent)'
                  : 'color-mix(in srgb, var(--bg-elevated) 90%, white)',
                color: 'var(--text-primary)',
              }}
            >
              <span className="block text-sm font-semibold" style={{ color: 'var(--text-bright)' }}>Play Tic-Tac-Toe</span>
              <span className="mt-1 block text-xs" style={{ color: 'var(--text-tertiary)' }}>A focused side quest in the hero.</span>
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
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 pb-14 pt-24 transition-colors duration-300 sm:px-6 lg:px-8"
      style={{ backgroundColor: 'transparent' }}
    >
      <div
        className="pointer-events-none absolute left-1/2 top-24 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--text-bright) 11%, var(--accent-cyan)), transparent 70%)', opacity: 0.32 }}
      />

      <div className="relative z-10 grid w-full max-w-[95%] items-center gap-12 lg:max-w-[80%] lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.68fr)] xl:gap-20">
        <motion.div
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="order-1 mx-auto max-w-4xl text-center lg:mx-0 lg:text-left"
        >
          <p className="eyebrow mb-5">Portfolio</p>
          <motion.h1
            className="headline-hero mb-6"
            style={{ color: 'var(--text-bright)' }}
          >
            {name || "Ayaan Ansari"}
          </motion.h1>

          <div className="mb-10">
            <TypewriterEffect roles={homeRoles || []} />
          </div>

          <motion.div
            className="glass-panel group relative overflow-hidden p-5 sm:p-6 lg:max-w-2xl"
            style={{
              transformStyle: 'preserve-3d',
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
          className="order-2 w-full"
        >
          <div className="glass-panel relative mx-auto w-full max-w-[28rem] overflow-hidden p-4 sm:p-5">
            <div className="mb-5 flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--hairline)' }}>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>Interactive Module</p>
                <p className="mt-1 text-lg font-semibold" style={{ color: 'var(--text-bright)' }}>Choose a game</p>
              </div>
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--status-success)' }} />
            </div>
            {renderGame()}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default GamePortfolio;
