"use client";
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Minus, Square, X, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// A single draggable & resizable Win11-style window with Snap Layouts.
export default function Window({
    win,
    active,
    onFocus,
    onClose,
    onMinimize,
    onToggleMaximize,
    onMove,
    onResize,
    onSnap,
    windows = [],
    children,
}) {
    const dragRef = useRef(null);
    const resizeRef = useRef(null);
    const [dragging, setDragging] = useState(false);
    const [resizing, setResizing] = useState(false);
    const [snapFlyoutOpen, setSnapFlyoutOpen] = useState(false);
    const snapTimeoutRef = useRef(null);

    const startDrag = useCallback(
        (e) => {
            if (win.maximized) return;
            if (e.target.closest('[data-noswipe]')) return;
            onFocus(win.id);
            const startX = e.clientX;
            const startY = e.clientY;
            const originX = win.x;
            const originY = win.y;
            dragRef.current = { startX, startY, originX, originY };
            setDragging(true);
            e.currentTarget.setPointerCapture?.(e.pointerId);
        },
        [win, onFocus]
    );

    const onDrag = useCallback(
        (e) => {
            if (!dragRef.current) return;
            const dx = e.clientX - dragRef.current.startX;
            const dy = e.clientY - dragRef.current.startY;
            const nextX = dragRef.current.originX + dx;
            const maxWorkHeight = (typeof window !== 'undefined' ? window.innerHeight : 800) - 48;
            const nextY = Math.min(Math.max(0, dragRef.current.originY + dy), Math.max(0, maxWorkHeight - 36));
            onMove(win.id, nextX, nextY);
        },
        [win.id, onMove]
    );

    const endDrag = useCallback((e) => {
        dragRef.current = null;
        setDragging(false);
        e.currentTarget.releasePointerCapture?.(e.pointerId);
    }, []);

    // Pointer-down handler for 8 resize handles
    const startResize = useCallback(
        (handle, e) => {
            e.stopPropagation();
            if (win.maximized) return;
            onFocus(win.id);
            const startX = e.clientX;
            const startY = e.clientY;
            const originX = win.x;
            const originY = win.y;
            const originW = win.w;
            const originH = win.h;
            resizeRef.current = { handle, startX, startY, originX, originY, originW, originH };
            setResizing(true);
            e.currentTarget.setPointerCapture?.(e.pointerId);
        },
        [win, onFocus]
    );

    const onResizePointer = useCallback(
        (e) => {
            if (!resizeRef.current || !onResize) return;
            const { handle, startX, startY, originX, originY, originW, originH } = resizeRef.current;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            let nextX = originX;
            let nextY = originY;
            let nextW = originW;
            let nextH = originH;

            const minW = 320;
            const minH = 200;

            if (handle.includes('e')) {
                nextW = Math.max(minW, originW + dx);
            }
            if (handle.includes('s')) {
                nextH = Math.max(minH, originH + dy);
            }
            if (handle.includes('w')) {
                const possibleW = originW - dx;
                if (possibleW >= minW) {
                    nextW = possibleW;
                    nextX = originX + dx;
                }
            }
            if (handle.includes('n')) {
                const possibleH = originH - dy;
                if (possibleH >= minH) {
                    nextH = possibleH;
                    nextY = originY + dy;
                }
            }

            onResize(win.id, nextX, nextY, nextW, nextH);
        },
        [win.id, onResize]
    );

    const endResize = useCallback((e) => {
        resizeRef.current = null;
        setResizing(false);
        e.currentTarget.releasePointerCapture?.(e.pointerId);
    }, []);

    useEffect(() => {
        if (!active) return;
        const onKey = (e) => {
            if (e.key === 'Escape' && win.maximized) onToggleMaximize(win.id);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [active, win.maximized, win.id, onToggleMaximize]);

    const handleMouseEnterMaximize = () => {
        if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current);
        setSnapFlyoutOpen(true);
    };

    const otherOpenWindows = React.useMemo(() => {
        return windows.filter((w) => w.id !== win.id && !w.minimized);
    }, [windows, win.id]);

    const handleMouseLeaveMaximize = () => {
        snapTimeoutRef.current = setTimeout(() => {
            setSnapFlyoutOpen(false);
        }, 300);
    };

    const handleSelectSnap = (zone) => {
        setSnapFlyoutOpen(false);
        if (onSnap) onSnap(win.id, zone);
    };

    const style = win.maximized
        ? { left: 0, top: 0, width: '100%', height: 'calc(100vh - 48px)', borderRadius: 0 }
        : { left: win.x, top: win.y, width: win.w, height: win.h };

    const Icon = win.icon;

    const animateState = win.minimized
        ? { opacity: 0, scale: 0.82, y: 60, filter: 'blur(4px)', pointerEvents: 'none' }
        : { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)', pointerEvents: 'auto' };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16, filter: 'blur(4px)' }}
            animate={animateState}
            exit={{ opacity: 0, scale: 0.92, y: 12, filter: 'blur(4px)' }}
            transition={
                dragging || resizing
                    ? { duration: 0 }
                    : { duration: 0.22, ease: [0.16, 1, 0.3, 1] }
            }
            className={`absolute flex flex-col overflow-visible rounded-lg border border-white/15 bg-[#f3f3f3] text-neutral-900 shadow-2xl transition-shadow dark:bg-[#202020] dark:text-neutral-100 ${
                active ? 'shadow-black/50 ring-1 ring-white/20' : 'shadow-black/25 opacity-95'
            }`}
            style={{ ...style, zIndex: win.z }}
            onMouseDown={() => onFocus(win.id)}
            role="dialog"
            aria-label={win.title}
        >
            {/* 8 Resize Handles (Active when not maximized) */}
            {!win.maximized && (
                <>
                    {/* Top */}
                    <div
                        className="absolute -top-1.5 left-2 right-2 h-3 cursor-ns-resize z-30"
                        onPointerDown={(e) => startResize('n', e)}
                        onPointerMove={onResizePointer}
                        onPointerUp={endResize}
                    />
                    {/* Bottom */}
                    <div
                        className="absolute -bottom-1.5 left-2 right-2 h-3 cursor-ns-resize z-30"
                        onPointerDown={(e) => startResize('s', e)}
                        onPointerMove={onResizePointer}
                        onPointerUp={endResize}
                    />
                    {/* Left */}
                    <div
                        className="absolute -left-1.5 top-2 bottom-2 w-3 cursor-ew-resize z-30"
                        onPointerDown={(e) => startResize('w', e)}
                        onPointerMove={onResizePointer}
                        onPointerUp={endResize}
                    />
                    {/* Right */}
                    <div
                        className="absolute -right-1.5 top-2 bottom-2 w-3 cursor-ew-resize z-30"
                        onPointerDown={(e) => startResize('e', e)}
                        onPointerMove={onResizePointer}
                        onPointerUp={endResize}
                    />
                    {/* Top-Left */}
                    <div
                        className="absolute -top-1.5 -left-1.5 h-4 w-4 cursor-nwse-resize z-40"
                        onPointerDown={(e) => startResize('nw', e)}
                        onPointerMove={onResizePointer}
                        onPointerUp={endResize}
                    />
                    {/* Top-Right */}
                    <div
                        className="absolute -top-1.5 -right-1.5 h-4 w-4 cursor-nesw-resize z-40"
                        onPointerDown={(e) => startResize('ne', e)}
                        onPointerMove={onResizePointer}
                        onPointerUp={endResize}
                    />
                    {/* Bottom-Left */}
                    <div
                        className="absolute -bottom-1.5 -left-1.5 h-4 w-4 cursor-nesw-resize z-40"
                        onPointerDown={(e) => startResize('sw', e)}
                        onPointerMove={onResizePointer}
                        onPointerUp={endResize}
                    />
                    {/* Bottom-Right */}
                    <div
                        className="absolute -bottom-1.5 -right-1.5 h-4 w-4 cursor-nwse-resize z-40"
                        onPointerDown={(e) => startResize('se', e)}
                        onPointerMove={onResizePointer}
                        onPointerUp={endResize}
                    />
                </>
            )}

            {/* Inner Window Container */}
            <div className="flex h-full w-full flex-col overflow-hidden rounded-lg">
                {/* Title bar */}
                <div
                    className="flex h-9 shrink-0 items-center justify-between bg-white/70 backdrop-blur dark:bg-white/5"
                    onPointerDown={startDrag}
                    onPointerMove={onDrag}
                    onPointerUp={endDrag}
                    onDoubleClick={() => onToggleMaximize(win.id)}
                    style={{ cursor: win.maximized ? 'default' : 'grab', touchAction: 'none' }}
                >
                    <div className="flex items-center gap-2 px-3 text-xs font-medium">
                        {Icon ? <Icon className="h-4 w-4 opacity-80" /> : null}
                        <span className="truncate">{win.title}</span>
                    </div>

                    <div className="flex h-full relative" data-noswipe>
                        <button
                            onClick={() => onMinimize(win.id)}
                            className="flex h-full w-11 items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                            aria-label="Minimize"
                        >
                            <Minus className="h-4 w-4" />
                        </button>

                        {/* Maximize & Snap Layouts Trigger Button */}
                        <div
                            className="relative flex h-full"
                            onMouseEnter={handleMouseEnterMaximize}
                            onMouseLeave={handleMouseLeaveMaximize}
                        >
                            <button
                                onClick={() => onToggleMaximize(win.id)}
                                className="flex h-full w-11 items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                aria-label="Maximize / Snap Layouts"
                            >
                                {win.maximized ? <Copy className="h-3.5 w-3.5" /> : <Square className="h-3 w-3" />}
                            </button>

                            {/* Windows 11 Snap Layouts Flyout Menu */}
                            <AnimatePresence>
                                {snapFlyoutOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: -6 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: -6 }}
                                        transition={{ duration: 0.12 }}
                                        className="absolute right-0 top-10 z-[9999] w-64 rounded-xl border border-white/20 bg-[#25252b]/98 p-3 shadow-2xl backdrop-blur-2xl text-white select-none"
                                        onMouseEnter={handleMouseEnterMaximize}
                                        onMouseLeave={handleMouseLeaveMaximize}
                                    >
                                        <div className="text-[11px] font-semibold text-white/60 mb-2 px-1">
                                            Snap Layouts
                                        </div>

                                        <div className="grid grid-cols-3 gap-2.5">
                                            {/* Preset 1: 50/50 Split */}
                                            <div className="flex flex-col gap-1 rounded-lg border border-white/10 p-1.5 bg-black/20 hover:border-blue-400/50 transition">
                                                <div className="grid grid-cols-2 gap-1 h-9">
                                                    <button
                                                        onClick={() => handleSelectSnap('left-50')}
                                                        className="rounded bg-white/15 hover:bg-blue-600 transition"
                                                        title="Snap Left 50%"
                                                    />
                                                    <button
                                                        onClick={() => handleSelectSnap('right-50')}
                                                        className="rounded bg-white/15 hover:bg-blue-600 transition"
                                                        title="Snap Right 50%"
                                                    />
                                                </div>
                                                <span className="text-[9px] text-center text-white/40">50 / 50</span>
                                            </div>

                                            {/* Preset 2: 60/40 Split */}
                                            <div className="flex flex-col gap-1 rounded-lg border border-white/10 p-1.5 bg-black/20 hover:border-blue-400/50 transition">
                                                <div className="flex gap-1 h-9">
                                                    <button
                                                        onClick={() => handleSelectSnap('left-60')}
                                                        className="w-[60%] rounded bg-white/15 hover:bg-blue-600 transition"
                                                        title="Snap Left 60%"
                                                    />
                                                    <button
                                                        onClick={() => handleSelectSnap('right-40')}
                                                        className="w-[40%] rounded bg-white/15 hover:bg-blue-600 transition"
                                                        title="Snap Right 40%"
                                                    />
                                                </div>
                                                <span className="text-[9px] text-center text-white/40">60 / 40</span>
                                            </div>

                                            {/* Preset 3: 3 Columns */}
                                            <div className="flex flex-col gap-1 rounded-lg border border-white/10 p-1.5 bg-black/20 hover:border-blue-400/50 transition">
                                                <div className="grid grid-cols-3 gap-1 h-9">
                                                    <button
                                                        onClick={() => handleSelectSnap('col3-left')}
                                                        className="rounded bg-white/15 hover:bg-blue-600 transition"
                                                        title="Snap Left Column"
                                                    />
                                                    <button
                                                        onClick={() => handleSelectSnap('col3-center')}
                                                        className="rounded bg-white/15 hover:bg-blue-600 transition"
                                                        title="Snap Center Column"
                                                    />
                                                    <button
                                                        onClick={() => handleSelectSnap('col3-right')}
                                                        className="rounded bg-white/15 hover:bg-blue-600 transition"
                                                        title="Snap Right Column"
                                                    />
                                                </div>
                                                <span className="text-[9px] text-center text-white/40">3 Columns</span>
                                            </div>

                                            {/* Preset 4: 2x2 Grid */}
                                            <div className="flex flex-col gap-1 rounded-lg border border-white/10 p-1.5 bg-black/20 hover:border-blue-400/50 transition">
                                                <div className="grid grid-cols-2 gap-1 h-9">
                                                    <button
                                                        onClick={() => handleSelectSnap('grid-tl')}
                                                        className="rounded bg-white/15 hover:bg-blue-600 transition h-4"
                                                        title="Top Left"
                                                    />
                                                    <button
                                                        onClick={() => handleSelectSnap('grid-tr')}
                                                        className="rounded bg-white/15 hover:bg-blue-600 transition h-4"
                                                        title="Top Right"
                                                    />
                                                    <button
                                                        onClick={() => handleSelectSnap('grid-bl')}
                                                        className="rounded bg-white/15 hover:bg-blue-600 transition h-4"
                                                        title="Bottom Left"
                                                    />
                                                    <button
                                                        onClick={() => handleSelectSnap('grid-br')}
                                                        className="rounded bg-white/15 hover:bg-blue-600 transition h-4"
                                                        title="Bottom Right"
                                                    />
                                                </div>
                                                <span className="text-[9px] text-center text-white/40">2 x 2 Grid</span>
                                            </div>

                                            {/* Preset 5: Priority Split */}
                                            <div className="flex flex-col gap-1 rounded-lg border border-white/10 p-1.5 bg-black/20 hover:border-blue-400/50 transition">
                                                <div className="flex gap-1 h-9">
                                                    <button
                                                        onClick={() => handleSelectSnap('priority-left')}
                                                        className="w-[60%] rounded bg-white/15 hover:bg-blue-600 transition"
                                                        title="Priority Main"
                                                    />
                                                    <div className="w-[40%] flex flex-col gap-1">
                                                        <button
                                                            onClick={() => handleSelectSnap('priority-tr')}
                                                            className="h-4 rounded bg-white/15 hover:bg-blue-600 transition"
                                                            title="Side Top"
                                                        />
                                                        <button
                                                            onClick={() => handleSelectSnap('priority-br')}
                                                            className="h-4 rounded bg-white/15 hover:bg-blue-600 transition"
                                                            title="Side Bottom"
                                                        />
                                                    </div>
                                                </div>
                                                <span className="text-[9px] text-center text-white/40">Priority</span>
                                            </div>

                                            {/* Preset 6: Top / Bottom */}
                                            <div className="flex flex-col gap-1 rounded-lg border border-white/10 p-1.5 bg-black/20 hover:border-blue-400/50 transition">
                                                <div className="flex flex-col gap-1 h-9">
                                                    <button
                                                        onClick={() => handleSelectSnap('top-50')}
                                                        className="h-4 rounded bg-white/15 hover:bg-blue-600 transition"
                                                        title="Top 50%"
                                                    />
                                                    <button
                                                        onClick={() => handleSelectSnap('bottom-50')}
                                                        className="h-4 rounded bg-white/15 hover:bg-blue-600 transition"
                                                        title="Bottom 50%"
                                                    />
                                                </div>
                                                <span className="text-[9px] text-center text-white/40">Top / Bottom</span>
                                            </div>

                                            {/* Open Windows Suggestions */}
                                            {otherOpenWindows.length > 0 && (
                                                <div className="col-span-3 mt-2 pt-2 border-t border-white/10">
                                                    <div className="text-[10px] font-semibold text-white/50 mb-1.5 px-0.5">
                                                        Open Windows ({otherOpenWindows.length})
                                                    </div>
                                                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                                                        {otherOpenWindows.map((other) => {
                                                            const OtherIcon = other.icon;
                                                            return (
                                                                <button
                                                                    key={other.id}
                                                                    onClick={() => {
                                                                        setSnapFlyoutOpen(false);
                                                                        onFocus(other.id);
                                                                    }}
                                                                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1 hover:bg-blue-600/30 hover:border-blue-400/50 transition shrink-0"
                                                                    title={`Switch to ${other.title}`}
                                                                >
                                                                    {OtherIcon && <OtherIcon className="h-3.5 w-3.5 text-blue-400" />}
                                                                    <span className="text-[10px] font-medium truncate max-w-[90px] text-white/90">{other.title}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <button
                            onClick={() => onClose(win.id)}
                            className="flex h-full w-11 items-center justify-center hover:bg-red-600 hover:text-white transition-colors"
                            aria-label="Close"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="min-h-0 flex-1 overflow-hidden bg-white dark:bg-[#1b1b1b]">{children}</div>
            </div>
        </motion.div>
    );
}
