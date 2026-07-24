"use client";
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Minus, Square, X, Copy } from 'lucide-react';

// A single draggable Win11-style window. Position/size live in the parent so the
// window manager can persist z-order and maximize state; this component owns the
// pointer-drag interaction only.
export default function Window({
    win,
    active,
    onFocus,
    onClose,
    onMinimize,
    onToggleMaximize,
    onMove,
    children,
}) {
    const dragRef = useRef(null);
    const [dragging, setDragging] = useState(false);

    const startDrag = useCallback(
        (e) => {
            if (win.maximized) return;
            // Ignore drags that start on the window control buttons.
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

    // Escape restores a maximized window — small nicety.
    useEffect(() => {
        if (!active) return;
        const onKey = (e) => {
            if (e.key === 'Escape' && win.maximized) onToggleMaximize(win.id);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [active, win.maximized, win.id, onToggleMaximize]);

    const style = win.maximized
        ? { left: 0, top: 0, width: '100%', height: 'calc(100vh - 48px)', borderRadius: 0 }
        : { left: win.x, top: win.y, width: win.w, height: win.h };

    const Icon = win.icon;

    return (
        <div
            className={`absolute flex flex-col overflow-hidden rounded-lg border border-white/15 bg-[#f3f3f3] text-neutral-900 shadow-2xl transition-shadow dark:bg-[#202020] dark:text-neutral-100 ${
                active ? 'shadow-black/50' : 'shadow-black/25'
            } ${win.minimized ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
            style={{ ...style, zIndex: win.z, transitionProperty: dragging ? 'none' : undefined }}
            onMouseDown={() => onFocus(win.id)}
            role="dialog"
            aria-label={win.title}
        >
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
                <div className="flex h-full" data-noswipe>
                    <button
                        onClick={() => onMinimize(win.id)}
                        className="flex h-full w-11 items-center justify-center hover:bg-black/10 dark:hover:bg-white/10"
                        aria-label="Minimize"
                    >
                        <Minus className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => onToggleMaximize(win.id)}
                        className="flex h-full w-11 items-center justify-center hover:bg-black/10 dark:hover:bg-white/10"
                        aria-label="Maximize"
                    >
                        {win.maximized ? <Copy className="h-3.5 w-3.5" /> : <Square className="h-3 w-3" />}
                    </button>
                    <button
                        onClick={() => onClose(win.id)}
                        className="flex h-full w-11 items-center justify-center hover:bg-red-600 hover:text-white"
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="min-h-0 flex-1 overflow-hidden bg-white dark:bg-[#1b1b1b]">{children}</div>
        </div>
    );
}
