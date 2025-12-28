'use client';

import { useState, useEffect } from 'react';
import { Upload, X, Trash2, Image as ImageIcon, Loader2, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import Toast from './Toast';

export default function GalleryManager() {
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [migrating, setMigrating] = useState(false);
    const [migrationProgress, setMigrationProgress] = useState(null);
    const [file, setFile] = useState(null);
    const [description, setDescription] = useState('');
    const [dragActive, setDragActive] = useState(false);
    const [preview, setPreview] = useState(null);
    const [notification, setNotification] = useState(null);

    const showNotification = (success, message) => {
        setNotification({ success, message });
        setTimeout(() => setNotification(null), 3000);
    };

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

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleFile = (file) => {
        setFile(file);

        // Check if file is HEIC
        const isHeic = file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic';

        if (isHeic) {
            // Can't preview HEIC in browser, set a placeholder or null
            // We use a special string to indicate placeholder
            setPreview('HEIC_PLACEHOLDER');
        } else {
            const url = URL.createObjectURL(file);
            setPreview(url);
        }
    };

    const clearFile = () => {
        setFile(null);
        setPreview(null);
        setDescription('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file || !description) return;

        setUploading(true);

        try {
            // 1. Upload Image
            const formData = new FormData();
            formData.append('file', file);

            const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            const uploadData = await uploadRes.json();

            if (!uploadData.success) {
                throw new Error(uploadData.error || 'Upload failed');
            }

            // 2. Create Gallery Entry
            let width = uploadData.width;
            let height = uploadData.height;

            // Fallback to client-side dimension extraction if server didn't provide it (e.g. for non-processed images)
            // But skip this for HEIC/Placeholders since we can't load them
            if ((!width || !height) && preview && preview !== 'HEIC_PLACEHOLDER') {
                try {
                    const img = document.createElement('img');
                    img.src = preview;
                    await new Promise((resolve, reject) => {
                        img.onload = resolve;
                        img.onerror = () => resolve(); // Don't fail if image can't load
                    });
                    width = img.naturalWidth || 800; // Default fallback
                    height = img.naturalHeight || 600;
                } catch (e) {
                    console.warn('Failed to get client-side image dimensions', e);
                    width = 800;
                    height = 600;
                }
            }

            const galleryData = {
                src: uploadData.url,
                thumbnail: uploadData.thumbnailUrl, // Include thumbnail URL
                description,
                width: width || 800,
                height: height || 600
            };

            const galleryRes = await fetch('/api/gallery', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(galleryData),
            });

            const galleryResult = await galleryRes.json();

            if (galleryResult.success) {
                setImages([galleryResult.data, ...images]);
                clearFile();
                showNotification(true, 'Image uploaded successfully');
            } else {
                throw new Error(galleryResult.error);
            }

        } catch (error) {
            showNotification(false, error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this image?')) return;

        try {
            const res = await fetch(`/api/gallery?id=${id}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (data.success) {
                setImages(images.filter(img => img._id !== id));
                showNotification(true, 'Image deleted successfully');
            } else {
                showNotification(false, data.error);
            }
        } catch (error) {
            console.error('Failed to delete:', error);
            showNotification(false, 'Failed to delete image');
        }
    };

    const handleMigration = async () => {
        if (!confirm('Generate thumbnails for existing images? This may take a while.')) return;

        setMigrating(true);
        setMigrationProgress({ message: 'Starting migration...', percentage: 0 });

        try {
            let skip = 0;
            let hasMore = true;
            const batchSize = 10;

            while (hasMore) {
                const res = await fetch(`/api/admin/migrate-gallery?batch=${batchSize}&skip=${skip}`, {
                    method: 'POST',
                });
                const data = await res.json();

                if (!data.success) {
                    throw new Error(data.error);
                }

                setMigrationProgress({
                    message: data.message,
                    percentage: data.progress?.percentage || 100,
                    processed: data.progress?.processed,
                    total: data.progress?.total
                });

                hasMore = data.hasMore;
                skip = data.nextSkip || skip + batchSize;

                // Small delay between batches
                if (hasMore) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            alert('Migration completed successfully!');
            showNotification(true, 'Migration completed successfully!');
            fetchImages(); // Refresh gallery
        } catch (error) {
            console.error('Migration failed:', error);
            showNotification(false, `Migration failed: ${error.message}`);
        } finally {
            setMigrating(false);
            setMigrationProgress(null);
        }
    };

    return (
        <div className="space-y-12">
            {/* Migration Section */}
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div>
                        <h2 className="text-sm font-mono text-cyan-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <RefreshCw size={14} className={migrating ? "animate-spin" : ""} />
                            Optimization Protocol
                        </h2>
                        <p className="text-slate-400 text-sm max-w-md">
                            Execute thumbnail generation sequence for legacy assets to enhance system performance.
                        </p>
                    </div>
                    <button
                        onClick={handleMigration}
                        disabled={migrating}
                        className="px-6 py-2 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 hover:border-cyan-500/50 transition-all font-bold text-xs uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {migrating ? 'PROCESSING_BATCH...' : 'INITIATE_OPTIMIZATION'}
                    </button>
                </div>

                {migrationProgress && (
                    <div className="mt-8 p-4 bg-slate-950/50 rounded-lg border border-white/10 font-mono text-xs">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-cyan-400 uppercase tracking-wider">{migrationProgress.message}</span>
                            <span className="text-slate-400">{migrationProgress.percentage}%</span>
                        </div>
                        {migrationProgress.percentage !== undefined && (
                            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-cyan-500 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                                    style={{ width: `${migrationProgress.percentage}%` }}
                                />
                            </div>
                        )}
                        {migrationProgress.processed && migrationProgress.total && (
                            <div className="mt-2 text-slate-500 text-[10px] text-right">
                                PROCESSED: {migrationProgress.processed} / {migrationProgress.total}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Upload Section */}
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                <h2 className="text-sm font-mono text-pink-400 uppercase tracking-widest mb-8 flex items-center gap-4">
                    Upload Interface
                    <div className="h-px bg-pink-500/20 flex-grow" />
                </h2>

                <form onSubmit={handleSubmit} className="relative z-10">
                    {!preview ? (
                        <div
                            className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 group/drop
                                ${dragActive
                                    ? 'border-pink-500 bg-pink-500/5'
                                    : 'border-white/10 hover:border-pink-500/30 hover:bg-slate-800/50'
                                }
                            `}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                        >
                            <input
                                type="file"
                                id="file-upload"
                                className="hidden"
                                onChange={handleChange}
                                accept="image/*"
                            />
                            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-4">
                                <div className={`p-4 rounded-full bg-pink-500/10 text-pink-400 transform transition-transform duration-500 group-hover/drop:scale-110 group-hover/drop:rotate-12`}>
                                    <Upload size={32} />
                                </div>
                                <div>
                                    <span className="block text-xl font-bold text-white mb-2">Initialize Upload Sequence</span>
                                    <span className="block text-sm text-slate-400 font-mono">Drag & drop or click to select visual assets</span>
                                </div>
                            </label>
                        </div>
                    ) : (
                        <div className="bg-slate-950/50 rounded-xl border border-white/10 overflow-hidden flex flex-col md:flex-row">
                            <div className="relative h-64 md:h-auto md:w-1/3 shrink-0 bg-black/20 flex items-center justify-center p-4 border-b md:border-b-0 md:border-r border-white/10">
                                <button
                                    type="button"
                                    onClick={clearFile}
                                    className="absolute top-4 right-4 p-2 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors z-20 backdrop-blur-md border border-red-500/20"
                                >
                                    <X size={16} />
                                </button>

                                {preview === 'HEIC_PLACEHOLDER' ? (
                                    <div className="text-center">
                                        <div className="mx-auto mb-3 w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-pink-500 font-mono text-xl border border-white/10">
                                            HEIC
                                        </div>
                                        <p className="text-slate-300 font-bold mb-1">High Efficiency Image</p>
                                        <p className="text-xs text-slate-500 font-mono">Preview Unavailable</p>
                                    </div>
                                ) : (
                                    <div className="relative w-full h-full min-h-[200px]">
                                        <Image
                                            src={preview}
                                            alt="Preview"
                                            fill
                                            className="object-contain"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="p-6 md:p-8 flex-1 space-y-6">
                                <div>
                                    <label className="block text-slate-400 mb-2 text-xs font-mono uppercase tracking-wider">Asset Description</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="w-full bg-slate-950/50 border border-white/10 rounded-lg p-4 text-slate-200 focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 outline-none transition-all placeholder:text-slate-600 min-h-[120px] resize-none font-mono text-sm"
                                        placeholder="// Enter detailed description..."
                                        required
                                    />
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={uploading}
                                        className="px-8 py-3 rounded bg-pink-600 hover:bg-pink-500 text-white font-bold transition-all shadow-[0_0_20px_rgba(236,72,153,0.3)] hover:shadow-[0_0_30px_rgba(236,72,153,0.5)] disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase tracking-widest flex items-center gap-2"
                                    >
                                        {uploading ? (
                                            <>
                                                <Loader2 className="animate-spin" size={14} />
                                                TRANSMITTING...
                                            </>
                                        ) : (
                                            <>
                                                COMMENCE_UPLOAD <Upload size={14} />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </form>
            </div>

            {/* Gallery Grid */}
            <div>
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                    <span className="w-2 h-8 bg-pink-500 rounded-full" />
                    Database Content
                    <span className="text-sm font-mono text-slate-400 font-normal">({images.length} items)</span>
                </h2>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="animate-spin text-pink-500" size={40} />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {images.map(image => (
                            <div key={image._id} className="group relative bg-slate-900/50 backdrop-blur-xl rounded-xl border border-white/5 overflow-hidden hover:border-pink-500/30 transition-all hover:translate-y-[-4px] hover:shadow-xl">
                                <div className="aspect-video relative bg-slate-950">
                                    <Image
                                        src={image.thumbnail || image.src}
                                        alt={image.description}
                                        fill
                                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] font-mono text-slate-300 bg-slate-900/50 px-2 py-1 rounded backdrop-blur-sm border border-white/10">
                                                {new Date(image.createdAt).toLocaleDateString()}
                                            </span>
                                            <button
                                                onClick={() => handleDelete(image._id)}
                                                className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors border border-red-500/20 backdrop-blur-md"
                                                title="Delete Asset"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    {!image.thumbnail && (
                                        <div className="absolute top-2 left-2 px-2 py-1 bg-amber-500/90 text-black text-[10px] uppercase font-bold tracking-wider rounded">
                                            Raw Asset
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 border-t border-white/5 bg-white/[0.01]">
                                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed" title={image.description}>
                                        {image.description}
                                    </p>
                                </div>
                            </div>
                        ))}

                        {images.length === 0 && (
                            <div className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-2xl bg-slate-900/30">
                                <div className="p-4 rounded-full bg-white/5 mb-4">
                                    <ImageIcon size={32} className="text-slate-500" />
                                </div>
                                <p className="text-slate-400 font-mono text-sm">NO_VISUAL_DATA_FOUND</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Toast Notification */}
            <Toast notification={notification} />
        </div>
    );
}
