"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { FaArrowLeft, FaChevronLeft, FaChevronRight } from 'react-icons/fa6';
import { trackEntityView } from '@/lib/track';
import useDevicePerformance from '../../../hooks/useDevicePerformance';
import { useV2Fx } from '../../landing/v2/gsap3d';

const formatDate = (dateValue) => {
    if (!dateValue) return '';
    const parsedDate = new Date(dateValue);
    if (Number.isNaN(parsedDate.getTime())) return '';
    return parsedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

/**
 * /v2/gallery — nothing but the pictures. The v1 page wraps the grid in
 * stats, search, and orientation filters; here the photographs ARE the page:
 * a full-bleed masonry wall where frames surface from depth as you scroll,
 * captioned only on hover, opening into a bare-bones lightbox (arrows, esc,
 * click-out — no chrome competing with the image).
 */
const GalleryV2 = ({ initialImages, initialConfig }) => {
    const images = useMemo(() => (Array.isArray(initialImages) ? initialImages : []), [initialImages]);
    const [brokenImageIds, setBrokenImageIds] = useState(() => new Set());
    const [selectedIndex, setSelectedIndex] = useState(-1);

    const sectionRef = useRef(null);
    const { prefersReducedMotion } = useDevicePerformance();

    const visibleImages = useMemo(
        () => images.filter((image, index) => !brokenImageIds.has(image?._id || `${image?.src}-${index}`)),
        [images, brokenImageIds]
    );

    const selectedImage = selectedIndex >= 0 ? visibleImages[selectedIndex] : null;

    useV2Fx(sectionRef, { reducedMotion: prefersReducedMotion });

    const markBroken = useCallback((key) => {
        setBrokenImageIds((prev) => {
            const next = new Set(prev);
            next.add(key);
            return next;
        });
    }, []);

    const openLightbox = useCallback((index) => {
        setSelectedIndex(index);
        const image = visibleImages[index];
        if (image) {
            trackEntityView({
                entityType: 'gallery',
                entityId: image._id || image.src,
                entitySlug: image.description
                    ? image.description.slice(0, 50).toLowerCase().replace(/[^a-z0-9]+/g, '-')
                    : 'gallery-item',
            });
        }
    }, [visibleImages]);

    const navigate = useCallback((direction) => {
        setSelectedIndex((current) => {
            if (current < 0 || visibleImages.length === 0) return current;
            return (current + direction + visibleImages.length) % visibleImages.length;
        });
    }, [visibleImages.length]);

    useEffect(() => {
        if (selectedIndex < 0) return undefined;

        const handleKeydown = (event) => {
            if (event.key === 'Escape') setSelectedIndex(-1);
            else if (event.key === 'ArrowLeft') navigate(-1);
            else if (event.key === 'ArrowRight') navigate(1);
        };

        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleKeydown);
        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', handleKeydown);
        };
    }, [selectedIndex, navigate]);

    return (
        <div ref={sectionRef} className="relative overflow-hidden">
            <div className="mx-auto w-full max-w-7xl px-6 pb-24 pt-32 sm:pt-40 lg:px-10">
                <div className="relative mb-12 sm:mb-16">
                    <span
                        data-v2-depth="-0.4"
                        aria-hidden="true"
                        className="pointer-events-none absolute -top-10 right-0 select-none text-[7rem] font-black leading-none tracking-tighter sm:-top-16 sm:text-[13rem]"
                        style={{
                            color: 'transparent',
                            WebkitTextStroke: '1.5px color-mix(in srgb, var(--accent-pink) 20%, transparent)',
                            opacity: 0.8,
                        }}
                    >
                        ◎
                    </span>

                    <p data-v2="line" className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.35em]" style={{ color: 'var(--accent-pink)' }}>
                        ~/gallery — visual archive
                    </p>
                    <h1
                        data-v2="line"
                        className="max-w-4xl text-4xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl"
                        style={{ color: 'var(--text-bright)' }}
                    >
                        {initialConfig?.galleryTitle || 'Just the frames.'}
                    </h1>
                    <p data-v2="rise" className="mt-5 max-w-2xl text-base leading-relaxed sm:text-lg" style={{ color: 'var(--text-tertiary)' }}>
                        {initialConfig?.gallerySubtitle || 'A visual journey through my lens.'}
                    </p>
                    <p data-v2="rise" className="mt-6 font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
                        <span data-counter={visibleImages.length}>{visibleImages.length}</span> photographs · no filters, no noise
                    </p>
                </div>

                {visibleImages.length > 0 ? (
                    <div className="columns-1 gap-5 sm:columns-2 lg:columns-3" style={{ perspective: '1600px' }}>
                        {visibleImages.map((image, index) => {
                            const imageKey = image?._id || `${image?.src}-${index}`;
                            const aspectRatio =
                                Number(image?.width) > 0 && Number(image?.height) > 0
                                    ? `${image.width} / ${image.height}`
                                    : '4 / 3';
                            const dateLabel = formatDate(image?.createdAt);

                            return (
                                <figure key={imageKey} data-v2="flip-x" className="mb-5 break-inside-avoid">
                                    <button
                                        type="button"
                                        onClick={() => openLightbox(index)}
                                        className="group relative block w-full cursor-zoom-in overflow-hidden rounded-lg"
                                        style={{ border: '1px solid var(--hairline)' }}
                                        aria-label={image?.description || `Photograph ${index + 1}`}
                                    >
                                        <span className="relative block w-full" style={{ aspectRatio }}>
                                            <Image
                                                src={image?.thumbnail || image?.src}
                                                alt={image?.description || 'Gallery photograph'}
                                                fill
                                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                                className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                                                loading={index < 3 ? 'eager' : 'lazy'}
                                                priority={index < 2}
                                                unoptimized
                                                onError={() => markBroken(imageKey)}
                                            />
                                        </span>

                                        <figcaption
                                            className="pointer-events-none absolute inset-x-0 bottom-0 flex items-baseline justify-between gap-3 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-10 text-left opacity-100 transition-opacity duration-300 sm:opacity-0 sm:group-hover:opacity-100"
                                        >
                                            <span className="line-clamp-1 min-w-0 font-mono text-xs text-white/90">
                                                {String(index + 1).padStart(3, '0')}{image?.description ? ` — ${image.description}` : ''}
                                            </span>
                                            {dateLabel && <span className="shrink-0 font-mono text-[0.65rem] uppercase tracking-wider text-white/60">{dateLabel}</span>}
                                        </figcaption>
                                    </button>
                                </figure>
                            );
                        })}
                    </div>
                ) : (
                    <p data-v2="rise" className="py-20 font-mono text-sm" style={{ color: 'var(--text-tertiary)' }}>
                        $ ls ~/gallery → empty. Photographs land here once uploaded from the admin panel.
                    </p>
                )}
            </div>

            {/* Bare-bones lightbox: the image, a caption, arrows. Nothing else. */}
            {selectedImage && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={selectedImage?.description || 'Photograph viewer'}
                    className="fixed inset-0 z-[110] flex flex-col bg-black"
                    onClick={(event) => {
                        if (event.target === event.currentTarget) setSelectedIndex(-1);
                    }}
                >
                    <div className="flex items-center justify-between px-4 py-3 font-mono text-xs text-white/70 sm:px-6">
                        <button
                            type="button"
                            onClick={() => setSelectedIndex(-1)}
                            className="inline-flex cursor-pointer items-center gap-2 py-2 pr-4 transition-colors hover:text-white"
                            aria-label="Close viewer"
                        >
                            <FaArrowLeft aria-hidden="true" /> esc
                        </button>
                        <span suppressHydrationWarning>
                            {String(selectedIndex + 1).padStart(3, '0')} / {String(visibleImages.length).padStart(3, '0')}
                        </span>
                    </div>

                    <div
                        className="relative min-h-0 flex-1 px-2 sm:px-16"
                        onClick={(event) => {
                            if (event.target === event.currentTarget) setSelectedIndex(-1);
                        }}
                    >
                        {/* Plain <img> so the browser handles arbitrary sizes with object-contain. */}
                        <img
                            src={selectedImage.src || selectedImage.thumbnail}
                            alt={selectedImage.description || 'Gallery photograph'}
                            className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                            draggable="false"
                        />

                        {visibleImages.length > 1 && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => navigate(-1)}
                                    className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/50 text-white/80 transition-colors hover:text-white sm:left-4"
                                    aria-label="Previous photograph"
                                >
                                    <FaChevronLeft />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigate(1)}
                                    className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/50 text-white/80 transition-colors hover:text-white sm:right-4"
                                    aria-label="Next photograph"
                                >
                                    <FaChevronRight />
                                </button>
                            </>
                        )}
                    </div>

                    <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-4 font-mono text-xs sm:px-6">
                        <p className="min-w-0 flex-1 truncate text-white/85">{selectedImage?.description || 'Untitled'}</p>
                        {formatDate(selectedImage?.createdAt) && (
                            <p className="shrink-0 uppercase tracking-wider text-white/50">{formatDate(selectedImage?.createdAt)}</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default GalleryV2;
