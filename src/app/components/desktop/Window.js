"use client";
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Minus, Square, X, Copy } from 'lucide-react';
import { motion } from 'framer-motion';

const MIN_W = 320;
const MIN_H = 200;
const TASKBAR_H = 48;

// A single draggable & resizable Win11-style window with Snap Layouts.
//
// Drag and resize deliberately bypass React: a pointermove that went through
// setState would re-render the whole Desktop tree (every open window plus its
// app content) 60-120 times a second. Instead the geometry is written straight
// to this node's style inside a rAF and committed to Desktop state once, on
// pointerup.
function Window({
    win,
    active,
    onFocus,
    onClose,
    onMinimize,
    onToggleMaximize,
    onMove,
    onResize,
    onOpenSnapFlyout,
    onCloseSnapFlyout,
    children,
}) {
    const nodeRef = useRef(null);
    const dragRef = useRef(null);
    const resizeRef = useRef(null);
    const frameRef = useRef(0);
    const pendingRef = useRef(null);
    const [interacting, setInteracting] = useState(false);
    const snapTimeoutRef = useRef(null);

    // Coalesce pointermove geometry into one style write per frame.
    const flush = useCallback(() => {
        frameRef.current = 0;
        const node = nodeRef.current;
        const next = pendingRef.current;
        if (!node || !next) return;
        node.style.left = `${next.x}px`;
        node.style.top = `${next.y}px`;
        if (next.w != null) {
            node.style.width = `${next.w}px`;
            node.style.height = `${next.h}px`;
        }
    }, []);

    const schedule = useCallback(
        (geometry) => {
            pendingRef.current = geometry;
            if (frameRef.current) return;
            frameRef.current = requestAnimationFrame(flush);
        },
        [flush]
    );

    useEffect(
        () => () => {
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
            if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current);
        },
        []
    );

    const startDrag = useCallback(
        (e) => {
            if (win.maximized) return;
            if (e.target.closest('[data-noswipe]')) return;
            onFocus(win.id);
            dragRef.current = {
                startX: e.clientX,
                startY: e.clientY,
                originX: win.x,
                originY: win.y,
                x: win.x,
                y: win.y,
            };
            setInteracting(true);
            e.currentTarget.setPointerCapture?.(e.pointerId);
        },
        [win.maximized, win.id, win.x, win.y, onFocus]
    );

    const onDrag = useCallback(
        (e) => {
            const drag = dragRef.current;
            if (!drag) return;
            const maxWorkHeight = window.innerHeight - TASKBAR_H;
            drag.x = drag.originX + (e.clientX - drag.startX);
            drag.y = Math.min(
                Math.max(0, drag.originY + (e.clientY - drag.startY)),
                Math.max(0, maxWorkHeight - 36)
            );
            schedule({ x: drag.x, y: drag.y });
        },
        [schedule]
    );

    const endDrag = useCallback(
        (e) => {
            const drag = dragRef.current;
            dragRef.current = null;
            setInteracting(false);
            e.currentTarget.releasePointerCapture?.(e.pointerId);
            if (!drag) return;
            if (frameRef.current) {
                cancelAnimationFrame(frameRef.current);
                frameRef.current = 0;
            }
            pendingRef.current = null;
            if (drag.x !== drag.originX || drag.y !== drag.originY) onMove(win.id, drag.x, drag.y);
        },
        [win.id, onMove]
    );

    // Pointer-down handler for 8 resize handles
    const startResize = useCallback(
        (handle, e) => {
            e.stopPropagation();
            if (win.maximized) return;
            onFocus(win.id);
            resizeRef.current = {
                handle,
                startX: e.clientX,
                startY: e.clientY,
                originX: win.x,
                originY: win.y,
                originW: win.w,
                originH: win.h,
                x: win.x,
                y: win.y,
                w: win.w,
                h: win.h,
            };
            setInteracting(true);
            e.currentTarget.setPointerCapture?.(e.pointerId);
        },
        [win.maximized, win.id, win.x, win.y, win.w, win.h, onFocus]
    );

    const onResizePointer = useCallback(
        (e) => {
            const state = resizeRef.current;
            if (!state) return;
            const { handle, startX, startY, originX, originY, originW, originH } = state;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            let nextX = originX;
            let nextY = originY;
            let nextW = originW;
            let nextH = originH;

            if (handle.includes('e')) {
                nextW = Math.max(MIN_W, originW + dx);
            }
            if (handle.includes('s')) {
                nextH = Math.max(MIN_H, originH + dy);
            }
            if (handle.includes('w')) {
                const possibleW = originW - dx;
                if (possibleW >= MIN_W) {
                    nextW = possibleW;
                    nextX = originX + dx;
                }
            }
            if (handle.includes('n')) {
                const possibleH = originH - dy;
                if (possibleH >= MIN_H) {
                    nextH = possibleH;
                    nextY = originY + dy;
                }
            }

            state.x = nextX;
            state.y = nextY;
            state.w = nextW;
            state.h = nextH;
            schedule({ x: nextX, y: nextY, w: nextW, h: nextH });
        },
        [schedule]
    );

    const endResize = useCallback(
        (e) => {
            const state = resizeRef.current;
            resizeRef.current = null;
            setInteracting(false);
            e.currentTarget.releasePointerCapture?.(e.pointerId);
            if (!state || !onResize) return;
            if (frameRef.current) {
                cancelAnimationFrame(frameRef.current);
                frameRef.current = 0;
            }
            pendingRef.current = null;
            if (state.w !== state.originW || state.h !== state.originH || state.x !== state.originX || state.y !== state.originY) {
                onResize(win.id, state.x, state.y, state.w, state.h);
            }
        },
        [win.id, onResize]
    );

    useEffect(() => {
        if (!active || !win.maximized) return;
        const onKey = (e) => {
            if (e.key === 'Escape') onToggleMaximize(win.id);
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

    const style = win.maximized
        ? { left: 0, top: 0, width: '100%', height: `calc(100vh - ${TASKBAR_H}px)`, borderRadius: 0 }
        : { left: win.x, top: win.y, width: win.w, height: win.h };

    const Icon = win.icon;

    // Only opacity/transform are animated. Animating `filter: blur()` forced a
    // full re-raster of the window's entire app content on every frame of the
    // open, close and minimize transitions.
    const animateState = win.minimized
        ? { opacity: 0, scale: 0.82, y: 60, pointerEvents: 'none' }
        : { opacity: 1, scale: 1, y: 0, pointerEvents: 'auto' };

    return (
        <motion.div
            ref={nodeRef}
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={animateState}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={interacting ? { duration: 0 } : { duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={`absolute flex flex-col overflow-visible rounded-lg border border-white/20 dark:border-white/10 bg-[#f3f3f3]/95 text-neutral-900 shadow-2xl transition-shadow dark:bg-[#1e1e1e]/95 dark:text-neutral-100 ${
                active ? 'shadow-black/50 ring-1 ring-white/25 dark:ring-white/12' : 'shadow-black/25 opacity-[0.97]'
            }`}
            style={{ ...style, zIndex: win.z, willChange: interacting ? 'left, top, width, height' : 'auto' }}
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
                    onPointerCancel={endDrag}
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

// Windows are siblings in one flat list, so without memoization focusing or
// moving any window re-rendered all of them and all of their app content.
export default React.memo(Window);
