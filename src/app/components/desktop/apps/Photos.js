"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    ZoomIn,
    ZoomOut,
    RotateCw,
    Maximize2,
    Download,
    Loader2,
    ImageOff,
    Info,
    X,
} from 'lucide-react';
import { useDeviceMode } from '../../../context/DeviceModeContext';

// Windows 11 Photos clone. Opened from File Explorer with a payload of
// { images: [{ src, thumbnail, description }], index } — or standalone, in
// which case it loads the gallery itself. Supports zoom, rotate, keyboard
// navigation and a bottom filmstrip, mirroring the real Photos viewer.
export default function Photos({ payload }) {
    const { isMobile, isTablet } = useDeviceMode();
    const [images, setImages] = useState(payload?.images || []);
    const [index, setIndex] = useState(payload?.index || 0);
    const [loading, setLoading] = useState(!payload?.images);
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [broken, setBroken] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [showSidebar, setShowSidebar] = useState(false);
    const filmRef = useRef(null);

    // Standalone launch (no payload): pull the gallery so Photos still works
    // when opened straight from the Start menu.
    useEffect(() => {
        if (payload?.images) return;
        let alive = true;
        (async () => {
            try {
                const g = await fetch('/api/gallery').then((r) => r.json()).catch(() => null);
                if (!alive) return;
                setImages(g?.data || []);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [payload]);

    // A fresh payload (Explorer reused the open Photos window) resets the view.
    useEffect(() => {
        if (payload?.images) {
            setImages(payload.images);
            setIndex(payload.index || 0);
        }
    }, [payload]);

    const current = images[index];

    const resetView = useCallback(() => {
        setZoom(1);
        setRotation(0);
        setBroken(false);
    }, []);

    const go = useCallback(
        (dir) => {
            setIndex((i) => {
                const next = (i + dir + images.length) % images.length;
                return images.length ? next : 0;
            });
            resetView();
        },
        [images.length, resetView]
    );

    // Keyboard: arrows navigate, +/- zoom.
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'ArrowRight') go(1);
            else if (e.key === 'ArrowLeft') go(-1);
            else if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(z + 0.25, 4));
            else if (e.key === '-') setZoom((z) => Math.max(z - 0.25, 0.25));
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [go]);

    // Keep the active filmstrip thumbnail in view.
    useEffect(() => {
        const el = filmRef.current?.querySelector(`[data-idx="${index}"]`);
        el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }, [index]);

    const counter = useMemo(
        () => (images.length ? `${index + 1} / ${images.length}` : '0 / 0'),
        [index, images.length]
    );

    const touchStartX = useRef(null);
    const touchStartY = useRef(null);

    if (loading) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-[#1b1b1b] text-white/60">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        );
    }

    if (!current) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#1b1b1b] text-white/50">
                <ImageOff className="h-8 w-8" />
                <span className="text-sm">No photos to show</span>
            </div>
        );
    }
    const handleTouchStart = (e) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
    };
    const handleTouchEnd = (e) => {
        if (!touchStartX.current || !touchStartY.current) return;
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const dx = touchStartX.current - touchEndX;
        const dy = touchStartY.current - touchEndY;
        
        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 50) go(1);
            else if (dx < -50) go(-1);
        } else {
            if (dy > 50 || dy < -50) setLightboxOpen(false);
        }
        touchStartX.current = null;
        touchStartY.current = null;
    };

    if (isMobile) {
        return (
            <div className="flex h-full w-full flex-col bg-white dark:bg-black text-neutral-900 dark:text-white relative">
                <div className="flex items-center justify-between p-4 border-b border-black/10 dark:border-white/10">
                    <h2 className="text-lg font-semibold">Photos</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-1 grid grid-cols-3 gap-1">
                    {images.map((img, i) => (
                        <button
                            key={img._id || img.src || i}
                            onClick={() => { setIndex(i); resetView(); setLightboxOpen(true); }}
                            className="aspect-square w-full overflow-hidden bg-neutral-200 dark:bg-neutral-800"
                        >
                            <img src={img.thumbnail || img.src} alt="" className="h-full w-full object-cover" loading="lazy" />
                        </button>
                    ))}
                </div>
                
                {lightboxOpen && current && (
                    <div className="fixed inset-0 z-[100] flex flex-col bg-black text-white">
                        <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent absolute top-0 w-full z-10 pointer-events-none">
                            <button onClick={() => setLightboxOpen(false)} className="rounded-full p-2 hover:bg-white/20 backdrop-blur pointer-events-auto">
                                <ChevronLeft className="h-6 w-6" />
                            </button>
                            <span className="text-sm font-medium">{counter}</span>
                            <div className="w-10"></div>
                        </div>
                        <div
                            className="flex-1 relative flex items-center justify-center overflow-hidden touch-none"
                            onTouchStart={handleTouchStart}
                            onTouchEnd={handleTouchEnd}
                        >
                             <img
                                src={current.src}
                                alt={current.description || ''}
                                className="max-h-full max-w-full object-contain"
                             />
                        </div>
                        {current.description && (
                            <div className="absolute bottom-0 w-full p-4 bg-gradient-to-t from-black/80 to-transparent text-sm text-center">
                                {current.description}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    if (isTablet) {
        return (
            <div className="flex h-full w-full bg-white dark:bg-[#1b1b1b] text-neutral-900 dark:text-white">
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex items-center justify-between p-4 border-b border-black/10 dark:border-white/10">
                        <h2 className="text-xl font-bold">Photos</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 grid grid-cols-3 gap-4">
                        {images.map((img, i) => (
                            <button
                                key={img._id || img.src || i}
                                onClick={() => { setIndex(i); resetView(); setShowSidebar(true); }}
                                className={`aspect-square w-full overflow-hidden rounded-xl bg-neutral-200 dark:bg-neutral-800 border-2 transition ${i === index && showSidebar ? 'border-blue-500' : 'border-transparent'}`}
                            >
                                <img src={img.thumbnail || img.src} alt="" className="h-full w-full object-cover" loading="lazy" />
                            </button>
                        ))}
                    </div>
                </div>
                {showSidebar && current && (
                    <div className="w-80 flex flex-col border-l border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-[#262626]">
                        <div className="flex items-center justify-between p-4 border-b border-black/10 dark:border-white/10">
                            <span className="font-medium">Details</span>
                            <button onClick={() => setShowSidebar(false)} className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/10">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-4 flex-1 overflow-y-auto space-y-6">
                            <div className="aspect-video w-full rounded-lg overflow-hidden bg-black/5 dark:bg-white/5 flex items-center justify-center">
                                <img src={current.src} alt="" className="max-h-full max-w-full object-contain" />
                            </div>
                            <div className="space-y-4 text-sm">
                                <div className="space-y-1">
                                    <div className="text-neutral-500 dark:text-neutral-400">Description</div>
                                    <div>{current.description || 'No description provided'}</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-neutral-500 dark:text-neutral-400">File Type</div>
                                    <div>{extOf(current.src)}</div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-neutral-500 dark:text-neutral-400">Position</div>
                                    <div>{counter}</div>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-black/10 dark:border-white/10 flex gap-2">
                             <a
                                href={current.src}
                                target="_blank"
                                rel="noreferrer"
                                download
                                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-500 transition"
                            >
                                <Download className="h-4 w-4" />
                                Download
                            </a>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex h-full w-full flex-col bg-[#1b1b1b] text-white">
            {/* Command bar */}
            <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-[#262626] px-3 py-1.5 text-xs">
                <span className="truncate opacity-80">{current.description || 'Photo'}</span>
                <div className="flex items-center gap-0.5">
                    <ToolBtn label="Zoom out" onClick={() => setZoom((z) => Math.max(z - 0.25, 0.25))}>
                        <ZoomOut className="h-4 w-4" />
                    </ToolBtn>
                    <span className="w-12 text-center tabular-nums opacity-70">{Math.round(zoom * 100)}%</span>
                    <ToolBtn label="Zoom in" onClick={() => setZoom((z) => Math.min(z + 0.25, 4))}>
                        <ZoomIn className="h-4 w-4" />
                    </ToolBtn>
                    <ToolBtn label="Fit to window" onClick={resetView}>
                        <Maximize2 className="h-4 w-4" />
                    </ToolBtn>
                    <ToolBtn label="Rotate" onClick={() => setRotation((r) => (r + 90) % 360)}>
                        <RotateCw className="h-4 w-4" />
                    </ToolBtn>
                    <ToolBtn label="Info" active={showInfo} onClick={() => setShowInfo((v) => !v)}>
                        <Info className="h-4 w-4" />
                    </ToolBtn>
                    <a
                        href={current.src}
                        target="_blank"
                        rel="noreferrer"
                        download
                        title="Open original"
                        className="flex h-8 w-8 items-center justify-center rounded hover:bg-white/10"
                    >
                        <Download className="h-4 w-4" />
                    </a>
                </div>
            </div>

            {/* Stage */}
            <div className="relative min-h-0 flex-1 overflow-hidden">
                <div className="flex h-full w-full items-center justify-center p-4">
                    {broken ? (
                        <div className="flex flex-col items-center gap-2 text-white/40">
                            <ImageOff className="h-8 w-8" />
                            <span className="text-sm">Couldn&apos;t load this image</span>
                        </div>
                    ) : (
                        <img
                            key={current.src}
                            src={current.src}
                            alt={current.description || ''}
                            onError={() => setBroken(true)}
                            className="max-h-full max-w-full select-none object-contain transition-transform duration-150"
                            style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
                            draggable={false}
                        />
                    )}
                </div>

                {/* Prev / next */}
                {images.length > 1 && (
                    <>
                        <NavArrow side="left" onClick={() => go(-1)}>
                            <ChevronLeft className="h-6 w-6" />
                        </NavArrow>
                        <NavArrow side="right" onClick={() => go(1)}>
                            <ChevronRight className="h-6 w-6" />
                        </NavArrow>
                    </>
                )}

                {/* Counter pill */}
                <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-[11px] tabular-nums backdrop-blur">
                    {counter}
                </div>

                {/* Info panel */}
                {showInfo && (
                    <div className="absolute right-3 top-3 w-56 rounded-lg border border-white/10 bg-black/70 p-3 text-xs backdrop-blur">
                        <div className="mb-2 font-semibold">Details</div>
                        <InfoRow k="Name" v={current.description || 'Untitled'} />
                        <InfoRow k="Type" v={extOf(current.src)} />
                        <InfoRow k="Position" v={counter} />
                    </div>
                )}
            </div>

            {/* Filmstrip */}
            {images.length > 1 && (
                <div ref={filmRef} className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-t border-white/10 bg-[#141414] p-2">
                    {images.map((img, i) => (
                        <button
                            key={img._id || img.src || i}
                            data-idx={i}
                            onClick={() => {
                                setIndex(i);
                                resetView();
                            }}
                            className={`h-12 w-16 shrink-0 overflow-hidden rounded border-2 transition ${
                                i === index ? 'border-blue-400' : 'border-transparent opacity-60 hover:opacity-100'
                            }`}
                        >
                            <img src={img.thumbnail || img.src} alt="" className="h-full w-full object-cover" loading="lazy" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function ToolBtn({ children, label, onClick, active }) {
    return (
        <button
            onClick={onClick}
            title={label}
            aria-label={label}
            className={`flex h-8 w-8 items-center justify-center rounded hover:bg-white/10 ${active ? 'bg-white/15 text-blue-300' : ''}`}
        >
            {children}
        </button>
    );
}

function NavArrow({ side, children, onClick }) {
    return (
        <button
            onClick={onClick}
            aria-label={side === 'left' ? 'Previous' : 'Next'}
            className={`absolute top-1/2 -translate-y-1/2 ${side === 'left' ? 'left-2' : 'right-2'} flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white/90 backdrop-blur transition hover:bg-black/70`}
        >
            {children}
        </button>
    );
}

function InfoRow({ k, v }) {
    return (
        <div className="flex justify-between gap-3 py-0.5">
            <span className="opacity-50">{k}</span>
            <span className="truncate text-right">{v}</span>
        </div>
    );
}

function extOf(src = '') {
    const m = /\.([a-z0-9]+)(?:\?|$)/i.exec(src);
    return m ? m[1].toUpperCase() + ' image' : 'Image';
}
