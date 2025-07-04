"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';

const SnakeGamePortfolio = () => {
  const [gameState, setGameState] = useState('menu'); // 'menu', 'playing', 'gameOver'
  const [snake, setSnake] = useState([{ x: 10, y: 10 }]);
  const [food, setFood] = useState({ x: 15, y: 15 });
  const [direction, setDirection] = useState({ x: 0, y: 1 });
  const [score, setScore] = useState(0);
  const [gameSpeed, setGameSpeed] = useState(150);
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(true);

  const roles = ['Android Developer', 'Learner'];
  const BOARD_SIZE = 20;

  const timeoutRef = useRef(null);
  const cursorIntervalRef = useRef(null);

  // Typewriter effect
  useEffect(() => {
    const currentRole = roles[currentIndex];
    let charIndex = 0;
    let isDeleting = false;

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const typeWriter = () => {
      if (!isDeleting) {
        // Typing phase
        if (charIndex < currentRole.length) {
          setDisplayedText(currentRole.substring(0, charIndex + 1));
          charIndex++;
          timeoutRef.current = setTimeout(typeWriter, 100);
        } else {
          // Pause before deleting
          timeoutRef.current = setTimeout(() => {
            isDeleting = true;
            typeWriter();
          }, 2000);
        }
      } else {
        // Deleting phase
        if (charIndex > 0) {
          setDisplayedText(currentRole.substring(0, charIndex - 1));
          charIndex--;
          timeoutRef.current = setTimeout(typeWriter, 50);
        } else {
          // Move to next role
          setCurrentIndex((prev) => (prev + 1) % roles.length);
        }
      }
    };

    typeWriter();

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [currentIndex]);

  // Cursor blinking effect
  useEffect(() => {
    cursorIntervalRef.current = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);

    return () => {
      if (cursorIntervalRef.current) {
        clearInterval(cursorIntervalRef.current);
      }
    };
  }, []);

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

  // Handle keyboard input with WASD and Arrow keys
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

  // Handle touch controls for mobile
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
    <div className="min-h-screen bg-gray-900 flex flex-col lg:flex-row items-center justify-center p-4 lg:p-8">
      <div className="w-full max-w-6xl flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-16">
        {/* Portfolio info */}
        <div className="flex-1 text-white text-center lg:text-left order-1 lg:order-1">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">Ayaan Ansari</h1>
          <p className="text-blue-400 text-lg sm:text-xl mb-6 lg:mb-8">
            &gt; {displayedText}
            <span className={`${showCursor ? 'opacity-100' : 'opacity-0'} transition-opacity duration-100`}>|</span>
          </p>
          <div className="space-y-2 font-mono text-xs sm:text-sm text-left">
            <p className="text-gray-400">{`// Hi all. I am`}</p>
            <p className="text-gray-400">{`// complete the game to continue`}</p>
            <p className="text-gray-400">{`// find my profile on Github:`}</p>
            <p className="break-all">
              <span className="text-blue-400">const</span>{' '}
              <span className="text-cyan-400">githubLink</span>{' '}
              <span className="text-white">=</span>
              <br className="sm:hidden" />
              <span className="sm:ml-1 text-orange-400">&quot;https://github.com/aiyu-ayaan&quot;</span>
            </p>
          </div>
        </div>

        {/* Mobile Device Frame */}
        <div className="relative order-2 lg:order-2 px-4 sm:px-0">
          {/* Phone frame */}
          <div className="relative bg-gray-800 rounded-[2.5rem] p-3 shadow-2xl">
            {/* Screen bezel */}
            <div className="bg-black rounded-[2rem] p-4 relative">
              {/* Status bar */}
              <div className="flex justify-between items-center mb-4 text-white text-xs">
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
              </div>

              {/* Game content */}
              <div className="w-64 sm:w-80 bg-teal-500/30 rounded-lg shadow-2xl backdrop-blur-md">
                <div className="bg-gray-900 rounded-lg p-4">
                  {/* Game area */}
                  <div className="relative mb-4">
                    <div className="grid grid-cols-20 gap-0 bg-gray-800 p-2 aspect-square">
                      {renderGameBoard()}
                    </div>
                  </div>

                  {/* Touch controls - arrow keys */}
                  <div className="mb-4">
                    <p className="text-gray-400 text-xs mb-2 text-center">{`// tap arrows to play`}</p>
                    <div className="grid grid-cols-3 gap-2 max-w-32 mx-auto">
                      <div></div>
                      <button
                        onClick={() => handleDirectionChange({ x: 0, y: -1 })}
                        className="w-10 h-10 bg-gray-700 rounded border border-gray-600 flex items-center justify-center text-white text-sm active:bg-gray-600 transition-colors"
                      >
                        ↑
                      </button>
                      <div></div>
                      <button
                        onClick={() => handleDirectionChange({ x: -1, y: 0 })}
                        className="w-10 h-10 bg-gray-700 rounded border border-gray-600 flex items-center justify-center text-white text-sm active:bg-gray-600 transition-colors"
                      >
                        ←
                      </button>
                      <button
                        onClick={() => handleDirectionChange({ x: 0, y: 1 })}
                        className="w-10 h-10 bg-gray-700 rounded border border-gray-600 flex items-center justify-center text-white text-sm active:bg-gray-600 transition-colors"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => handleDirectionChange({ x: 1, y: 0 })}
                        className="w-10 h-10 bg-gray-700 rounded border border-gray-600 flex items-center justify-center text-white text-sm active:bg-gray-600 transition-colors"
                      >
                        →
                      </button>
                    </div>
                  </div>

                  {/* Food left indicator */}
                  <div className="mb-4">
                    <p className="text-gray-400 text-xs mb-2">{`// food left`}</p>
                    <div className="flex flex-wrap gap-1 justify-center">
                      {Array.from({ length: 10 }, (_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full ${i < (10 - score) ? 'bg-green-400' : 'bg-gray-700'
                            }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Game controls */}
                  <div className="flex flex-col justify-center items-center gap-2">
                    <div>
                      {gameState === 'menu' && (
                        <button
                          onClick={startGame}
                          className="bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white px-4 py-2 rounded font-mono text-xs transition-colors"
                        >
                          start-game
                        </button>
                      )}

                      {gameState === 'playing' && (
                        <div className="text-green-400 font-mono text-sm text-center">
                          Score: {score}
                        </div>
                      )}

                      {gameState === 'gameOver' && (
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-red-400 font-mono text-sm">Game Over!</span>
                          <button
                            onClick={startGame}
                            className="bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white px-4 py-2 rounded font-mono text-xs transition-colors"
                          >
                            restart
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setGameState('menu')}
                      className="bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white px-4 py-2 rounded font-mono text-xs transition-colors"
                    >
                      skip
                    </button>
                  </div>
                </div>
              </div>

              {/* Home indicator */}
              <div className="flex justify-center mt-4">
                <div className="w-32 h-1 bg-gray-600 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SnakeGamePortfolio;