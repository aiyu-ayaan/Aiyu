'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    FaArrowsRotate,
    FaCheck,
    FaFloppyDisk,
    FaPen,
    FaSpinner,
    FaThumbtack,
    FaTrash,
    FaUpload,
    FaWandMagicSparkles,
    FaXmark,
} from 'react-icons/fa6';
import Image from 'next/image';
import Toast from './Toast';
import { heicPreviewUrl, isHeicFile } from '@/utils/heicPreview';
import { useAdminFeedback } from '@/app/components/admin/feedback/AdminFeedbackProvider';
import { Badge, EmptyState, Field, Loading, Panel, Stat } from './ui';
import '@/app/styles/admin-showcase.css';

export default function GalleryManager() {
    const { confirm } = useAdminFeedback();
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [migrating, setMigrating] = useState(false);
    const [migrationProgress, setMigrationProgress] = useState(null);
    const [files, setFiles] = useState([]); // Array of { file, preview, description, id }
    const [dragActive, setDragActive] = useState(false);
    const [notification, setNotification] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(null);

    // Filter & Edit Dialog State
    const [searchQuery, setSearchQuery] = useState('');
    const [filterMode, setFilterMode] = useState('all'); // 'all' | 'pinned' | 'raw'
    const [editingImage, setEditingImage] = useState(null);
    const [editDescription, setEditDescription] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);

    // Multi-select state
    const [selectedImages, setSelectedImages] = useState(new Set());
    const [deleting, setDeleting] = useState(false);
    const [aiEnabled, setAiEnabled] = useState(false);

    // AI Generation State
    const [generating, setGenerating] = useState(new Set());

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
            const isHeic = isHeicFile(file);
            const preview = isHeic ? 'HEIC_PLACEHOLDER' : URL.createObjectURL(file);

            return {
                id: Math.random().toString(36).substring(7),
                file,
                preview,
                description: '',
                isHeic,
                converting: isHeic,
            };
        });

        setFiles(prev => [...fileObjects, ...prev]);

        for (const obj of fileObjects.filter((f) => f.isHeic)) {
            heicPreviewUrl(obj.file)
                .then((url) => setFiles(prev => prev.map(f => (f.id === obj.id ? { ...f, preview: url, converting: false } : f))))
                .catch((error) => {
                    console.warn(`HEIC preview failed for ${obj.file.name}:`, error);
                    setFiles(prev => prev.map(f => (f.id === obj.id ? { ...f, converting: false } : f)));
                });
        }
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
                showNotification(true, 'Caption generated');
            } else {
                showNotification(false, data.error || 'Failed to generate caption');
            }
        } catch (error) {
            console.error('AI Generation failed:', error);
            showNotification(false, 'Caption generation failed');
        } finally {
            setGenerating(prev => {
                const next = new Set(prev);
                next.delete(fileId);
                return next;
            });
        }
    };

    const uploadSingleFile = async (fileObj) => {
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
            description: fileObj.description || 'No description',
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
        }
        throw new Error(galleryResult.error);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (files.length === 0) return;

        setUploading(true);
        let successCount = 0;
        let failCount = 0;
        let lastError = '';

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
                    lastError = `${fileObj.file.name}: ${error.message}`;
                }
            }

            if (successCount > 0) {
                showNotification(true, `Uploaded ${successCount} photo${successCount === 1 ? '' : 's'}${failCount > 0 ? `. Failed: ${failCount} (${lastError})` : ''}`);
                clearFiles();
            } else {
                showNotification(false, `All uploads failed. ${lastError}`);
            }
        } catch {
            showNotification(false, 'Upload process encountered an error.');
        } finally {
            setUploading(false);
            setUploadProgress(null);
        }
    };

    const handleDelete = async (id) => {
        if (!(await confirm({
            title: 'Delete image?',
            message: 'Are you sure you want to delete this image? This action cannot be undone.',
            confirmText: 'Delete',
            danger: true,
        }))) return;

        try {
            const res = await fetch(`/api/gallery?id=${id}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (data.success) {
                setImages(images.filter(img => img._id !== id));
                if (selectedImages.has(id)) {
                    const newSelected = new Set(selectedImages);
                    newSelected.delete(id);
                    setSelectedImages(newSelected);
                }
                showNotification(true, 'Image deleted');
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
            setSelectedImages(new Set());
        } else {
            const allIds = new Set(images.map(img => img._id));
            setSelectedImages(allIds);
        }
    };

    const handleBulkDelete = async () => {
        const count = selectedImages.size;
        if (count === 0) return;

        if (!(await confirm({
            title: `Delete ${count} images?`,
            message: 'Are you sure you want to delete these images? This action cannot be undone.',
            confirmText: 'Delete',
            danger: true,
        }))) return;

        setDeleting(true);
        let deletedCount = 0;
        let failCount = 0;

        const idsToDelete = Array.from(selectedImages);

        for (const id of idsToDelete) {
            try {
                const res = await fetch(`/api/gallery?id=${id}`, {
                    method: 'DELETE',
                });
                const data = await res.json();

                if (data.success) {
                    deletedCount++;
                    setImages(prev => prev.filter(img => img._id !== id));
                } else {
                    failCount++;
                }
            } catch {
                failCount++;
            }
        }

        setSelectedImages(new Set());
        setDeleting(false);

        if (deletedCount > 0) {
            showNotification(true, `Deleted ${deletedCount} image${deletedCount === 1 ? '' : 's'}${failCount > 0 ? `. Failed: ${failCount}` : ''}`);
        } else {
            showNotification(false, 'Failed to delete images.');
        }
    };

    // --- Pin, Edit & Order Logic ---
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
                showNotification(true, currentStatus ? 'Photo unpinned' : 'Photo pinned to top');
            } else {
                showNotification(false, data.error);
            }
        } catch (error) {
            console.error('Failed to toggle pin:', error);
            showNotification(false, 'Failed to update pin status');
        }
    };

    const openEditDialog = (image) => {
        setEditingImage(image);
        setEditDescription(image.description === 'No description' ? '' : (image.description || ''));
    };

    const saveEditDialog = async (e) => {
        e.preventDefault();
        if (!editingImage) return;
        setSavingEdit(true);
        try {
            const nextDesc = editDescription.trim() || 'No description';
            const res = await fetch('/api/gallery', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: editingImage._id, update: { description: nextDesc } }),
            });
            const data = await res.json();
            if (data.success) {
                setImages((prev) => prev.map((img) => (img._id === editingImage._id ? { ...img, description: nextDesc } : img)));
                setEditingImage(null);
                showNotification(true, 'Caption saved');
            } else {
                showNotification(false, data.error || 'Failed to update caption');
            }
        } catch {
            showNotification(false, 'Failed to update caption');
        } finally {
            setSavingEdit(false);
        }
    };

    const handleDragStartItem = (e, index) => {
        setDraggedItemIdx(index);
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
        e.preventDefault();
    };

    const handleDragEndItem = async () => {
        if (draggedItemIdx !== null && dragOverItemIdx !== null && draggedItemIdx !== dragOverItemIdx) {
            const newImages = [...images];
            const draggedItem = newImages[draggedItemIdx];
            newImages.splice(draggedItemIdx, 1);
            newImages.splice(dragOverItemIdx, 0, draggedItem);
            setImages(newImages);

            setIsSavingOrder(true);
            try {
                const updates = newImages.map((img, i) => ({ id: img._id, order: i }));
                const res = await fetch('/api/gallery', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items: updates })
                });
                const data = await res.json();
                if (data.success) {
                    showNotification(true, 'Photo order saved');
                } else {
                    showNotification(false, data.error || 'Failed to save order');
                    fetchImages();
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
        if (!(await confirm({
            title: 'Generate thumbnails?',
            message: 'Generate thumbnails for existing images? This may take a while.',
            confirmText: 'Generate',
        }))) return;

        setMigrating(true);
        setMigrationProgress({ message: 'Starting thumbnail generation…', percentage: 0 });

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

            showNotification(true, 'Thumbnails generated');
            fetchImages();
        } catch (error) {
            console.error('Migration failed:', error);
            showNotification(false, `Thumbnail generation failed: ${error.message}`);
        } finally {
            setMigrating(false);
            setMigrationProgress(null);
        }
    };

    const pinnedCount = useMemo(() => images.filter((i) => i.isPinned).length, [images]);
    const rawCount = useMemo(() => images.filter((i) => !i.thumbnail).length, [images]);

    const visibleImages = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return images
            .map((image, idx) => ({ image, idx }))
            .filter(({ image }) => {
                if (filterMode === 'pinned' && !image.isPinned) return false;
                if (filterMode === 'raw' && image.thumbnail) return false;
                if (q && !(image.description || '').toLowerCase().includes(q)) return false;
                return true;
            });
    }, [images, searchQuery, filterMode]);

    return (
        <div className="space-y-6">
            {editingImage && (
                <div className="adm-overlay" role="dialog" aria-modal="true" aria-labelledby="gallery-edit-title">
                    <form onSubmit={saveEditDialog} className="adm-dialog">
                        <header className="adm-panel-head">
                            <h3 id="gallery-edit-title" className="adm-panel-title">Edit photo caption</h3>
                            <button
                                type="button"
                                onClick={() => setEditingImage(null)}
                                className="adm-icon-btn"
                                aria-label="Close edit dialog"
                            >
                                <FaXmark aria-hidden="true" />
                            </button>
                        </header>
                        <div className="adm-panel-body space-y-4">
                            <div className="adm-sc-photo-media rounded-[10px] border border-[var(--hairline)]">
                                <Image
                                    src={editingImage.thumbnail || editingImage.src}
                                    alt={editingImage.description || 'Photo'}
                                    fill
                                    sizes="28rem"
                                    unoptimized
                                    className="object-cover"
                                />
                            </div>
                            <Field label="Caption" help="Shown when visitors inspect the photo in the gallery.">
                                <textarea
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    rows={3}
                                    className="adm-input"
                                    placeholder="Describe this photo…"
                                    autoFocus
                                />
                            </Field>
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setEditingImage(null)} className="adm-btn">
                                    Cancel
                                </button>
                                <button type="submit" disabled={savingEdit} className="adm-btn adm-btn-primary">
                                    {savingEdit ? <FaSpinner className="animate-spin" aria-hidden="true" /> : <FaFloppyDisk aria-hidden="true" />}
                                    Save caption
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            <div className="adm-stats">
                <Stat label="Photos" value={images.length} hint="Drag cards to reorder" />
                <Stat label="Pinned" value={pinnedCount} hint="Shown first on /gallery" />
                <Stat label="Queued to upload" value={files.length} hint={uploading ? 'Uploading batch…' : 'Ready in dropzone'} />
                <Stat
                    label="Missing thumbnails"
                    value={rawCount}
                    hint={rawCount > 0 ? 'Run thumbnail generator' : 'All thumbnails ready'}
                />
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
                <Panel
                    title="Upload photos"
                    actions={
                        files.length > 0 ? (
                            <button type="button" onClick={clearFiles} className="adm-btn adm-btn-quiet">
                                Clear queue ({files.length})
                            </button>
                        ) : null
                    }
                >
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div
                            data-active={dragActive}
                            className="adm-sc-drop"
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                        >
                            <input
                                type="file"
                                id="file-upload"
                                className="sr-only"
                                onChange={handleChange}
                                accept="image/*,.heic,.heif"
                                multiple
                            />
                            <label htmlFor="file-upload" className="flex cursor-pointer flex-col items-center gap-2">
                                <FaUpload className="text-xl text-[var(--adm-accent-ink)]" aria-hidden="true" />
                                <span className="text-sm font-semibold text-[var(--text-bright)]">
                                    Drop photos here or click to browse
                                </span>
                                <span className="adm-help">
                                    Supports JPEG, PNG, WebP and HEIC. Multiple files allowed.
                                </span>
                            </label>
                        </div>

                        {files.length > 0 && (
                            <div className="space-y-4">
                                <div className="max-h-96 space-y-3 overflow-y-auto">
                                    {files.map((fileObj) => (
                                        <div key={fileObj.id} className="adm-sc-item">
                                            <div className="adm-sc-item-head">
                                                <span className="min-w-0 flex-1 truncate font-mono text-xs text-[var(--text-bright)]">
                                                    {fileObj.file.name}
                                                </span>
                                                <Badge>{(fileObj.file.size / 1024 / 1024).toFixed(2)} MB</Badge>
                                                <button
                                                    type="button"
                                                    onClick={() => removeFile(fileObj.id)}
                                                    className="adm-icon-btn"
                                                    title="Remove from queue"
                                                    aria-label={`Remove ${fileObj.file.name}`}
                                                >
                                                    <FaXmark aria-hidden="true" />
                                                </button>
                                            </div>
                                            <div className="adm-sc-item-body sm:flex-row sm:items-start">
                                                <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-[var(--hairline)] bg-[var(--bg-secondary)] flex items-center justify-center">
                                                    {fileObj.preview === 'HEIC_PLACEHOLDER' ? (
                                                        <span className="font-mono text-xs text-[var(--text-secondary)]">
                                                            {fileObj.converting ? 'HEIC…' : 'HEIC'}
                                                        </span>
                                                    ) : (
                                                        <Image
                                                            src={fileObj.preview}
                                                            alt={fileObj.file.name}
                                                            fill
                                                            className="object-contain"
                                                        />
                                                    )}
                                                </div>

                                                <div className="min-w-0 flex-1 space-y-2">
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <label htmlFor={`caption-${fileObj.id}`} className="adm-label">
                                                            Caption (optional)
                                                        </label>
                                                        {aiEnabled && (
                                                            <button
                                                                type="button"
                                                                onClick={() => generateCaption(fileObj.id, fileObj.file)}
                                                                disabled={generating.has(fileObj.id)}
                                                                className="adm-btn adm-btn-quiet"
                                                            >
                                                                {generating.has(fileObj.id) ? (
                                                                    <FaSpinner className="animate-spin" aria-hidden="true" />
                                                                ) : (
                                                                    <FaWandMagicSparkles aria-hidden="true" />
                                                                )}
                                                                Generate caption
                                                            </button>
                                                        )}
                                                    </div>
                                                    <textarea
                                                        id={`caption-${fileObj.id}`}
                                                        value={fileObj.description || ''}
                                                        onChange={(e) => updateFileDescription(fileObj.id, e.target.value)}
                                                        className="adm-input !min-h-14"
                                                        placeholder="Describe this photo…"
                                                        rows={2}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {uploading && uploadProgress && (
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between font-mono text-xs text-[var(--text-secondary)]">
                                            <span className="truncate">Uploading {uploadProgress.filename}</span>
                                            <span>{uploadProgress.current} / {uploadProgress.total}</span>
                                        </div>
                                        <div className="adm-sc-progress">
                                            <div style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }} />
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={uploading}
                                        className="adm-btn adm-btn-primary"
                                    >
                                        {uploading ? (
                                            <>
                                                <FaSpinner className="animate-spin" aria-hidden="true" />
                                                Uploading batch…
                                            </>
                                        ) : (
                                            <>
                                                <FaUpload aria-hidden="true" />
                                                Upload {files.length} {files.length === 1 ? 'photo' : 'photos'}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </form>
                </Panel>

                <Panel title="Thumbnail optimization">
                    <div className="space-y-4">
                        <p className="adm-help">
                            Generate compressed WebP thumbnails for older photos that were uploaded before automatic thumbnail creation.
                        </p>
                        <button
                            type="button"
                            onClick={handleMigration}
                            disabled={migrating}
                            className="adm-btn w-full"
                        >
                            <FaArrowsRotate className={migrating ? 'animate-spin' : ''} aria-hidden="true" />
                            {migrating ? 'Generating thumbnails…' : 'Generate missing thumbnails'}
                        </button>

                        {migrationProgress && (
                            <div className="space-y-2 rounded-[10px] border border-[var(--hairline)] bg-[var(--bg-secondary)] p-3">
                                <div className="flex justify-between font-mono text-xs">
                                    <span className="text-[var(--text-primary)]">{migrationProgress.message}</span>
                                    <span className="text-[var(--text-secondary)]">{migrationProgress.percentage}%</span>
                                </div>
                                {migrationProgress.percentage !== undefined && (
                                    <div className="adm-sc-progress">
                                        <div style={{ width: `${migrationProgress.percentage}%` }} />
                                    </div>
                                )}
                                {migrationProgress.processed && migrationProgress.total && (
                                    <p className="adm-help text-right font-mono">
                                        Processed {migrationProgress.processed} / {migrationProgress.total}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </Panel>
            </div>

            <Panel
                title={`Library (${visibleImages.length}${visibleImages.length !== images.length ? ` of ${images.length}` : ''})`}
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        {isSavingOrder && <Badge tone="info">Saving order…</Badge>}
                        {images.length > 0 && (
                            <button type="button" onClick={selectAll} className="adm-btn">
                                {selectedImages.size === images.length ? 'Deselect all' : 'Select all'}
                            </button>
                        )}
                        {selectedImages.size > 0 && (
                            <button
                                type="button"
                                onClick={handleBulkDelete}
                                disabled={deleting}
                                className="adm-btn adm-btn-danger"
                            >
                                {deleting ? <FaSpinner className="animate-spin" aria-hidden="true" /> : <FaTrash aria-hidden="true" />}
                                Delete selected ({selectedImages.size})
                            </button>
                        )}
                    </div>
                }
            >
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="adm-tabs border-b-0" role="tablist" aria-label="Filter photos">
                            {[
                                { id: 'all', label: `All (${images.length})` },
                                { id: 'pinned', label: `Pinned (${pinnedCount})` },
                                { id: 'raw', label: `Missing thumbnail (${rawCount})` },
                            ].map((t) => (
                                <button
                                    key={t.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={filterMode === t.id}
                                    onClick={() => setFilterMode(t.id)}
                                    className="adm-tab"
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                        <div className="w-full sm:w-64">
                            <input
                                type="search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Filter by caption…"
                                aria-label="Filter photos by caption"
                                className="adm-input"
                            />
                        </div>
                    </div>

                    {loading ? (
                        <Loading label="Loading gallery photos" rows={4} />
                    ) : visibleImages.length === 0 ? (
                        <EmptyState
                            title={images.length === 0 ? 'No photos in the gallery yet' : 'No photos match your filter'}
                            description={
                                images.length === 0
                                    ? 'Drop photos into the upload panel above to populate your public gallery.'
                                    : 'Clear the search or switch back to All photos.'
                            }
                        />
                    ) : (
                        <div className="adm-sc-gallery">
                            {visibleImages.map(({ image, idx }) => {
                                const isSelected = selectedImages.has(image._id);
                                const isBeingDragged = draggedItemIdx === idx;
                                const isDragOver = dragOverItemIdx === idx && !isBeingDragged;

                                return (
                                    <article
                                        key={image._id}
                                        draggable
                                        onDragStart={(e) => handleDragStartItem(e, idx)}
                                        onDragEnter={(e) => handleDragEnterItem(e, idx)}
                                        onDragEnd={handleDragEndItem}
                                        onDragOver={handleDragOverItem}
                                        data-selected={isSelected}
                                        data-dragging={isBeingDragged}
                                        data-drag-over={isDragOver}
                                        className="adm-sc-photo"
                                    >
                                        <div
                                            onClick={() => toggleSelection(image._id)}
                                            className="adm-sc-photo-media cursor-pointer"
                                        >
                                            <Image
                                                src={image.thumbnail || image.src}
                                                alt={image.description || 'Gallery photo'}
                                                fill
                                                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 20vw"
                                                unoptimized
                                                className="object-cover"
                                            />
                                            <div className="absolute left-2 top-2 flex flex-wrap gap-1">
                                                {image.isPinned && <Badge tone="info">Pinned</Badge>}
                                                {!image.thumbnail && <Badge tone="warn">Raw</Badge>}
                                            </div>
                                        </div>

                                        <div className="adm-sc-photo-foot">
                                            <p
                                                className="line-clamp-2 text-xs text-[var(--text-primary)]"
                                                title={image.description}
                                            >
                                                {image.description || 'No description'}
                                            </p>
                                            <div className="flex items-center justify-between gap-1 pt-1">
                                                <span className="adm-num adm-help">
                                                    {image.createdAt ? new Date(image.createdAt).toLocaleDateString() : ''}
                                                </span>
                                                <div className="flex items-center gap-0.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleSelection(image._id)}
                                                        className="adm-icon-btn"
                                                        aria-pressed={isSelected}
                                                        title={isSelected ? 'Deselect photo' : 'Select photo'}
                                                        aria-label={isSelected ? 'Deselect photo' : 'Select photo'}
                                                    >
                                                        <FaCheck
                                                            className={isSelected ? 'text-[var(--adm-accent-ink)]' : 'opacity-40'}
                                                            aria-hidden="true"
                                                        />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => togglePin(image._id, image.isPinned)}
                                                        className="adm-icon-btn"
                                                        aria-pressed={!!image.isPinned}
                                                        title={image.isPinned ? 'Unpin from top' : 'Pin to top'}
                                                        aria-label={image.isPinned ? 'Unpin from top' : 'Pin to top'}
                                                    >
                                                        <FaThumbtack
                                                            className={image.isPinned ? 'text-[var(--adm-accent-ink)]' : ''}
                                                            aria-hidden="true"
                                                        />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditDialog(image)}
                                                        className="adm-icon-btn"
                                                        title="Edit caption"
                                                        aria-label="Edit caption"
                                                    >
                                                        <FaPen aria-hidden="true" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(image._id)}
                                                        className="adm-icon-btn"
                                                        title="Delete photo"
                                                        aria-label="Delete photo"
                                                    >
                                                        <FaTrash aria-hidden="true" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </div>
            </Panel>

            <Toast notification={notification} />
        </div>
    );
}
