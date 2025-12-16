'use client';

import { useState, useEffect } from 'react';
import { Upload, X, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react';
import Image from 'next/image';

export default function GalleryManager() {
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [file, setFile] = useState(null);
    const [description, setDescription] = useState('');
    const [dragActive, setDragActive] = useState(false);
    const [preview, setPreview] = useState(null);

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
        const url = URL.createObjectURL(file);
        setPreview(url);
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
            // Get image dimensions (simplified: assuming we can get them or just using standard aspect ratio for now technically we should get them from the file)
            // For a robust implementation we'd read them from the file object before upload or backend does it.
            // Here I'll use a hack or just mock dimensions if backend doesn't provide.
            // Wait, backend upload API returns size/type but not dimensions.
            // I will create an image object to get dimensions.

            const img = document.createElement('img');
            img.src = preview;
            await new Promise(resolve => { img.onload = resolve; });

            const galleryData = {
                src: uploadData.url,
                description,
                width: img.naturalWidth,
                height: img.naturalHeight
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
            } else {
                throw new Error(galleryResult.error);
            }

        } catch (error) {
            alert(error.message);
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
            } else {
                alert(data.error);
            }
        } catch (error) {
            console.error('Failed to delete:', error);
        }
    };

    return (
        <div className="space-y-8">
            {/* Upload Section */}
            <div className="bg-[var(--surface-card)] rounded-xl p-6 border border-[var(--border-secondary)]">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Upload size={20} className="text-[var(--primary)]" /> Upload New Image
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!preview ? (
                        <div
                            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors
                        ${dragActive ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--border-secondary)] hover:border-[var(--text-secondary)]'}
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
                            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                                <ImageIcon size={48} className="text-[var(--text-secondary)]" />
                                <span className="text-lg font-medium">Drag & Drop or Click to Upload</span>
                                <span className="text-sm text-[var(--text-secondary)]">Supports JPG, PNG, WEBP</span>
                            </label>
                        </div>
                    ) : (
                        <div className="relative rounded-xl overflow-hidden border border-[var(--border-secondary)] bg-black/50">
                            <button
                                type="button"
                                onClick={clearFile}
                                className="absolute top-2 right-2 p-1 bg-red-500/80 hover:bg-red-500 text-white rounded-full transition-colors z-10"
                            >
                                <X size={16} />
                            </button>
                            <div className="flex flex-col md:flex-row gap-6 p-4">
                                <div className="relative h-48 w-full md:w-1/3 shrink-0">
                                    <Image
                                        src={preview}
                                        alt="Preview"
                                        fill
                                        className="object-contain"
                                    />
                                </div>
                                <div className="flex-1 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Description</label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            className="w-full px-4 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-secondary)] focus:border-[var(--primary)] outline-none min-h-[100px]"
                                            placeholder="Enter image description..."
                                            required
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={uploading}
                                        className="w-full py-2 bg-[var(--primary)] text-white rounded-lg hover:brightness-110 transition-all font-medium flex items-center justify-center gap-2"
                                    >
                                        {uploading ? <Loader2 className="animate-spin" /> : <Upload size={18} />}
                                        Upload Image
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </form>
            </div>

            {/* Gallery List */}
            <div className="bg-[var(--surface-card)] rounded-xl p-6 border border-[var(--border-secondary)]">
                <h2 className="text-xl font-bold mb-4">Gallery Items ({images.length})</h2>

                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="animate-spin text-[var(--primary)]" size={32} />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {images.map(image => (
                            <div key={image._id} className="group relative rounded-lg overflow-hidden border border-[var(--border-secondary)] bg-[var(--bg-primary)]">
                                <div className="aspect-video relative">
                                    <Image
                                        src={image.src}
                                        alt={image.description}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                                <div className="p-3">
                                    <p className="text-sm line-clamp-2 text-[var(--text-secondary)]" title={image.description}>
                                        {image.description}
                                    </p>
                                    <div className="flex justify-between items-center mt-2 text-xs text-[var(--text-tertiary)]">
                                        <span>{new Date(image.createdAt).toLocaleDateString()}</span>
                                        <button
                                            onClick={() => handleDelete(image._id)}
                                            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-md transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {images.length === 0 && (
                            <div className="col-span-full text-center py-8 text-[var(--text-secondary)]">
                                No images uploaded yet.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
