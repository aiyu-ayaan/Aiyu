"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { History, Trash2, Delete, Percent, Divide, X, Minus, Plus, Equal } from 'lucide-react';
import { useDeviceMode } from '../../../context/DeviceModeContext';

export default function Calculator() {
    const { isMobile, isTablet } = useDeviceMode();
    const [display, setDisplay] = useState('0');
    const [equation, setEquation] = useState('');
    const [prevValue, setPrevValue] = useState(null);
    const [operator, setOperator] = useState(null);
    const [waitingForOperand, setWaitingForOperand] = useState(false);
    const [memory, setMemory] = useState(0);
    const [history, setHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);

    const inputDigit = useCallback((digit) => {
        if (waitingForOperand) {
            setDisplay(String(digit));
            setWaitingForOperand(false);
        } else {
            setDisplay(display === '0' ? String(digit) : display + digit);
        }
    }, [display, waitingForOperand]);

    const inputDot = useCallback(() => {
        if (waitingForOperand) {
            setDisplay('0.');
            setWaitingForOperand(false);
        } else if (!display.includes('.')) {
            setDisplay(display + '.');
        }
    }, [display, waitingForOperand]);

    const clearAll = useCallback(() => {
        setDisplay('0');
        setEquation('');
        setPrevValue(null);
        setOperator(null);
        setWaitingForOperand(false);
    }, []);

    const clearEntry = useCallback(() => {
        setDisplay('0');
    }, []);

    const backspace = useCallback(() => {
        if (waitingForOperand) return;
        if (display.length > 1) {
            setDisplay(display.slice(0, -1));
        } else {
            setDisplay('0');
        }
    }, [display, waitingForOperand]);

    const performOperation = useCallback((nextOperator) => {
        const inputValue = parseFloat(display);

        if (prevValue === null) {
            setPrevValue(inputValue);
            setEquation(`${inputValue} ${nextOperator}`);
        } else if (operator) {
            const currentValue = prevValue || 0;
            let newValue = currentValue;

            switch (operator) {
                case '+':
                    newValue = currentValue + inputValue;
                    break;
                case '-':
                    newValue = currentValue - inputValue;
                    break;
                case '×':
                case '*':
                    newValue = currentValue * inputValue;
                    break;
                case '÷':
                case '/':
                    newValue = inputValue !== 0 ? currentValue / inputValue : 'Error';
                    break;
                default:
                    break;
            }

            if (newValue === 'Error') {
                setDisplay('Error');
                setPrevValue(null);
                setOperator(null);
                setWaitingForOperand(true);
                return;
            }

            const formattedValue = String(Number(newValue.toFixed(8)));
            setDisplay(formattedValue);
            setPrevValue(newValue);
            setEquation(`${formattedValue} ${nextOperator}`);
        }

        setWaitingForOperand(true);
        setOperator(nextOperator);
    }, [display, operator, prevValue]);

    const calculateEqual = useCallback(() => {
        if (operator === null || prevValue === null) return;
        const inputValue = parseFloat(display);
        let newValue = prevValue;

        switch (operator) {
            case '+':
                newValue = prevValue + inputValue;
                break;
            case '-':
                newValue = prevValue - inputValue;
                break;
            case '×':
            case '*':
                newValue = prevValue * inputValue;
                break;
            case '÷':
            case '/':
                newValue = inputValue !== 0 ? prevValue / inputValue : 'Error';
                break;
            default:
                break;
        }

        const fullExpr = `${prevValue} ${operator} ${inputValue} =`;

        if (newValue === 'Error') {
            setDisplay('Error');
        } else {
            const formatted = String(Number(newValue.toFixed(8)));
            setDisplay(formatted);
            setHistory((prev) => [{ expr: fullExpr, result: formatted }, ...prev]);
        }

        setEquation('');
        setPrevValue(null);
        setOperator(null);
        setWaitingForOperand(true);
    }, [display, operator, prevValue]);

    const toggleSign = useCallback(() => {
        const value = parseFloat(display);
        if (value !== 0) {
            setDisplay(String(-value));
        }
    }, [display]);

    const percentage = useCallback(() => {
        const value = parseFloat(display);
        setDisplay(String(value / 100));
    }, [display]);

    const squareRoot = useCallback(() => {
        const value = parseFloat(display);
        if (value >= 0) {
            const res = Math.sqrt(value);
            setDisplay(String(Number(res.toFixed(8))));
        } else {
            setDisplay('Error');
        }
        setWaitingForOperand(true);
    }, [display]);

    const square = useCallback(() => {
        const value = parseFloat(display);
        const res = value * value;
        setDisplay(String(Number(res.toFixed(8))));
        setWaitingForOperand(true);
    }, [display]);

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key >= '0' && e.key <= '9') {
                inputDigit(parseInt(e.key, 10));
            } else if (e.key === '.') {
                inputDot();
            } else if (e.key === 'Backspace') {
                backspace();
            } else if (e.key === 'Escape') {
                clearAll();
            } else if (e.key === 'Enter' || e.key === '=') {
                e.preventDefault();
                calculateEqual();
            } else if (e.key === '+') {
                performOperation('+');
            } else if (e.key === '-') {
                performOperation('-');
            } else if (e.key === '*') {
                performOperation('×');
            } else if (e.key === '/') {
                e.preventDefault();
                performOperation('÷');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [inputDigit, inputDot, backspace, clearAll, calculateEqual, performOperation]);

    return (
        <div className="flex h-full w-full bg-[#1c1c1f] text-white font-sans select-none overflow-hidden">
            {/* Main Calculator */}
            <div className="flex flex-1 flex-col justify-between p-3">
                {/* Header / History toggle */}
                <div className="flex items-center justify-between text-xs text-white/60">
                    <span className="font-semibold text-white/90">Standard</span>
                    <button
                        onClick={() => setShowHistory((v) => !v)}
                        className={`flex items-center gap-1 rounded transition-colors ${
                            showHistory ? 'bg-blue-600/30 text-blue-400' : 'hover:bg-white/10'
                        } ${isMobile ? 'p-2' : 'p-1.5'}`}
                        title="Toggle History"
                    >
                        <History className="h-4 w-4" />
                    </button>
                </div>

                {/* Display */}
                <div className="my-2 flex flex-col items-end px-2">
                    <div className="h-5 text-xs text-white/50 font-mono truncate max-w-full">
                        {equation}
                    </div>
                    <div className="text-3xl font-light text-white font-mono tracking-tight truncate max-w-full">
                        {display}
                    </div>
                </div>

                {/* Memory bar */}
                <div className={`grid grid-cols-5 gap-1 mb-2 text-[11px] font-medium text-white/60 text-center ${isMobile ? 'py-1' : ''}`}>
                    <button onClick={() => setMemory(0)} className={`rounded hover:bg-white/10 ${isMobile ? 'py-2' : 'py-1'}`}>MC</button>
                    <button onClick={() => setDisplay(String(memory))} className={`rounded hover:bg-white/10 ${isMobile ? 'py-2' : 'py-1'}`}>MR</button>
                    <button onClick={() => setMemory((m) => m + parseFloat(display))} className={`rounded hover:bg-white/10 ${isMobile ? 'py-2' : 'py-1'}`}>M+</button>
                    <button onClick={() => setMemory((m) => m - parseFloat(display))} className={`rounded hover:bg-white/10 ${isMobile ? 'py-2' : 'py-1'}`}>M-</button>
                    <button onClick={() => setMemory(parseFloat(display))} className={`rounded hover:bg-white/10 ${isMobile ? 'py-2' : 'py-1'}`}>MS</button>
                </div>

                {/* Buttons Grid */}
                <div className={`grid grid-cols-4 ${isMobile ? 'gap-2' : 'gap-1.5'} flex-1 min-h-0 text-sm font-medium`}>
                    <button onClick={percentage} className="flex items-center justify-center rounded bg-white/5 hover:bg-white/10 transition-colors"><Percent className="h-4 w-4" /></button>
                    <button onClick={clearEntry} className="flex items-center justify-center rounded bg-white/5 hover:bg-white/10 transition-colors">CE</button>
                    <button onClick={clearAll} className="flex items-center justify-center rounded bg-white/5 hover:bg-white/10 transition-colors">C</button>
                    <button onClick={backspace} className="flex items-center justify-center rounded bg-white/5 hover:bg-white/10 transition-colors"><Delete className="h-4 w-4" /></button>

                    <button onClick={square} className="flex items-center justify-center rounded bg-white/5 hover:bg-white/10 transition-colors font-mono">x²</button>
                    <button onClick={squareRoot} className="flex items-center justify-center rounded bg-white/5 hover:bg-white/10 transition-colors font-mono">√x</button>
                    <button onClick={() => performOperation('÷')} className="flex items-center justify-center rounded bg-white/5 hover:bg-white/10 transition-colors"><Divide className="h-4 w-4 text-blue-400" /></button>
                    <button onClick={() => performOperation('×')} className="flex items-center justify-center rounded bg-white/5 hover:bg-white/10 transition-colors"><X className="h-4 w-4 text-blue-400" /></button>

                    <button onClick={() => inputDigit(7)} className="flex items-center justify-center rounded bg-white/10 hover:bg-white/20 transition-colors text-base font-semibold">7</button>
                    <button onClick={() => inputDigit(8)} className="flex items-center justify-center rounded bg-white/10 hover:bg-white/20 transition-colors text-base font-semibold">8</button>
                    <button onClick={() => inputDigit(9)} className="flex items-center justify-center rounded bg-white/10 hover:bg-white/20 transition-colors text-base font-semibold">9</button>
                    <button onClick={() => performOperation('-')} className="flex items-center justify-center rounded bg-white/5 hover:bg-white/10 transition-colors"><Minus className="h-4 w-4 text-blue-400" /></button>

                    <button onClick={() => inputDigit(4)} className="flex items-center justify-center rounded bg-white/10 hover:bg-white/20 transition-colors text-base font-semibold">4</button>
                    <button onClick={() => inputDigit(5)} className="flex items-center justify-center rounded bg-white/10 hover:bg-white/20 transition-colors text-base font-semibold">5</button>
                    <button onClick={() => inputDigit(6)} className="flex items-center justify-center rounded bg-white/10 hover:bg-white/20 transition-colors text-base font-semibold">6</button>
                    <button onClick={() => performOperation('+')} className="flex items-center justify-center rounded bg-white/5 hover:bg-white/10 transition-colors"><Plus className="h-4 w-4 text-blue-400" /></button>

                    <button onClick={() => inputDigit(1)} className="flex items-center justify-center rounded bg-white/10 hover:bg-white/20 transition-colors text-base font-semibold">1</button>
                    <button onClick={() => inputDigit(2)} className="flex items-center justify-center rounded bg-white/10 hover:bg-white/20 transition-colors text-base font-semibold">2</button>
                    <button onClick={() => inputDigit(3)} className="flex items-center justify-center rounded bg-white/10 hover:bg-white/20 transition-colors text-base font-semibold">3</button>
                    <button onClick={calculateEqual} className="row-span-2 flex items-center justify-center rounded bg-blue-600 hover:bg-blue-500 transition-colors text-white shadow"><Equal className="h-5 w-5" /></button>

                    <button onClick={toggleSign} className="flex items-center justify-center rounded bg-white/5 hover:bg-white/10 transition-colors font-mono">±</button>
                    <button onClick={() => inputDigit(0)} className="flex items-center justify-center rounded bg-white/10 hover:bg-white/20 transition-colors text-base font-semibold">0</button>
                    <button onClick={inputDot} className="flex items-center justify-center rounded bg-white/10 hover:bg-white/20 transition-colors text-base font-semibold">.</button>
                </div>
            </div>

            {/* Optional History Sidebar */}
            {showHistory && (
                <div className={`${isMobile ? 'absolute inset-0 bg-[#161618] z-10' : 'w-56 border-l border-white/10 bg-[#161618]'} p-3 flex flex-col justify-between`}>
                    <div>
                        <div className="flex items-center justify-between text-xs font-semibold text-white/80 pb-2 border-b border-white/10 mb-2">
                            <span>History</span>
                            <div className="flex gap-2">
                                {history.length > 0 && (
                                    <button onClick={() => setHistory([])} className={`text-white/40 hover:text-red-400 ${isMobile ? 'p-2' : ''}`}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                )}
                                {isMobile && (
                                    <button onClick={() => setShowHistory(false)} className="text-white/40 hover:text-white p-2">
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2 overflow-y-auto max-h-[340px] pr-1 custom-scrollbar">
                            {history.length > 0 ? (
                                history.map((h, i) => (
                                    <div
                                        key={i}
                                        onClick={() => setDisplay(h.result)}
                                        className="cursor-pointer rounded p-2 hover:bg-white/5 text-right transition"
                                    >
                                        <div className="text-[11px] text-white/50 font-mono">{h.expr}</div>
                                        <div className="text-base font-semibold font-mono text-blue-400">{h.result}</div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-12 text-center text-xs text-white/40">There&apos;s no history yet</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
