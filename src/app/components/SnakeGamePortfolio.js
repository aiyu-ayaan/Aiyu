"use client";

import React, { useState, useEffect, useCallback } from 'react';

const SnakeGamePortfolio = () => {
  const [gameState, setGameState] = useState('menu'); // 'menu', 'playing', 'gameOver'
  const [snake, setSnake] = useState([{ x: 10, y: 10 }]);
  const [food, setFood] = useState({ x: 15, y: 15 });
  const [direction, setDirection] = useState({ x: 0, y: 1 });
  const [score, setScore] = useState(0);
  const [gameSpeed, setGameSpeed] = useState(150);

  const BOARD_SIZE = 20;

  // Generate random food position
  const generateFood = useCallback(() => {
    return {
      x: Math.floor(Math.random() * BOARD_SIZE),
      y: Math.floor(Math.random() * BOARD_SIZE)
    };
  }, []);

  // Reset game
  const resetGame = () => {
    setSnake([{ x: 10, y: 10 }]);
    setFood(generateFood());
    setDirection({ x: 0, y: 1 });
    setScore(0);
    setGameSpeed(150);
  };

  // Start game
  const startGame = () => {
    resetGame();
    setGameState('playing');
  };

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const gameLoop = setInterval(() => {
      setSnake(currentSnake => {
        const newSnake = [...currentSnake];
        const head = { ...newSnake[0] };
        
        head.x += direction.x;
        head.y += direction.y;

        // Check wall collision
        if (head.x < 0 || head.x >= BOARD_SIZE || head.y < 0 || head.y >= BOARD_SIZE) {
          setGameState('gameOver');
          return currentSnake;
        }

        // Check self collision
        if (newSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
          setGameState('gameOver');
          return currentSnake;
        }

        newSnake.unshift(head);

        // Check food collision
        if (head.x === food.x && head.y === food.y) {
          setScore(prev => prev + 1);
          setFood(generateFood());
          setGameSpeed(prev => Math.max(80, prev - 2)); // Increase speed
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    }, gameSpeed);

    return () => clearInterval(gameLoop);
  }, [direction, food, gameSpeed, gameState, generateFood]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (gameState === 'playing') {
        switch (e.key) {
          case 'ArrowUp':
            e.preventDefault();
            setDirection(prev => prev.y !== 1 ? { x: 0, y: -1 } : prev);
            break;
          case 'ArrowDown':
            e.preventDefault();
            setDirection(prev => prev.y !== -1 ? { x: 0, y: 1 } : prev);
            break;
          case 'ArrowLeft':
            e.preventDefault();
            setDirection(prev => prev.x !== 1 ? { x: -1, y: 0 } : prev);
            break;
          case 'ArrowRight':
            e.preventDefault();
            setDirection(prev => prev.x !== -1 ? { x: 1, y: 0 } : prev);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState]);

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
            className={`w-3 h-3 ${
              cellType === 'head' ? 'bg-cyan-400' :
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
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-6xl w-full flex items-center justify-between">
        {/* Left side - Portfolio info */}
        <div className="flex-1 text-white mr-16">
          <p className="text-gray-400 text-sm mb-2">Hi all. I am</p>
          <h1 className="text-5xl font-bold mb-4">Ayaan Ansari</h1>
          <p className="text-blue-400 text-xl mb-8">&gt; Android developer</p>
          
          <div className="space-y-2 font-mono text-sm">
            <p className="text-gray-400">// complete the game to continue</p>
            <p className="text-gray-400">// find my profile on Github:</p>
            <p>
              <span className="text-blue-400">const</span>{' '}
              <span className="text-cyan-400">githubLink</span>{' '}
              <span className="text-white">=</span>{' '}
              <span className="text-orange-400">"https://github.com/aiyu-ayaan"</span>
            </p>
          </div>
        </div>

        {/* Right side - Game */}
        <div className="bg-teal-500/30 p-6 rounded-lg shadow-2xl backdrop-blur-md">
          <div className="bg-gray-900 rounded-lg p-4">
            {/* Game area */}
            <div className="relative mb-4">
              <div className="grid grid-cols-20 gap-0 bg-gray-800 p-2">
                {renderGameBoard()}
              </div>
            </div>

            {/* Controls */}
            <div className="flex justify-between items-center mb-4">
              <div className="text-white text-sm">
                <p className="text-gray-400">// use keyboard</p>
                <p className="text-gray-400">// arrows to play</p>
              </div>
              <div className="grid grid-cols-3 gap-6">
                <div></div>
                <div className="w-8 h-8 bg-gray-700 rounded border border-gray-600 flex items-center justify-center text-white text-xs">↑</div>
                <div></div>
                <div className="w-8 h-8 bg-gray-700 rounded border border-gray-600 flex items-center justify-center text-white text-xs">←</div>
                <div className="w-8 h-8 bg-gray-700 rounded border border-gray-600 flex items-center justify-center text-white text-xs">↓</div>
                <div className="w-8 h-8 bg-gray-700 rounded border border-gray-600 flex items-center justify-center text-white text-xs">→</div>
              </div>
            </div>

            {/* Food left indicator */}
            <div className="mb-4">
              <p className="text-gray-400 text-sm mb-2">// food left</p>
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: 10 }, (_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full ${
                      i < (10 - score) ? 'bg-green-400' : 'bg-gray-700'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Game controls */}
            <div className="flex justify-between items-center">
              {gameState === 'menu' && (
                <button
                  onClick={startGame}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded font-mono text-sm transition-colors"
                >
                  start-game
                </button>
              )}
              
              {gameState === 'playing' && (
                <div className="text-green-400 font-mono text-sm">
                  Score: {score}
                </div>
              )}
              
              {gameState === 'gameOver' && (
                <div className="space-x-2">
                  <span className="text-red-400 font-mono text-sm">Game Over!</span>
                  <button
                    onClick={startGame}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded font-mono text-sm transition-colors"
                  >
                    restart
                  </button>
                </div>
              )}
              
              <button
                onClick={() => setGameState('menu')}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded font-mono text-sm transition-colors"
              >
                skip
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SnakeGamePortfolio;