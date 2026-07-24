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
    onOpenSnapFlyout,
    onCloseSnapFlyout,
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

    const handleMouseEnterMaximize = (e) => {
        if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current);
        const rect = e.currentTarget.getBoundingClientRect();
        snapTimeoutRef.current = setTimeout(() => {
            if (onOpenSnapFlyout) {
                onOpenSnapFlyout(win.id, {
                    right: rect.right,
                    bottom: rect.bottom,
                    left: rect.left,
                    top: rect.top,
                });
            }
        }, 500);
    };

    const handleMouseLeaveMaximize = () => {
        if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current);
        if (onCloseSnapFlyout) {
            onCloseSnapFlyout();
        }
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
            className={`absolute flex flex-col overflow-visible rounded-lg border border-white/20 dark:border-white/10 bg-[#f3f3f3]/95 text-neutral-900 shadow-2xl transition-shadow dark:bg-[#1e1e1e]/95 dark:text-neutral-100 ${
                active ? 'shadow-black/50 ring-1 ring-white/25 dark:ring-white/12' : 'shadow-black/25 opacity-[0.97]'
            }`}
            style={{ ...style, zIndex: win.z }}
            onMouseDown={() => onFocus(win.id)}
            onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
            }}
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
                    className="flex h-9 shrink-0 items-center justify-between win-mica bg-white/50 dark:bg-white/[0.06] border-b border-white/15 dark:border-white/[0.06]"
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
