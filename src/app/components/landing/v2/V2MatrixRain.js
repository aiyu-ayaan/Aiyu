"use client";

import React, { useEffect, useRef } from 'react';

const GLYPHS = '01アイウエオカキクケコサシスセソ<>[]{}#$+*=/\\';
const COLUMN_WIDTH = 18;
const FRAME_MS = 1000 / 22; // ~22fps — plenty for rain, cheap on battery

/**
 * Classic matrix "digital rain" on a transparent canvas. Theme-agnostic:
 * trails fade via destination-out so the page background shows through, and
 * glyphs use the theme's success/cyan accents read from CSS variables.
 *
 * Deliberately frugal: DPR capped at 1, ~22fps, and drawing fully stops when
 * the canvas scrolls off-screen or the tab is hidden. Callers gate mounting
 * on device tier / reduced motion — this component assumes it may run.
 */
const V2MatrixRain = ({ className = '', opacity = 0.4 }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return undefined;
        const ctx = canvas.getContext('2d');
        if (!ctx) return undefined;

        const styles = getComputedStyle(document.documentElement);
        const headColor = styles.getPropertyValue('--status-success').trim() || '#34d399';
        const tailColor = styles.getPropertyValue('--accent-cyan').trim() || '#2997ff';

        let drops = [];
        let width = 0;
        let height = 0;

        const resize = () => {
            const rect = canvas.parentElement?.getBoundingClientRect();
            width = Math.max(1, Math.floor(rect?.width || window.innerWidth));
            height = Math.max(1, Math.floor(rect?.height || window.innerHeight));
            canvas.width = width;
            canvas.height = height;
            const columns = Math.ceil(width / COLUMN_WIDTH);
            drops = Array.from({ length: columns }, () => ({
                // Start above the fold at random depths so the rain is already
                // "in progress" on first paint instead of dropping as a curtain.
                y: Math.random() * -height,
                speed: 2.5 + Math.random() * 4,
            }));
            ctx.font = '14px ui-monospace, SFMono-Regular, Menlo, monospace';
        };

        let raf = 0;
        let last = 0;
        let visible = true;
        let inView = true;

        const tick = (now) => {
            raf = requestAnimationFrame(tick);
            if (!visible || !inView) return;
            if (now - last < FRAME_MS) return;
            last = now;

            // Fade existing trails toward transparent (not toward a bg color).
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
            ctx.fillRect(0, 0, width, height);
            ctx.globalCompositeOperation = 'source-over';

            drops.forEach((drop, i) => {
                const glyph = GLYPHS[(Math.random() * GLYPHS.length) | 0];
                const x = i * COLUMN_WIDTH;
                ctx.fillStyle = Math.random() > 0.12 ? tailColor : headColor;
                ctx.fillText(glyph, x, drop.y);
                drop.y += drop.speed * 3;
                if (drop.y > height + 40) {
                    drop.y = Math.random() * -200;
                    drop.speed = 2.5 + Math.random() * 4;
                }
            });
        };

        const onVisibility = () => {
            visible = document.visibilityState === 'visible';
        };

        const observer = new IntersectionObserver((entries) => {
            inView = entries[0]?.isIntersecting ?? true;
        });
        observer.observe(canvas);

        resize();
        window.addEventListener('resize', resize);
        document.addEventListener('visibilitychange', onVisibility);
        raf = requestAnimationFrame(tick);

        return () => {
            cancelAnimationFrame(raf);
            observer.disconnect();
            window.removeEventListener('resize', resize);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className={`pointer-events-none absolute inset-0 ${className}`}
            style={{ opacity }}
            aria-hidden="true"
        />
    );
};

export default V2MatrixRain;
