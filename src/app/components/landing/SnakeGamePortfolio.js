
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import { homeRoles as roles, githubLink } from '../../data/siteData';
import TypewriterEffect from '../shared/TypewriterEffect';

const BOARD_SIZE = 20;

const generateFood = () => {
  return {
    x: Math.floor(Math.random() * BOARD_SIZE),
    y: Math.floor(Math.random() * BOARD_SIZE)
  };
};

const SnakeGamePortfolio = ({ onUnlock = () => {} }) => {
  const [gameState, setGameState] = useState('menu');
  const [snake, setSnake] = useState([{ x: 10, y: 10 }]);
  const [food, setFood] = useState(generateFood());
  const [direction, setDirection] = useState({ x: 0, y: 1 });
  const [score, setScore] = useState(0);
  const [gameSpeed, setGameSpeed] = useState(150);
  const [showConfetti, setShowConfetti] = useState(false);

  const resetGame = () => {
    setSnake([{ x: 10, y: 10 }]);
    setFood(generateFood());
    setDirection({ x: 0, y: 1 });
    setScore(0);
    setGameSpeed(150);
    setGameState('menu');
  };

  const startGame = () => {
    resetGame();
    setGameState('playing');
  };


  useEffect(() => {
    if (score === 10) {
      setGameState('win');
      setShowConfetti(true);
      onUnlock();
      setTimeout(() => {
        setShowConfetti(false);
      }, 15000);
    }
  }, [score, onUnlock]);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const gameLoop = setInterval(() => {
      setSnake(currentSnake => {
        const newSnake = [...currentSnake];
        const head = { ...newSnake[0] };

        head.x += direction.x;
        head.y += direction.y;

        if (head.x < 0 || head.x >= BOARD_SIZE || head.y < 0 || head.y >= BOARD_SIZE) {
          setGameState('gameOver');
          return currentSnake;
        }

        if (newSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
          setGameState('gameOver');
          return currentSnake;
        }

        newSnake.unshift(head);

        if (head.x === food.x && head.y === food.y) {
          setScore(prev => prev + 1);
          setFood(generateFood());
          setGameSpeed(prev => Math.max(80, prev - 2));
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    }, gameSpeed);

    return () => clearInterval(gameLoop);
  }, [direction, food, gameSpeed, gameState]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (gameState === 'playing') {
        switch (e.key.toLowerCase()) {
          case 'arrowup':
          case 'w':
            e.preventDefault();
            setDirection(prev => prev.y !== 1 ? { x: 0, y: -1 } : prev);
            break;
          case 'arrowdown':
          case 's':
            e.preventDefault();
            setDirection(prev => prev.y !== -1 ? { x: 0, y: 1 } : prev);
            break;
          case 'arrowleft':
          case 'a':
            e.preventDefault();
            setDirection(prev => prev.x !== 1 ? { x: -1, y: 0 } : prev);
            break;
          case 'arrowright':
          case 'd':
            e.preventDefault();
            setDirection(prev => prev.x !== -1 ? { x: 1, y: 0 } : prev);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState]);

  const handleDirectionChange = (newDirection) => {
    if (gameState === 'playing') {
      setDirection(prev => {
        if (newDirection.x === 0 && newDirection.y === -1 && prev.y !== 1) return newDirection;
        if (newDirection.x === 0 && newDirection.y === 1 && prev.y !== -1) return newDirection;
        if (newDirection.x === -1 && newDirection.y === 0 && prev.x !== 1) return newDirection;
        if (newDirection.x === 1 && newDirection.y === 0 && prev.x !== -1) return newDirection;
        return prev;
      });
    }
  };

  const renderGameBoard = () => {
    const board = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        let cellType = 'empty';

        if (snake.some(segment => segment.x === x && segment.y === y)) {
          cellType = snake[0].x === x && snake[0].y === y ? 'head' : 'body';
        } else if (food.x === x && food.y === y) {
          cellType = 'food';
        }

        board.push(
          <div
            key={`${x}-${y}`}
            className={`aspect-square ${cellType === 'head' ? 'bg-cyan-400' :
              cellType === 'body' ? 'bg-cyan-500' :
                cellType === 'food' ? 'bg-green-400' :
                  'bg-gray-800'
              }`}
          />
        );
      }
    }
    return board;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="min-h-screen bg-gray-900 flex flex-col lg:flex-row items-center justify-center p-4 lg:p-8"
    >
      {showConfetti && <Confetti recycle={false} />}
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
            Ayaan Ansari
          </motion.h1>
          <TypewriterEffect roles={roles} />
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="space-y-2 font-mono text-xs sm:text-sm text-left"
          >
            <p className="text-gray-400">{`// Hi all. I am`}</p>
            <p className="text-gray-400">{`// complete the game to continue`}</p>
            <p className="text-gray-400">{`// find my profile on Github:`}</p>
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
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
            className="relative bg-gray-800 rounded-[2.5rem] p-3 shadow-2xl w-72 sm:w-80"
          >
            <motion.div
              initial={{ backgroundColor: "#000000" }}
              animate={{ backgroundColor: "#000000" }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="bg-black rounded-[2rem] p-4 relative"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 1.0 }}
                className="flex justify-between items-center mb-4 text-white text-xs"
              >
                <div className="flex items-center gap-1">
                  <div className="w-1 h-1 bg-white rounded-full"></div>
                  <div className="w-1 h-1 bg-white rounded-full"></div>
                  <div className="w-1 h-1 bg-white rounded-full"></div>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-2 border border-white rounded-sm">
                    <div className="w-2 h-1 bg-white rounded-sm m-0.5"></div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, delay: 1.2 }}
                className="bg-teal-500/30 rounded-lg shadow-2xl backdrop-blur-md"
              >
                <div className="bg-gray-900 rounded-lg p-4">
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.6, delay: 1.4 }}
                    className="relative mb-4"
                  >
                    <div className="grid grid-cols-20 gap-0 bg-gray-800 p-2 aspect-square w-full max-w-64 mx-auto">
                      {renderGameBoard()}
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 1.6 }}
                    className="mb-4"
                  >
                    <p className="text-gray-400 text-xs mb-2 text-center">{`// tap arrows to play`}</p>
                    <div className="grid grid-cols-3 gap-2 max-w-32 mx-auto">
                      <div></div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDirectionChange({ x: 0, y: -1 })}
                        className="w-10 h-10 bg-gray-700 rounded border border-gray-600 flex items-center justify-center text-white text-sm active:bg-gray-600 transition-colors"
                      >
                        ↑
                      </motion.button>
                      <div></div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDirectionChange({ x: -1, y: 0 })}
                        className="w-10 h-10 bg-gray-700 rounded border border-gray-600 flex items-center justify-center text-white text-sm active:bg-gray-600 transition-colors"
                      >
                        ←
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDirectionChange({ x: 0, y: 1 })}
                        className="w-10 h-10 bg-gray-700 rounded border border-gray-600 flex items-center justify-center text-white text-sm active:bg-gray-600 transition-colors"
                      >
                        ↓
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDirectionChange({ x: 1, y: 0 })}
                        className="w-10 h-10 bg-gray-700 rounded border border-gray-600 flex items-center justify-center text-white text-sm active:bg-gray-600 transition-colors"
                      >
                        →
                      </motion.button>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 1.8 }}
                    className="mb-4"
                  >
                    <p className="text-gray-400 text-xs mb-2">{`// food left`}</p>
                    <div className="flex flex-wrap gap-1 justify-center">
                      {Array.from({ length: 10 }, (_, i) => (
                        <motion.div
                          key={i}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.3, delay: 2.0 + i * 0.05 }}
                          className={`w-2 h-2 rounded-full ${i < (10 - score) ? 'bg-green-400' : 'bg-gray-700'
                            }`}
                        />
                      ))}
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 2.2 }}
                    className="flex flex-col justify-center items-center gap-2"
                  >
                    <div>
                      <AnimatePresence mode="wait">
                        {gameState === 'menu' && (
                          <motion.button
                            key="start"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={startGame}
                            className="bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white px-4 py-2 rounded font-mono text-xs transition-colors"
                          >
                            start-game
                          </motion.button>
                        )}

                        {gameState === 'playing' && (
                          <motion.div
                            key="playing"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className="text-green-400 font-mono text-sm text-center"
                          >
                            Score: {score}
                          </motion.div>
                        )}

                        {gameState === 'gameOver' && (
                          <motion.div
                            key="gameOver"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className="flex flex-col items-center gap-2"
                          >
                            <span className="text-red-400 font-mono text-sm">Game Over!</span>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={startGame}
                              className="bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white px-4 py-2 rounded font-mono text-xs transition-colors"
                            >
                              restart
                            </motion.button>
                          </motion.div>
                        )}

                        {gameState === 'win' && (
                          <motion.div
                            key="win"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className="flex flex-col items-center gap-2"
                          >
                            <span className="text-green-400 font-mono text-sm">You Win!</span>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={resetGame}
                              className="bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white px-4 py-2 rounded font-mono text-xs transition-colors"
                            >
                              Play Again
                            </motion.button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>


                  </motion.div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 2.4 }}
                className="flex justify-center mt-4"
              >
                <div className="w-32 h-1 bg-gray-600 rounded-full"></div>
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default SnakeGamePortfolio;
