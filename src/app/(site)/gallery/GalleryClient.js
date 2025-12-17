'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Masonry from 'react-masonry-css';
import { Download, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

const GalleryClient = () => {
    const { theme } = useTheme();
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(null);
    const [headerInfo, setHeaderInfo] = useState({
        title: 'Gallery',
        subtitle: 'A visual journey through my lens.'
    });

    useEffect(() => {
        fetchImages();
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await fetch('/api/config');
            const data = await res.json();
            if (data) {
                setHeaderInfo({
                    title: data.galleryTitle || 'Gallery',
                    subtitle: data.gallerySubtitle || 'A visual journey through my lens.'
                });
            }
        } catch (error) {
            console.error('Failed to fetch config:', error);
        }
    };

    // Close modal on escape key - memoized handler
    const handleEsc = useCallback((e) => {
        if (e.key === 'Escape') setSelectedImage(null);
    }, []);

    useEffect(() => {
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [handleEsc]);

    const fetchImages = async () => {
        try {
            const res = await fetch('/api/gallery');
            const data = await res.json();
            if (data.success) {
                setImages(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch images:', error);
        } finally {
            setLoading(false);
        }
    };

    // Memoize breakpoint configuration to prevent re-creation
    const breakpointColumnsObj = useMemo(() => ({
        default: 3,
        1100: 2,
        700: 1
    }), []);

    const handleDownload = useCallback(async (e, image) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            const response = await fetch(image.src);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            
            // Helper function to extract file extension
            const getFileExtension = (srcUrl) => {
                const originalFilename = srcUrl.split('/').pop() || '';
                return originalFilename.includes('.') 
                    ? originalFilename.split('.').pop() 
                    : 'jpg';
            };
            
            // Determine filename: use caption if available, otherwise use fallback strategy
            let filename;
            if (image.description && image.description.trim()) {
                // Use caption as filename, sanitize it for file systems
                const sanitized = image.description
                    .trim()
                    .substring(0, 100) // Limit length
                    .replace(/[/\\?%*:|"<>]/g, '-') // Replace invalid chars
                    .replace(/\s+/g, '_'); // Replace spaces with underscores
                
                // Check if sanitized result is meaningful (not empty or too short)
                if (sanitized.length >= 3) {
                    const extension = getFileExtension(image.src);
                    filename = `${sanitized}.${extension}`;
                } else {
                    // Fall through to fallback strategy if sanitization resulted in empty/short string
                    filename = null;
                }
            }
            
            // Fallback strategy: use timestamp + image ID (if caption wasn't usable)
            if (!filename) {
                const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
                const extension = getFileExtension(image.src);
                const imageIdShort = image._id ? image._id.slice(0, 8) : 'unknown';
                filename = `gallery_${timestamp}_${imageIdShort}.${extension}`;
            }
            
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
        }
    }, []); // Empty deps since image is passed as parameter

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="animate-spin text-cyan-500" size={48} />
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="min-h-screen p-4 lg:p-8 transition-colors duration-300"
            style={{
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
            }}
        >
            <div className="max-w-7xl mx-auto">
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="text-center mb-12"
                >
                    <h1
                        className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 pb-2 bg-gradient-to-r bg-clip-text text-transparent"
                        style={{
                            backgroundImage: theme === 'dark'
                                ? 'linear-gradient(to right, #22d3ee, #3b82f6, #8b5cf6)'
                                : 'linear-gradient(to right, #0891b2, #2563eb, #7c3aed)'
                        }}
                    >
                        {headerInfo.title}
                    </h1>
                    <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
                        {headerInfo.subtitle}
                    </p>
                </motion.div>

                <Masonry
                    breakpointCols={breakpointColumnsObj}
                    className="flex w-auto -ml-4"
                    columnClassName="pl-4 bg-clip-padding"
                >
                    {images.map((image, index) => (
                        <motion.div
                            key={image._id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.4, delay: Math.min(index * 0.05, 1) }}
                            className="mb-4 relative group overflow-hidden rounded-xl bg-[var(--surface-variant)] cursor-pointer"
                            onClick={() => setSelectedImage(image)}
                            layoutId={`image-${image._id}`}
                        >
                            <div className="relative w-full" style={{ aspectRatio: `${image.width} / ${image.height}` }}>
                                <Image
                                    src={image.thumbnail || image.src}
                                    alt={image.description || 'Gallery image'}
                                    fill
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    loading={index < 6 ? "eager" : "lazy"}
                                    priority={index < 3}
                                    placeholder="blur"
                                    blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
                                />
                            </div>

                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-6">
                                <p className="text-white text-base font-medium mb-3 line-clamp-2 translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                    {image.description}
                                </p>
                                <button
                                    onClick={(e) => handleDownload(e, image)}
                                    className="self-start flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-full text-white text-xs font-semibold transition-all translate-y-4 group-hover:translate-y-0 duration-300 delay-75 hover:scale-105"
                                >
                                    <Download size={14} />
                                    Download
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </Masonry>

                {images.length === 0 && !loading && (
                    <div className="text-center py-20 text-[var(--on-surface-variant)]">
                        <p className="text-xl">No images found in the gallery.</p>
                    </div>
                )}
            </div>

            {/* Lightbox Modal */}
            <AnimatePresence>
                {selectedImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
                        onClick={() => setSelectedImage(null)}
                    >
                        <motion.button
                            className="absolute top-4 right-4 p-2 text-white/50 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors z-50"
                            onClick={() => setSelectedImage(null)}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 18 12" /></svg>
                        </motion.button>

                        <motion.div
                            layoutId={`image-${selectedImage._id}`}
                            className="relative w-full max-w-5xl max-h-[90vh] bg-transparent rounded-lg overflow-hidden flex flex-col items-center justify-center p-2"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="relative w-full h-[80vh]">
                                <Image
                                    src={selectedImage.src}
                                    alt={selectedImage.description || 'Gallery view'}
                                    fill
                                    className="object-contain"
                                    sizes="90vw"
                                    quality={100}
                                />
                            </div>

                            <div className="mt-4 flex flex-col items-center">
                                <p className="text-white text-lg font-medium text-center mb-4 max-w-2xl px-4">
                                    {selectedImage.description}
                                </p>
                                <button
                                    onClick={(e) => handleDownload(e, selectedImage)}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-white text-black hover:bg-gray-200 rounded-full text-sm font-bold transition-colors"
                                >
                                    <Download size={18} />
                                    Download Full Size
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default GalleryClient;
