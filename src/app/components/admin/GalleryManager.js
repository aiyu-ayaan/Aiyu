'use client';

import { useState, useEffect } from 'react';
import { Upload, X, Trash2, Image as ImageIcon, Loader2, RefreshCw, CheckSquare, Square, Check, Sparkles, Pin } from 'lucide-react';
import Image from 'next/image';
import Toast from './Toast';

export default function GalleryManager() {
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [migrating, setMigrating] = useState(false);
    const [migrationProgress, setMigrationProgress] = useState(null);
    const [files, setFiles] = useState([]); // Array of { file, preview, description, id }
    const [dragActive, setDragActive] = useState(false);
    const [notification, setNotification] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(null);

    // Multi-select state
    const [selectedImages, setSelectedImages] = useState(new Set());
    const [deleting, setDeleting] = useState(false);
    const [aiEnabled, setAiEnabled] = useState(false);

    // AI Generation State
    const [generating, setGenerating] = useState(new Set()); // Set of file IDs currently generating

    // Drag and Drop ordering state
    const [draggedItemIdx, setDraggedItemIdx] = useState(null);
    const [dragOverItemIdx, setDragOverItemIdx] = useState(null);
    const [isSavingOrder, setIsSavingOrder] = useState(false);

    const showNotification = (success, message) => {
        setNotification({ success, message });
        setTimeout(() => setNotification(null), 3000);
    };

    useEffect(() => {
        fetchImages();
        checkAiConfig();
    }, []);

    const checkAiConfig = async () => {
        try {
            const res = await fetch('/api/admin/ai/config');
            const data = await res.json();
            if (data.success && data.data) {
                setAiEnabled(data.data.enabled);
            }
        } catch (error) {
            console.error('Failed to fetch AI config:', error);
        }
    };

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
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(Array.from(e.dataTransfer.files));
        }
    };

    const handleChange = (e) => {
        e.preventDefault();
        if (e.target.files && e.target.files.length > 0) {
            handleFiles(Array.from(e.target.files));
        }
    };

    const handleFiles = (newFiles) => {
        const fileObjects = newFiles.map(file => {
            const isHeic = file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic';
            let preview = null;

            if (isHeic) {
                preview = 'HEIC_PLACEHOLDER';
            } else {
                preview = URL.createObjectURL(file);
            }

            return {
                id: Math.random().toString(36).substring(7),
                file,
                preview,
                description: '', // Individual description
                isHeic
            };
        });

        setFiles(prev => [...prev, ...fileObjects]);
    };

    const removeFile = (id) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    const updateFileDescription = (id, desc) => {
        setFiles(prev => prev.map(f => f.id === id ? { ...f, description: desc } : f));
    };

    const clearFiles = () => {
        setFiles([]);
    };

    // --- AI Generation Logic ---
    const generateCaption = async (fileId, file) => {
        try {
            setGenerating(prev => new Set(prev).add(fileId));

            const formData = new FormData();
            formData.append('file', file);
            formData.append('prompt', "Generate a creative, short caption (5-10 words) for this image.");

            const res = await fetch('/api/admin/ai/generate', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();

            if (data.success) {
                updateFileDescription(fileId, data.data);
                showNotification(true, 'Caption generated successfully');
            } else {
                showNotification(false, data.error || 'Failed to generate caption');
            }

        } catch (error) {
            console.error('AI Generation failed:', error);
            showNotification(false, 'AI Generation failed');
        } finally {
            setGenerating(prev => {
                const next = new Set(prev);
                next.delete(fileId);
                return next;
            });
        }
    };

    const uploadSingleFile = async (fileObj) => {
        try {
            // 1. Upload Image
            const formData = new FormData();
            formData.append('file', fileObj.file);

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

            if ((!width || !height) && fileObj.preview && fileObj.preview !== 'HEIC_PLACEHOLDER') {
                try {
                    const img = document.createElement('img');
                    img.src = fileObj.preview;
                    await new Promise((resolve) => {
                        img.onload = resolve;
                        img.onerror = () => resolve();
                    });
                    width = img.naturalWidth || 800;
                    height = img.naturalHeight || 600;
                } catch (e) {
                    console.warn('Failed to get client-side image dimensions', e);
                    width = 800;
                    height = 600;
                }
            }

            const galleryData = {
                src: uploadData.url,
                thumbnail: uploadData.thumbnailUrl,
                description: fileObj.description || 'No description', // Use individual description or default
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
                return galleryResult.data;
            } else {
                throw new Error(galleryResult.error);
            }

        } catch (error) {
            console.error(`Error uploading ${fileObj.file.name}:`, error);
            throw error; // Re-throw to handle in the loop
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (files.length === 0) return;

        setUploading(true);
        let successCount = 0;
        let failCount = 0;

        try {
            for (let i = 0; i < files.length; i++) {
                const fileObj = files[i];
                setUploadProgress({
                    current: i + 1,
                    total: files.length,
                    filename: fileObj.file.name
                });

                try {
                    const newImage = await uploadSingleFile(fileObj);
                    setImages(prev => [newImage, ...prev]);
                    successCount++;
                } catch (error) {
                    failCount++;
                }
            }

            if (successCount > 0) {
                showNotification(true, `Successfully uploaded ${successCount} images.${failCount > 0 ? ` Failed: ${failCount}` : ''}`);
                clearFiles(); // Only clear on success (or partial success)
            } else {
                showNotification(false, 'All uploads failed. Please try again.');
            }

        } catch (error) {
            showNotification(false, 'Upload process encountered an error.');
        } finally {
            setUploading(false);
            setUploadProgress(null);
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
                // Also remove from selection if present
                if (selectedImages.has(id)) {
                    const newSelected = new Set(selectedImages);
                    newSelected.delete(id);
                    setSelectedImages(newSelected);
                }
                showNotification(true, 'Image deleted successfully');
            } else {
                showNotification(false, data.error);
            }
        } catch (error) {
            console.error('Failed to delete:', error);
            showNotification(false, 'Failed to delete image');
        }
    };

    // --- Bulk Selection & Deletion Logic ---

    const toggleSelection = (id) => {
        const newSelected = new Set(selectedImages);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedImages(newSelected);
    };

    const selectAll = () => {
        if (selectedImages.size === images.length) {
            setSelectedImages(new Set()); // Deselect all
        } else {
            const allIds = new Set(images.map(img => img._id));
            setSelectedImages(allIds);
        }
    };

    const handleBulkDelete = async () => {
        const count = selectedImages.size;
        if (count === 0) return;

        if (!confirm(`Are you sure you want to delete these ${count} images? This action cannot be undone.`)) return;

        setDeleting(true);
        let deletedCount = 0;
        let failCount = 0;

        // Iterate and delete one by one
        const idsToDelete = Array.from(selectedImages);

        for (const id of idsToDelete) {
            try {
                const res = await fetch(`/api/gallery?id=${id}`, {
                    method: 'DELETE',
                });
                const data = await res.json();

                if (data.success) {
                    deletedCount++;
                    // Optimistically update UI as we go (optional, but good for feedback)
                    setImages(prev => prev.filter(img => img._id !== id));
                } else {
                    failCount++;
                }
            } catch (error) {
                failCount++;
            }
        }

        setSelectedImages(new Set()); // Clear selection
        setDeleting(false);

        if (deletedCount > 0) {
            showNotification(true, `Successfully deleted ${deletedCount} images.${failCount > 0 ? ` Failed: ${failCount}` : ''}`);
        } else {
            showNotification(false, 'Failed to delete images.');
        }
    };

    // --- Pin and Order Logic ---

    const togglePin = async (id, currentStatus) => {
        try {
            const res = await fetch(`/api/gallery`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, update: { isPinned: !currentStatus } })
            });
            const data = await res.json();
            if (data.success) {
                fetchImages();
                showNotification(true, currentStatus ? 'Image unpinned' : 'Image pinned to top');
            } else {
                showNotification(false, data.error);
            }
        } catch (error) {
            console.error('Failed to toggle pin:', error);
            showNotification(false, 'Failed to update pin status');
        }
    };

    const handleDragStartItem = (e, index) => {
        setDraggedItemIdx(index);
        // Required for Firefox
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', e.target);
        }
    };

    const handleDragEnterItem = (e, index) => {
        e.preventDefault();
        setDragOverItemIdx(index);
    };

    const handleDragOverItem = (e) => {
        e.preventDefault(); // Necessary to allow dropping
    };

    const handleDragEndItem = async () => {
        if (draggedItemIdx !== null && dragOverItemIdx !== null && draggedItemIdx !== dragOverItemIdx) {
            const newImages = [...images];
            const draggedItem = newImages[draggedItemIdx];
            newImages.splice(draggedItemIdx, 1);
            newImages.splice(dragOverItemIdx, 0, draggedItem);
            setImages(newImages); // Optimistic UI update

            setIsSavingOrder(true);
            try {
                // We map all images on the page to assign a new sequential order index
                const updates = newImages.map((img, i) => ({ id: img._id, order: i }));
                const res = await fetch('/api/gallery', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items: updates })
                });
                const data = await res.json();
                if (data.success) {
                    showNotification(true, 'New arrangement saved successfully');
                } else {
                    showNotification(false, data.error || 'Failed to save order');
                    fetchImages(); // Revert to old order on failure
                }
            } catch (error) {
                console.error('Order save error:', error);
                showNotification(false, 'Failed to save order');
                fetchImages();
            } finally {
                setIsSavingOrder(false);
            }
        }
        setDraggedItemIdx(null);
        setDragOverItemIdx(null);
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
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-4 md:p-8 relative overflow-hidden group">
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
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-4 md:p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                <h2 className="text-sm font-mono text-pink-400 uppercase tracking-widest mb-8 flex items-center gap-4">
                    Upload Interface
                    <div className="h-px bg-pink-500/20 flex-grow" />
                </h2>

                <form onSubmit={handleSubmit} className="relative z-10 space-y-6">
                    {/* Drop Zone */}
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
                            multiple
                        />
                        <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-4">
                            <div className={`p-4 rounded-full bg-pink-500/10 text-pink-400 transform transition-transform duration-500 group-hover/drop:scale-110 group-hover/drop:rotate-12`}>
                                <Upload size={32} />
                            </div>
                            <div>
                                <span className="block text-xl font-bold text-white mb-2">Initialize Upload Sequence</span>
                                <span className="block text-sm text-slate-400 font-mono">Drag & drop or click to select visual assets (Multiple allowed)</span>
                            </div>
                        </label>
                    </div>

                    {/* Previews List */}
                    {files.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <h3 className="text-white text-sm font-bold uppercase tracking-wider">
                                    Selected Assets ({files.length})
                                </h3>
                                <button
                                    type="button"
                                    onClick={clearFiles}
                                    className="text-xs text-red-400 hover:text-red-300 underline"
                                >
                                    Clear All
                                </button>
                            </div>

                            <div className="grid gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {files.map((fileObj, index) => (
                                    <div key={fileObj.id} className="bg-slate-950/50 rounded-lg border border-white/10 p-4 flex gap-4 items-start">
                                        {/* Thumbnail */}
                                        <div className="w-24 h-24 shrink-0 bg-black/40 rounded border border-white/5 relative overflow-hidden flex items-center justify-center">
                                            {fileObj.preview === 'HEIC_PLACEHOLDER' ? (
                                                <div className="text-center p-2">
                                                    <div className="text-pink-500 text-xs font-bold font-mono">HEIC</div>
                                                </div>
                                            ) : (
                                                <Image
                                                    src={fileObj.preview}
                                                    alt="Preview"
                                                    fill
                                                    className="object-contain"
                                                />
                                            )}
                                        </div>

                                        {/* Inputs */}
                                        <div className="flex-1 space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-white text-xs font-mono truncate max-w-[200px]">{fileObj.file.name}</span>
                                                <span className="text-slate-500 text-[10px] uppercase font-mono">{(fileObj.file.size / 1024 / 1024).toFixed(2)} MB</span>
                                            </div>

                                            <div className="relative">
                                                <textarea
                                                    value={fileObj.description || ''}
                                                    onChange={(e) => updateFileDescription(fileObj.id, e.target.value)}
                                                    className={`w-full bg-slate-900 border border-white/10 rounded-md p-2 ${aiEnabled ? 'pr-10' : ''} text-slate-200 text-xs focus:border-pink-500/50 outline-none transition-all placeholder:text-slate-700 font-mono resize-none`}
                                                    placeholder="// Enter description (optional)..."
                                                    rows={2}
                                                />
                                                {aiEnabled && (
                                                    <button
                                                        type="button"
                                                        onClick={() => generateCaption(fileObj.id, fileObj.file)}
                                                        disabled={generating.has(fileObj.id)}
                                                        className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-pink-500/10 text-pink-400 hover:bg-pink-500 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed group/ai"
                                                        title="Generate Caption with AI"
                                                    >
                                                        {generating.has(fileObj.id) ? (
                                                            <Loader2 size={12} className="animate-spin" />
                                                        ) : (
                                                            <Sparkles size={12} className="transform group-hover/ai:scale-110 transition-transform" />
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Remove Action */}
                                        <button
                                            type="button"
                                            onClick={() => removeFile(fileObj.id)}
                                            className="text-slate-500 hover:text-red-400 transition-colors p-1"
                                            title="Remove"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Upload Button & Progress */}
                            <div className="flex flex-col gap-4 border-t border-white/10 pt-6">
                                {uploading && uploadProgress && (
                                    <div className="mb-2">
                                        <div className="flex justify-between text-xs font-mono mb-1 text-pink-400">
                                            <span>UPLOADING: {uploadProgress.filename}</span>
                                            <span>{uploadProgress.current} / {uploadProgress.total}</span>
                                        </div>
                                        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-pink-500 transition-all duration-300"
                                                style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={uploading}
                                        className="px-8 py-3 rounded bg-pink-600 hover:bg-pink-500 text-white font-bold transition-all shadow-[0_0_20px_rgba(236,72,153,0.3)] hover:shadow-[0_0_30px_rgba(236,72,153,0.5)] disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase tracking-widest flex items-center gap-2"
                                    >
                                        {uploading ? (
                                            <>
                                                <Loader2 className="animate-spin" size={14} />
                                                TRANSMITTING BATCH...
                                            </>
                                        ) : (
                                            <>
                                                COMMENCE_BATCH_UPLOAD <Upload size={14} />
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
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                        <span className="w-2 h-8 bg-pink-500 rounded-full" />
                        Database Content
                        <span className="text-sm font-mono text-slate-400 font-normal">({images.length} items)</span>
                    </h2>

                    <div className="flex gap-3">
                        {images.length > 0 && (
                            <button
                                onClick={selectAll}
                                className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/5 text-xs uppercase tracking-wide flex items-center gap-2 transition-all"
                            >
                                {selectedImages.size === images.length ? (
                                    <>
                                        <Square size={14} /> Deselect All
                                    </>
                                ) : (
                                    <>
                                        <CheckSquare size={14} /> Select All
                                    </>
                                )}
                            </button>
                        )}

                        {selectedImages.size > 0 && (
                            <button
                                onClick={handleBulkDelete}
                                disabled={deleting}
                                className="px-4 py-2 rounded bg-red-500/20 hover:bg-red-500 hover:text-white text-red-400 border border-red-500/20 transition-all font-bold text-xs uppercase tracking-wide flex items-center gap-2"
                            >
                                {deleting ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                                Delete Selected ({selectedImages.size})
                            </button>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="animate-spin text-pink-500" size={40} />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {images.map((image, idx) => {
                            const isSelected = selectedImages.has(image._id);
                            const isBeingDragged = draggedItemIdx === idx;
                            const isDragOver = dragOverItemIdx === idx;

                            return (
                                <div
                                    key={image._id}
                                    draggable
                                    onDragStart={(e) => handleDragStartItem(e, idx)}
                                    onDragEnter={(e) => handleDragEnterItem(e, idx)}
                                    onDragEnd={handleDragEndItem}
                                    onDragOver={handleDragOverItem}
                                    className={`group relative bg-slate-900/50 backdrop-blur-xl rounded-xl border overflow-hidden transition-all
                                        ${isSelected ? 'border-pink-500 ring-1 ring-pink-500' : 'border-white/5 hover:border-pink-500/30'}
                                        ${isBeingDragged ? 'opacity-40 scale-95' : 'opacity-100 scale-100'}
                                        ${isDragOver && !isBeingDragged ? 'border-cyan-400 bg-cyan-400/5 translate-y-[-8px]' : ''}
                                        ${!isBeingDragged ? 'hover:translate-y-[-4px] hover:shadow-xl' : ''}
                                    `}
                                    onClick={() => toggleSelection(image._id)}
                                >
                                    <div className="aspect-video relative bg-slate-950 cursor-pointer">
                                        <Image
                                            src={image.thumbnail || image.src}
                                            alt={image.description}
                                            fill
                                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                                        />

                                        {/* Selection & Pin Overlays */}
                                        <div className="absolute top-2 right-2 z-20 flex gap-2">
                                            {/* Pin Button */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    togglePin(image._id, image.isPinned);
                                                }}
                                                className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all transform
                                                    ${image.isPinned 
                                                        ? 'bg-cyan-500 border-cyan-500 text-white opacity-100 scale-100' 
                                                        : 'bg-black/50 border-white/20 text-white/50 opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 hover:bg-black/80 hover:border-white'
                                                    }
                                                `}
                                                title={image.isPinned ? "Unpin from top" : "Pin to top"}
                                            >
                                                <Pin size={14} className={image.isPinned ? "fill-current" : ""} />
                                            </button>

                                            {/* Selection Checkbox */}
                                            <div className={`transition-all duration-200 transform
                                                ${isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100'}
                                            `}>
                                                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center
                                                    ${isSelected ? 'bg-pink-500 border-pink-500 text-white' : 'bg-black/50 border-white/20 text-white/50 hover:bg-black/80 hover:border-white'}
                                                `}>
                                                    {isSelected && <Check size={14} />}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4 pointer-events-none">
                                            <div className="flex justify-between items-end pointer-events-auto">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] font-mono text-slate-300 bg-slate-900/50 px-2 py-1 rounded backdrop-blur-sm border border-white/10 w-fit">
                                                        {new Date(image.createdAt).toLocaleDateString()}
                                                    </span>
                                                    {image.isPinned && (
                                                        <span className="text-[10px] font-bold text-cyan-400 flex items-center gap-1">
                                                            <Pin size={10} className="fill-current" /> PINNED_PRIORITY
                                                        </span>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(image._id);
                                                    }}
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
                                        {isSavingOrder && isBeingDragged && (
                                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-30">
                                                <Loader2 className="animate-spin text-cyan-400 mb-2" size={24} />
                                                <span className="text-[10px] font-mono text-cyan-400">SAVING_POSITION...</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4 border-t border-white/5 bg-white/[0.01]">
                                        <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed" title={image.description}>
                                            {image.description}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}

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
