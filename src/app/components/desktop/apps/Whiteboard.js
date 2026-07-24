"use client";
import React, { useState, useRef, useEffect } from 'react';
import { PenTool, Highlighter, Eraser, Trash2, Download, Undo, Layers } from 'lucide-react';

const COLORS = [
    '#ffffff', // White
    '#3b82f6', // Blue
    '#06b6d4', // Cyan
    '#a855f7', // Purple
    '#ec4899', // Pink
    '#22c55e', // Green
    '#eab308', // Yellow
    '#f97316', // Orange
    '#18181b', // Dark
];

export default function Whiteboard() {
    const canvasRef = useRef(null);
    const [tool, setTool] = useState('pen'); // 'pen', 'highlighter', 'eraser'
    const [color, setColor] = useState('#ffffff');
    const [strokeWidth, setStrokeWidth] = useState(4);
    const [isDrawing, setIsDrawing] = useState(false);
    const [history, setHistory] = useState([]);
    const [gridPattern, setGridPattern] = useState(true);

    // Save initial canvas state for undo
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Resize canvas resolution to container size
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        saveState();
    }, []);

    const saveState = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setHistory((prev) => [...prev.slice(-20), data]);
    };

    const handleUndo = () => {
        if (history.length <= 1) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const newHistory = [...history];
        newHistory.pop(); // Remove current
        const prevState = newHistory[newHistory.length - 1];
        if (prevState) {
            ctx.putImageData(prevState, 0, 0);
            setHistory(newHistory);
        }
    };

    const handleClear = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        saveState();
    };

    const handleDownload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        // Create temporary canvas with dark background
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.fillStyle = '#18181b';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.drawImage(canvas, 0, 0);

        const url = tempCanvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = 'whiteboard-drawing.png';
        a.click();
    };

    const startDrawing = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
        canvas.setPointerCapture(e.pointerId);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineWidth = strokeWidth * 4;
            ctx.strokeStyle = 'rgba(0,0,0,1)';
        } else if (tool === 'highlighter') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.lineWidth = strokeWidth * 3;
            ctx.strokeStyle = color;
            ctx.globalAlpha = 0.35;
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.lineWidth = strokeWidth;
            ctx.strokeStyle = color;
            ctx.globalAlpha = 1.0;
        }

        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = (e) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.closePath();
            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = 'source-over';
        }
        setIsDrawing(false);
        try {
            canvas.releasePointerCapture(e.pointerId);
        } catch {}
        saveState();
    };

    return (
        <div className="flex h-full w-full flex-col bg-[#121215] text-white select-none overflow-hidden">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between border-b border-white/10 bg-[#1c1c21] px-3 py-2 shrink-0">
                {/* Tools */}
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => setTool('pen')}
                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                            tool === 'pen' ? 'bg-blue-600 text-white' : 'hover:bg-white/10 text-white/70'
                        }`}
                        title="Pen"
                    >
                        <PenTool className="h-4 w-4" />
                        <span>Pen</span>
                    </button>

                    <button
                        onClick={() => setTool('highlighter')}
                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                            tool === 'highlighter' ? 'bg-amber-600 text-white' : 'hover:bg-white/10 text-white/70'
                        }`}
                        title="Highlighter"
                    >
                        <Highlighter className="h-4 w-4" />
                        <span>Highlighter</span>
                    </button>

                    <button
                        onClick={() => setTool('eraser')}
                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                            tool === 'eraser' ? 'bg-red-600 text-white' : 'hover:bg-white/10 text-white/70'
                        }`}
                        title="Eraser"
                    >
                        <Eraser className="h-4 w-4" />
                        <span>Eraser</span>
                    </button>

                    <div className="h-5 w-px bg-white/10 mx-1" />

                    {/* Color Palette */}
                    {tool !== 'eraser' && (
                        <div className="flex items-center gap-1">
                            {COLORS.map((c) => (
                                <button
                                    key={c}
                                    onClick={() => setColor(c)}
                                    className={`h-5 w-5 rounded-full border transition-transform ${
                                        color === c ? 'scale-125 border-white ring-2 ring-blue-500/50' : 'border-white/20 hover:scale-110'
                                    }`}
                                    style={{ backgroundColor: c }}
                                    title={c}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Stroke Size & Controls */}
                <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-2 text-white/70">
                        <span>Size:</span>
                        <input
                            type="range"
                            min="2"
                            max="20"
                            value={strokeWidth}
                            onChange={(e) => setStrokeWidth(Number(e.target.value))}
                            className="w-20 accent-blue-500 cursor-pointer"
                        />
                    </div>

                    <button
                        onClick={() => setGridPattern((g) => !g)}
                        className={`flex items-center gap-1 rounded p-1.5 transition-colors ${
                            gridPattern ? 'bg-white/15 text-white' : 'text-white/50 hover:bg-white/10'
                        }`}
                        title="Toggle Grid Background"
                    >
                        <Layers className="h-4 w-4" />
                    </button>

                    <button
                        onClick={handleUndo}
                        disabled={history.length <= 1}
                        className="flex items-center gap-1 rounded p-1.5 text-white/70 hover:bg-white/10 disabled:opacity-30 transition-colors"
                        title="Undo"
                    >
                        <Undo className="h-4 w-4" />
                    </button>

                    <button
                        onClick={handleClear}
                        className="flex items-center gap-1 rounded p-1.5 text-red-400 hover:bg-red-500/20 transition-colors"
                        title="Clear Board"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>

                    <button
                        onClick={handleDownload}
                        className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 transition-colors shadow"
                        title="Export PNG"
                    >
                        <Download className="h-3.5 w-3.5" />
                        <span>Export</span>
                    </button>
                </div>
            </div>

            {/* Drawing Canvas Area */}
            <div
                className={`relative min-h-0 flex-1 overflow-hidden ${
                    gridPattern ? 'bg-[radial-gradient(#ffffff1a_1px,transparent_1px)] [background-size:24px_24px]' : ''
                }`}
                style={{ backgroundColor: '#141418' }}
            >
                <canvas
                    ref={canvasRef}
                    onPointerDown={startDrawing}
                    onPointerMove={draw}
                    onPointerUp={stopDrawing}
                    onPointerCancel={stopDrawing}
                    className="absolute inset-0 cursor-crosshair touch-none"
                />
            </div>
        </div>
    );
}
