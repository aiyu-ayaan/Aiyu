'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Info,
  Minus,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { GalleryPageSkeleton } from '../../components/shared/skeletons/PublicPageSkeletons';
import RouteBetaBadge from '../../components/shared/RouteBetaBadge';

const getImageInitials = (description) => {
  const words = String(description || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return 'GL';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
};

const getPlaceholderGradient = (seed) => {
  const gradients = [
    'linear-gradient(135deg, color-mix(in srgb, var(--accent-cyan) 24%, var(--bg-surface)), color-mix(in srgb, var(--accent-purple) 18%, var(--bg-secondary)))',
    'linear-gradient(135deg, color-mix(in srgb, var(--accent-orange) 24%, var(--bg-surface)), color-mix(in srgb, var(--accent-pink) 18%, var(--bg-secondary)))',
    'linear-gradient(135deg, color-mix(in srgb, var(--accent-purple) 24%, var(--bg-surface)), color-mix(in srgb, var(--accent-cyan) 17%, var(--bg-secondary)))',
    'linear-gradient(135deg, color-mix(in srgb, var(--accent-pink) 24%, var(--bg-surface)), color-mix(in srgb, var(--accent-orange) 17%, var(--bg-secondary)))',
  ];

  const safeSeed = String(seed || 'gallery');
  const hash = Array.from(safeSeed).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return gradients[hash % gradients.length];
};

const formatDate = (dateValue) => {
  if (!dateValue) return 'Unknown date';
  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) return 'Unknown date';
  return parsedDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const getOrientation = (item) => {
  const width = Number(item?.width) || 0;
  const height = Number(item?.height) || 0;
  if (width <= 0 || height <= 0) return 'unknown';
  if (width === height) return 'square';
  return width > height ? 'landscape' : 'portrait';
};

const getColumnCount = (viewportWidth, totalItems) => {
  const safeTotal = Math.max(1, totalItems || 0);
  let preferred = 4;

  if (viewportWidth < 700) preferred = 1;
  else if (viewportWidth < 1024) preferred = 2;
  else if (viewportWidth < 1400) preferred = 3;

  if (safeTotal <= 6 && preferred === 4) preferred = 3;

  return Math.max(1, Math.min(preferred, safeTotal));
};

const GalleryClient = ({ initialImages, initialConfig }) => {
  const hasInitialData = initialImages !== undefined || initialConfig !== undefined;
  const [images, setImages] = useState(Array.isArray(initialImages) ? initialImages : []);
  const [loading, setLoading] = useState(!hasInitialData);
  const [selectedImage, setSelectedImage] = useState(null);
  const [modalImageError, setModalImageError] = useState(false);
  const [viewerZoom, setViewerZoom] = useState(1);
  const [viewerOffset, setViewerOffset] = useState({ x: 0, y: 0 });
  const [showViewerInfo, setShowViewerInfo] = useState(false);
  const [isSpacePanning, setIsSpacePanning] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const dragStartRef = useRef(null);
  const canPanViewer = viewerZoom >= 1.5;
  const [brokenImageIds, setBrokenImageIds] = useState(new Set());
  const [viewportWidth, setViewportWidth] = useState(1280);
  const [headerInfo, setHeaderInfo] = useState(() => ({
    title: initialConfig?.galleryTitle || 'Gallery',
    subtitle: initialConfig?.gallerySubtitle || 'A visual journey through my lens.',
  }));
  const [searchQuery, setSearchQuery] = useState('');
  const [orientationFilter, setOrientationFilter] = useState('all');

  useEffect(() => {
    if (hasInitialData) {
      return;
    }

    const fetchData = async () => {
      try {
        const [galleryRes, configRes] = await Promise.all([
          fetch('/api/gallery'),
          fetch('/api/config'),
        ]);

        const galleryData = await galleryRes.json();
        if (galleryData?.success) {
          setImages(Array.isArray(galleryData.data) ? galleryData.data : []);
        }

        if (configRes.ok) {
          const configData = await configRes.json();
          setHeaderInfo({
            title: configData?.galleryTitle || 'Gallery',
            subtitle: configData?.gallerySubtitle || 'A visual journey through my lens.',
          });
        }
      } catch (error) {
        console.error('Failed to fetch gallery data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [hasInitialData]);

  useEffect(() => {
    const updateViewportWidth = () => setViewportWidth(window.innerWidth);
    updateViewportWidth();
    window.addEventListener('resize', updateViewportWidth);
    return () => window.removeEventListener('resize', updateViewportWidth);
  }, []);

  const markImageBroken = useCallback((id) => {
    setBrokenImageIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const filteredImages = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return images.filter((item) => {
      const description = String(item?.description || '').toLowerCase();
      const orientation = getOrientation(item);

      const matchesSearch = !normalizedSearch || description.includes(normalizedSearch);
      const matchesOrientation = orientationFilter === 'all' || orientation === orientationFilter;

      return matchesSearch && matchesOrientation;
    });
  }, [images, searchQuery, orientationFilter]);

  const stats = useMemo(() => {
    const portrait = images.filter((item) => getOrientation(item) === 'portrait').length;
    const landscape = images.filter((item) => getOrientation(item) === 'landscape').length;
    const latestTimestamp = images.reduce((latest, item) => {
      const current = new Date(item?.createdAt || 0).getTime();
      return Number.isFinite(current) && current > latest ? current : latest;
    }, 0);

    return {
      total: images.length,
      portrait,
      landscape,
      latest: latestTimestamp > 0 ? formatDate(latestTimestamp) : 'N/A',
    };
  }, [images]);

  const activeFilters = [
    orientationFilter !== 'all' ? `Orientation: ${orientationFilter}` : null,
    searchQuery.trim() ? `Search: ${searchQuery.trim()}` : null,
  ].filter(Boolean);

  const selectedImageIndex = useMemo(() => {
    if (!selectedImage) return -1;
    const selectedKey = selectedImage?._id || selectedImage?.src;
    return filteredImages.findIndex((image) => (image?._id || image?.src) === selectedKey);
  }, [filteredImages, selectedImage]);

  const navigateViewer = useCallback((direction) => {
    if (!selectedImage || filteredImages.length <= 1) return;
    const currentIndex = selectedImageIndex >= 0 ? selectedImageIndex : 0;
    const nextIndex = (currentIndex + direction + filteredImages.length) % filteredImages.length;
    setModalImageError(false);
    setViewerZoom(1);
    setViewerOffset({ x: 0, y: 0 });
    setSelectedImage(filteredImages[nextIndex]);
  }, [filteredImages, selectedImage, selectedImageIndex]);

  const updateViewerZoom = useCallback((nextZoom) => {
    const normalizedZoom = Math.min(4, Math.max(1, nextZoom));
    setViewerZoom(normalizedZoom);
    if (normalizedZoom === 1) {
      setViewerOffset({ x: 0, y: 0 });
    }
  }, []);

  const handleViewerWheel = useCallback((event) => {
    if (!selectedImage) return;
    event.preventDefault();
    const direction = event.deltaY > 0 ? -1 : 1;
    updateViewerZoom(viewerZoom + direction * 0.15);
  }, [selectedImage, updateViewerZoom, viewerZoom]);

  const handleViewerPointerDown = useCallback((event) => {
    if (!isSpacePanning || !canPanViewer) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setIsDraggingImage(true);
    dragStartRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      offsetX: viewerOffset.x,
      offsetY: viewerOffset.y,
    };
  }, [canPanViewer, isSpacePanning, viewerOffset.x, viewerOffset.y]);

  const handleViewerPointerMove = useCallback((event) => {
    if (!isDraggingImage || !dragStartRef.current) return;
    const deltaX = event.clientX - dragStartRef.current.pointerX;
    const deltaY = event.clientY - dragStartRef.current.pointerY;
    setViewerOffset({
      x: dragStartRef.current.offsetX + deltaX,
      y: dragStartRef.current.offsetY + deltaY,
    });
  }, [isDraggingImage]);

  const stopViewerDrag = useCallback((event) => {
    event?.currentTarget?.releasePointerCapture?.(event.pointerId);
    setIsDraggingImage(false);
    dragStartRef.current = null;
  }, []);

  useEffect(() => {
    const handleViewerKeydown = (event) => {
      if (!selectedImage) return;

      if (event.key === 'Escape') {
        setSelectedImage(null);
      } else if (event.code === 'Space' && !event.repeat) {
        event.preventDefault();
        event.stopPropagation();
        if (canPanViewer) {
          setIsSpacePanning(true);
        }
      } else if (event.key === 'ArrowLeft') {
        navigateViewer(-1);
      } else if (event.key === 'ArrowRight') {
        navigateViewer(1);
      } else if (event.key === '+' || event.key === '=') {
        updateViewerZoom(viewerZoom + 0.25);
      } else if (event.key === '-' || event.key === '_') {
        updateViewerZoom(viewerZoom - 0.25);
      } else if (event.key === '0') {
        updateViewerZoom(1);
      }
    };

    const handleViewerKeyup = (event) => {
      if (event.code === 'Space') {
        event.preventDefault();
        event.stopPropagation();
        setIsSpacePanning(false);
        setIsDraggingImage(false);
        dragStartRef.current = null;
      }
    };

    window.addEventListener('keydown', handleViewerKeydown, true);
    window.addEventListener('keyup', handleViewerKeyup, true);
    return () => {
      window.removeEventListener('keydown', handleViewerKeydown, true);
      window.removeEventListener('keyup', handleViewerKeyup, true);
    };
  }, [canPanViewer, navigateViewer, selectedImage, updateViewerZoom, viewerZoom]);

  const columnCount = useMemo(
    () => getColumnCount(viewportWidth, filteredImages.length),
    [viewportWidth, filteredImages.length]
  );

  const balancedColumns = useMemo(() => {
    const columns = Array.from({ length: columnCount }, () => ({
      height: 0,
      items: [],
    }));

    filteredImages.forEach((image, globalIndex) => {
      const width = Number(image?.width) || 4;
      const height = Number(image?.height) || 3;
      const normalizedHeight = Math.max(0.5, height / Math.max(width, 1));

      let targetColumn = 0;
      for (let index = 1; index < columns.length; index += 1) {
        if (columns[index].height < columns[targetColumn].height) {
          targetColumn = index;
        }
      }

      columns[targetColumn].items.push({ image, globalIndex });
      columns[targetColumn].height += normalizedHeight + 0.18;
    });

    return columns.map((column) => column.items);
  }, [filteredImages, columnCount]);

  const getFileExtension = useCallback((srcUrl) => {
    const originalFilename = String(srcUrl || '').split('/').pop() || '';
    return originalFilename.includes('.') ? originalFilename.split('.').pop() : 'jpg';
  }, []);

  const handleDownload = useCallback(async (event, image) => {
    event.preventDefault();
    event.stopPropagation();
    if (!image?.src) return;

    try {
      const response = await fetch(image.src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      let filename;
      if (image.description && image.description.trim()) {
        const sanitized = image.description
          .trim()
          .substring(0, 100)
          .replace(/[/\\?%*:|"<>\\x00-\\x1f]/g, '-')
          .replace(/\s+/g, '_')
          .replace(/\.+$/, '');

        if (sanitized.length >= 3) {
          filename = `${sanitized}.${getFileExtension(image.src)}`;
        }
      }

      if (!filename) {
        const timestamp = new Date().toISOString().split('T')[0];
        const imageIdShort = image._id ? image._id.slice(0, 8) : Date.now().toString(36);
        filename = `gallery_${timestamp}_${imageIdShort}.${getFileExtension(image.src)}`;
      }

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  }, [getFileExtension]);

  const openLightbox = (image) => {
    setModalImageError(false);
    setViewerZoom(1);
    setViewerOffset({ x: 0, y: 0 });
    setShowViewerInfo(false);
    setIsSpacePanning(false);
    setIsDraggingImage(false);
    setSelectedImage(image);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setOrientationFilter('all');
  };

  if (loading) {
    return <GalleryPageSkeleton />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className="relative min-h-screen overflow-hidden p-4 lg:p-8"
      style={{ color: 'var(--text-primary)' }}
    >
      <div className="pointer-events-none absolute -left-24 top-8 h-72 w-72 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--accent-cyan) 30%, transparent), transparent 70%)' }} />
      <div className="pointer-events-none absolute -right-20 top-1/4 h-64 w-64 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--accent-purple) 24%, transparent), transparent 70%)' }} />

      <div className="relative mx-auto w-full max-w-[95%] lg:max-w-[80%]">
        <section
          className="rounded-3xl border p-6 sm:p-8"
          style={{
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 93%, transparent), color-mix(in srgb, var(--bg-secondary) 93%, transparent))',
            borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
            boxShadow: '0 16px 36px var(--shadow-sm)',
          }}
        >
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <p className="inline-flex rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em]" style={{ borderColor: 'color-mix(in srgb, var(--accent-cyan) 42%, var(--border-secondary))', color: 'var(--accent-cyan)' }}>
              Visual Archive
            </p>
            <RouteBetaBadge />
          </div>
          <h1 className="mb-3 bg-linear-to-r bg-clip-text text-4xl font-bold text-transparent sm:text-5xl lg:text-6xl" style={{ backgroundImage: 'linear-gradient(to right, var(--accent-cyan), var(--accent-purple), var(--accent-pink))' }}>
            {headerInfo.title}
          </h1>
          <p className="max-w-2xl text-base sm:text-lg" style={{ color: 'var(--text-secondary)' }}>
            {headerInfo.subtitle}
          </p>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Total Photos', value: stats.total, accent: 'var(--accent-cyan)' },
              { label: 'Landscape', value: stats.landscape, accent: 'var(--accent-purple)' },
              { label: 'Portrait', value: stats.portrait, accent: 'var(--accent-orange)' },
              { label: 'Latest Upload', value: stats.latest, accent: 'var(--accent-pink)' },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border p-3"
                style={{
                  borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)',
                  backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 82%, transparent)',
                }}
              >
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.label}</p>
                <p className="text-base font-semibold sm:text-lg" style={{ color: item.accent }}>{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section
          className="mt-6 rounded-2xl border p-4 sm:p-5"
          style={{
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 94%, transparent), color-mix(in srgb, var(--bg-secondary) 94%, transparent))',
            borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
          }}
        >
          <div className="mb-4">
            <label htmlFor="gallery-search" className="mb-2 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Search Gallery
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={16} style={{ color: 'var(--text-tertiary)' }} />
              <input
                id="gallery-search"
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by description"
                className="w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm focus:outline-none"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 80%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: 'all', label: 'All' },
              { key: 'landscape', label: 'Landscape' },
              { key: 'portrait', label: 'Portrait' },
              { key: 'square', label: 'Square' },
            ].map((option) => {
              const isActive = orientationFilter === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setOrientationFilter(option.key)}
                  className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide"
                  style={{
                    borderColor: isActive
                      ? 'color-mix(in srgb, var(--accent-cyan) 55%, var(--border-secondary))'
                      : 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
                    color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    backgroundColor: isActive
                      ? 'color-mix(in srgb, var(--accent-cyan) 11%, transparent)'
                      : 'color-mix(in srgb, var(--bg-elevated) 80%, transparent)',
                  }}
                >
                  {option.label}
                </button>
              );
            })}

            <button
              type="button"
              onClick={resetFilters}
              className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide"
              style={{
                borderColor: 'color-mix(in srgb, var(--accent-orange) 50%, var(--border-secondary))',
                color: 'var(--accent-orange)',
                backgroundColor: 'color-mix(in srgb, var(--accent-orange) 10%, transparent)',
              }}
            >
              Reset
            </button>
          </div>

          {activeFilters.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {activeFilters.map((filter) => (
                <span
                  key={filter}
                  className="rounded-full border px-3 py-1 text-xs font-semibold"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--accent-purple) 45%, var(--border-secondary))',
                    color: 'var(--accent-purple)',
                    backgroundColor: 'color-mix(in srgb, var(--accent-purple) 10%, transparent)',
                  }}
                >
                  {filter}
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8">
          {filteredImages.length > 0 ? (
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
            >
              {balancedColumns.map((column, columnIndex) => (
                <div key={`gallery-col-${columnIndex}`} className="flex flex-col gap-4">
                  {column.map(({ image, globalIndex }) => {
                    const imageKey = image?._id || `${image?.src}-${globalIndex}`;
                    const orientation = getOrientation(image);
                    const aspectRatio =
                      Number(image?.width) > 0 && Number(image?.height) > 0
                        ? `${image.width} / ${image.height}`
                        : '4 / 3';
                    const srcToShow = image?.thumbnail || image?.src;
                    const showPlaceholder = !srcToShow || brokenImageIds.has(imageKey);

                    return (
                      <motion.div
                        key={imageKey}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.35, delay: Math.min(globalIndex * 0.03, 0.8) }}
                        className="overflow-hidden rounded-xl border"
                        style={{
                          borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)',
                          backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 85%, transparent)',
                        }}
                      >
                        <div
                          role="button"
                          tabIndex={0}
                          className="group relative block w-full cursor-pointer"
                          onClick={() => openLightbox(image)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              openLightbox(image);
                            }
                          }}
                        >
                          <div className="relative w-full" style={{ aspectRatio }}>
                            {!showPlaceholder ? (
                              <Image
                                src={srcToShow}
                                alt={image?.description || 'Gallery image'}
                                fill
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                                loading={globalIndex < 3 ? 'eager' : 'lazy'}
                                priority={globalIndex < 2}
                                placeholder="blur"
                                blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
                                onError={() => markImageBroken(imageKey)}
                              />
                            ) : (
                              <div className="relative flex h-full w-full items-center justify-center overflow-hidden" style={{ backgroundImage: getPlaceholderGradient(image?.description || imageKey) }}>
                                <div
                                  className="absolute inset-0"
                                  style={{
                                    backgroundImage:
                                      'linear-gradient(color-mix(in srgb, var(--border-secondary) 24%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--border-secondary) 24%, transparent) 1px, transparent 1px)',
                                    backgroundSize: '22px 22px',
                                    opacity: 0.35,
                                  }}
                                />
                                <div
                                  className="relative z-10 rounded-xl border px-3 py-1.5 text-sm font-bold"
                                  style={{
                                    borderColor: 'color-mix(in srgb, var(--border-secondary) 74%, transparent)',
                                    color: 'var(--text-bright)',
                                    backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 72%, transparent)',
                                  }}
                                >
                                  {getImageInitials(image?.description)}
                                </div>
                              </div>
                            )}

                            <div className="absolute left-3 top-3 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide"
                              style={{
                                borderColor: 'color-mix(in srgb, var(--border-secondary) 74%, transparent)',
                                color: 'var(--text-secondary)',
                                backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 80%, transparent)',
                              }}
                            >
                              {orientation}
                            </div>

                            <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/35 to-transparent opacity-100 transition-opacity duration-300 sm:opacity-0 sm:group-hover:opacity-100" />
                            <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3 opacity-100 transition-all duration-300 sm:translate-y-4 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100">
                              <p className={`mb-3 text-left text-sm font-semibold leading-snug text-white drop-shadow ${orientation === 'landscape' ? 'line-clamp-3' : 'line-clamp-2'}`}>
                                {image?.description || 'Untitled visual'}
                              </p>
                              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/85">
                                <span className="min-w-0">{formatDate(image?.createdAt)}</span>
                                {image?.src && (
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={(event) => handleDownload(event, image)}
                                    onKeyDown={(event) => {
                                      if (event.key === 'Enter' || event.key === ' ') {
                                        handleDownload(event, image);
                                      }
                                    }}
                                    className="pointer-events-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-white/25 bg-black/45 px-3 py-1 font-semibold hover:bg-white/20"
                                  >
                                    <Download size={12} /> Download
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            <div
              className="rounded-2xl border p-12 text-center"
              style={{
                borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)',
                background: 'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 94%, transparent), color-mix(in srgb, var(--bg-secondary) 94%, transparent))',
              }}
            >
              <h3 className="mb-2 text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                No Images Match The Current Filter
              </h3>
              <p style={{ color: 'var(--text-secondary)' }}>
                Try changing search text or orientation filter.
              </p>
            </div>
          )}
        </section>
      </div>

      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col bg-black text-white"
          >
            <div className="relative z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-black/95 px-3 sm:px-5">
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
                aria-label="Back to gallery"
                title="Back to gallery"
              >
                <ArrowLeft size={24} />
              </button>

              <div className="min-w-0 flex-1 px-2">
                <p className="truncate text-sm font-semibold">{selectedImage?.description || 'Untitled visual'}</p>
                <p className="truncate text-xs text-white/55">
                  {selectedImageIndex >= 0 ? `${selectedImageIndex + 1} of ${filteredImages.length}` : 'Gallery photo'}
                </p>
              </div>

              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  type="button"
                  onClick={() => updateViewerZoom(viewerZoom - 0.25)}
                  disabled={viewerZoom <= 1}
                  className="hidden h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:text-white/30 sm:flex"
                  aria-label="Zoom out"
                  title="Zoom out"
                >
                  <Minus size={20} />
                </button>
                <button
                  type="button"
                  onClick={() => updateViewerZoom(viewerZoom + 0.25)}
                  disabled={viewerZoom >= 4}
                  className="hidden h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:text-white/30 sm:flex"
                  aria-label="Zoom in"
                  title="Zoom in"
                >
                  <Plus size={20} />
                </button>
                <button
                  type="button"
                  onClick={() => updateViewerZoom(1)}
                  className="hidden h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 sm:flex"
                  aria-label="Reset zoom"
                  title={`Reset zoom (${Math.round(viewerZoom * 100)}%)`}
                >
                  <RotateCcw size={19} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowViewerInfo((prev) => !prev)}
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 ${showViewerInfo ? 'bg-white/10' : ''}`}
                  aria-label="Toggle photo info"
                  title="Info"
                >
                  <Info size={20} />
                </button>
                {selectedImage?.src && !showViewerInfo && (
                  <button
                    type="button"
                    onClick={(event) => handleDownload(event, selectedImage)}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
                    aria-label="Download full size"
                    title="Download full size"
                  >
                    <Download size={20} />
                  </button>
                )}
              </div>
            </div>

            <div className="relative flex min-h-0 flex-1">
              <div className="relative min-w-0 flex-1 overflow-hidden bg-black">
                {filteredImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => navigateViewer(-1)}
                      className="absolute left-3 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white shadow-lg transition-colors hover:bg-white/15 md:flex"
                      aria-label="Previous image"
                      title="Previous image"
                    >
                      <ChevronLeft size={30} />
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateViewer(1)}
                      className="absolute right-3 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white shadow-lg transition-colors hover:bg-white/15 md:flex"
                      aria-label="Next image"
                      title="Next image"
                    >
                      <ChevronRight size={30} />
                    </button>
                  </>
                )}

                <div
                  className="flex h-full w-full items-center justify-center overflow-hidden px-0 py-4 sm:px-8"
                  onWheel={handleViewerWheel}
                  onDoubleClick={() => updateViewerZoom(viewerZoom > 1 ? 1 : 2)}
                  onPointerDown={handleViewerPointerDown}
                  onPointerMove={handleViewerPointerMove}
                  onPointerUp={stopViewerDrag}
                  onPointerCancel={stopViewerDrag}
                  onPointerLeave={stopViewerDrag}
                  style={{
                    cursor: canPanViewer && isSpacePanning ? (isDraggingImage ? 'grabbing' : 'grab') : 'zoom-in',
                    touchAction: canPanViewer && isSpacePanning ? 'none' : 'pan-y',
                  }}
                >
                  <motion.div
                    key={selectedImage?._id || selectedImage?.src}
                    initial={{ opacity: 0.2 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="pointer-events-none relative h-full w-full origin-center transition-transform duration-200"
                    style={{ transform: `translate3d(${viewerOffset.x}px, ${viewerOffset.y}px, 0) scale(${viewerZoom})` }}
                  >
                    {selectedImage?.src && !modalImageError ? (
                      <Image
                        src={selectedImage.src}
                        alt={selectedImage.description || 'Gallery view'}
                        fill
                        className="object-contain"
                        sizes={showViewerInfo ? '(max-width: 1024px) 100vw, 76vw' : '100vw'}
                        quality={90}
                        priority
                        onError={() => setModalImageError(true)}
                      />
                    ) : (
                      <div className="relative flex h-full w-full items-center justify-center overflow-hidden" style={{ backgroundImage: getPlaceholderGradient(selectedImage?.description || selectedImage?._id) }}>
                        <div
                          className="absolute inset-0"
                          style={{
                            backgroundImage:
                              'linear-gradient(color-mix(in srgb, var(--border-secondary) 24%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--border-secondary) 24%, transparent) 1px, transparent 1px)',
                            backgroundSize: '24px 24px',
                            opacity: 0.35,
                          }}
                        />
                        <div className="relative z-10 rounded-xl border border-white/20 bg-black/50 px-5 py-2 text-xl font-bold text-white">
                          {getImageInitials(selectedImage?.description)}
                        </div>
                      </div>
                    )}
                  </motion.div>
                </div>

                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-linear-to-t from-black/85 via-black/45 to-transparent px-4 py-4 lg:hidden">
                  <p className="line-clamp-2 text-sm font-semibold text-white">{selectedImage?.description || 'Untitled visual'}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/75">
                    <span className="inline-flex items-center gap-1.5"><CalendarDays size={13} /> {formatDate(selectedImage?.createdAt)}</span>
                    <span>{Math.round(viewerZoom * 100)}%</span>
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {showViewerInfo && (
                  <motion.aside
                    initial={{ opacity: 0, x: 28 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 28 }}
                    transition={{ duration: 0.2 }}
                    className="hidden w-[360px] shrink-0 border-l border-white/10 bg-zinc-950 p-5 text-white lg:block"
                  >
                    <div className="mb-5 flex items-center justify-between">
                      <h2 className="text-base font-semibold">Info</h2>
                      <SlidersHorizontal size={18} className="text-white/55" />
                    </div>

                    <div className="space-y-5">
                      <section>
                        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/45">Caption</p>
                        <p className="text-sm leading-relaxed text-white/85">{selectedImage?.description || 'Untitled visual'}</p>
                      </section>

                      <section>
                        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/45">Date</p>
                        <p className="inline-flex items-center gap-2 text-sm text-white/85">
                          <CalendarDays size={15} /> {formatDate(selectedImage?.createdAt)}
                        </p>
                      </section>

                      <section>
                        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/45">Image</p>
                        <div className="space-y-1 text-sm text-white/75">
                          <p>{getOrientation(selectedImage)}</p>
                          {selectedImage?.width && selectedImage?.height && (
                            <p>{selectedImage.width} x {selectedImage.height}</p>
                          )}
                          <p>Zoom {Math.round(viewerZoom * 100)}%</p>
                        </div>
                      </section>

                      {selectedImage?.src && (
                        <button
                          type="button"
                          onClick={(event) => handleDownload(event, selectedImage)}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/15"
                        >
                          <Download size={17} /> Download Full Size
                        </button>
                      )}
                    </div>
                  </motion.aside>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default GalleryClient;
