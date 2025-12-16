'use client';

import { useState, useEffect } from 'react';
import Masonry from 'react-masonry-css';
import { Download, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

const GalleryClient = () => {
    const { theme } = useTheme();
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchImages();
    }, []);

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

    const breakpointColumnsObj = {
        default: 3,
        1100: 2,
        700: 1
    };

    const handleDownload = async (e, image) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            const response = await fetch(image.src);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            // Extract filename from path or use ID
            const filename = image.src.split('/').pop() || `gallery-image-${image._id}.jpg`;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
        }
    };

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
                        Gallery
                    </h1>
                    <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
                        A visual journey through my lens.
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
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className="mb-4 relative group overflow-hidden rounded-xl bg-[var(--surface-variant)]"
                        >
                            <div className="relative w-full" style={{ aspectRatio: `${image.width} / ${image.height}` }}>
                                <Image
                                    src={image.src}
                                    alt={image.description || 'Gallery image'}
                                    fill
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                                    loading="lazy"
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
        </motion.div>
    );
};

export default GalleryClient;
