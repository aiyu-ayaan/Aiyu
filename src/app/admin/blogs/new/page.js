
"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import dynamic from 'next/dynamic';

// Dynamic import for syntax highlighting to avoid SSR issues
const SyntaxHighlighter = dynamic(() => import('react-syntax-highlighter').then(mod => mod.Prism), { ssr: false });
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function NewBlogPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        image: '',
        tags: '',
        date: new Date().toISOString().split('T')[0],
    });
    const [submitting, setSubmitting] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);
    const [imageMode, setImageMode] = useState('url'); // 'url' or 'upload'
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadPreview, setUploadPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
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
            handleFileSelection(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelection(e.target.files[0]);
        }
    };

    const handleFileSelection = (file) => {
        setUploadFile(file);

        // Check if HEIC
        const isHeic = file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic';

        if (isHeic) {
            setUploadPreview('HEIC_PLACEHOLDER');
        } else {
            const url = URL.createObjectURL(file);
            setUploadPreview(url);
        }
    };

    const handleUpload = async () => {
        if (!uploadFile) return;

        setUploading(true);
        try {
            const formDataObj = new FormData();
            formDataObj.append('file', uploadFile);

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formDataObj,
            });

            const data = await res.json();

            if (data.success) {
                setFormData((prev) => ({ ...prev, image: data.url }));
                alert('Image uploaded successfully!');
            } else {
                alert('Upload failed: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            alert('Upload failed: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const clearUpload = () => {
        setUploadFile(null);
        setUploadPreview(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        // Create date object from the YYYY-MM-DD string treating it as local time
        const [year, month, day] = formData.date.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);

        const dataToSubmit = {
            ...formData,
            // Format date to match existing string format "Month DD, YYYY"
            date: dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== ''),
            published: false,
        };

        try {
            const res = await fetch('/api/blogs', {
                method: 'POST',
                headers: {
                    // pending verification of middleware
                },
                body: JSON.stringify(dataToSubmit),
            });

            if (res.ok) {
                router.push('/admin/blogs');
            } else {
                alert('Failed to create blog');
            }
        } catch (error) {
            console.error('Error creating blog:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const insertImageMarkdown = () => {
        if (formData.image) {
            const imageMarkdown = `![Image Alt Text](${formData.image})`;
            setFormData(prev => ({ ...prev, content: prev.content + '\n' + imageMarkdown }));
            alert('Image markdown appended to content!');
        } else {
            alert('No image selected/uploaded to insert.');
        }
    };

    return (
        <div className="p-8 min-h-screen text-white w-full">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Create New Blog</h1>
                <button
                    type="button"
                    onClick={() => setPreviewMode(!previewMode)}
                    className="text-sm bg-gray-700 px-4 py-2 rounded hover:bg-gray-600 transition-colors"
                >
                    {previewMode ? 'Edit Mode' : 'Preview Mode'}
                </button>
            </div>

            <form onSubmit={handleSubmit} className="w-full bg-gray-800 p-6 rounded-lg shadow-lg space-y-6">
                {/* Meta Fields Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium mb-1">Title</label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            required
                            className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Date</label>
                        <div className="custom-datepicker-wrapper">
                            <DatePicker
                                selected={formData.date ? new Date(formData.date) : null}
                                onChange={(date) => {
                                    if (!date) {
                                        setFormData({ ...formData, date: '' });
                                    } else {
                                        const year = date.getFullYear();
                                        const month = String(date.getMonth() + 1).padStart(2, '0');
                                        const day = String(date.getDate()).padStart(2, '0');
                                        setFormData({ ...formData, date: `${year}-${month}-${day}` });
                                    }
                                }}
                                dateFormat="MMMM d, yyyy"
                                className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:outline-none focus:border-blue-500 text-white"
                                placeholderText="Select date"
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Tags (comma separated)</label>
                    <input
                        type="text"
                        name="tags"
                        value={formData.tags}
                        onChange={handleChange}
                        placeholder="React, Next.js, Web"
                        className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
                    />
                </div>

                {/* Image Input with URL/Upload Toggle */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium">Image Cover</label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setImageMode('url')}
                                className={`px-3 py-1 text-xs rounded transition-colors ${imageMode === 'url'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    }`}
                            >
                                URL
                            </button>
                            <button
                                type="button"
                                onClick={() => setImageMode('upload')}
                                className={`px-3 py-1 text-xs rounded transition-colors ${imageMode === 'upload'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    }`}
                            >
                                Upload
                            </button>
                        </div>
                    </div>

                    {imageMode === 'url' ? (
                        <>
                            <input
                                type="text"
                                name="image"
                                value={formData.image}
                                onChange={handleChange}
                                placeholder="https://example.com/image.jpg"
                                className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
                            />
                            {formData.image && (
                                <div className="mt-2 text-center">
                                    <p className="text-xs text-gray-400 mb-1">Preview:</p>
                                    <img src={formData.image} alt="Preview" className="h-48 mx-auto rounded object-cover border border-gray-600" />
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {!uploadFile ? (
                                <div
                                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
                                        ${dragActive ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 hover:border-gray-500'}
                                    `}
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                    onClick={() => document.getElementById('blog-file-upload').click()}
                                >
                                    <input
                                        type="file"
                                        id="blog-file-upload"
                                        className="hidden"
                                        onChange={handleFileChange}
                                        accept="image/*"
                                    />
                                    <div className="flex flex-col items-center gap-2">
                                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <span className="text-lg font-medium">Drag & Drop or Click to Upload</span>
                                        <span className="text-sm text-gray-400">Supports JPG, PNG, WEBP, HEIC</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="relative rounded-xl overflow-hidden border border-gray-600 bg-gray-900">
                                    <button
                                        type="button"
                                        onClick={clearUpload}
                                        className="absolute top-2 right-2 p-1 bg-red-500/80 hover:bg-red-500 text-white rounded-full transition-colors z-10"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                    <div className="flex flex-col md:flex-row gap-6 p-4">
                                        <div className="relative h-48 w-full md:w-1/3 shrink-0 flex items-center justify-center bg-gray-800 rounded-lg">
                                            {uploadPreview === 'HEIC_PLACEHOLDER' ? (
                                                <div className="text-center p-4">
                                                    <div className="mx-auto mb-2 w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center text-blue-400 font-bold">
                                                        H
                                                    </div>
                                                    <p className="font-medium">HEIC File</p>
                                                    <p className="text-xs text-gray-400">Preview not available</p>
                                                    <p className="text-xs text-blue-400 mt-1">Will be converted to WebP</p>
                                                </div>
                                            ) : (
                                                <img
                                                    src={uploadPreview}
                                                    alt="Preview"
                                                    className="w-full h-full object-contain rounded"
                                                />
                                            )}
                                        </div>
                                        <div className="flex-1 flex flex-col justify-center gap-3">
                                            <div>
                                                <p className="text-sm font-medium">{uploadFile.name}</p>
                                                <p className="text-xs text-gray-400">{(uploadFile.size / 1024).toFixed(2)} KB</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleUpload}
                                                disabled={uploading || formData.image}
                                                className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {uploading ? (
                                                    <>
                                                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        Uploading...
                                                    </>
                                                ) : formData.image ? (
                                                    <>
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                        Uploaded!
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                        </svg>
                                                        Upload Image
                                                    </>
                                                )}
                                            </button>
                                            {formData.image && (
                                                <div className="text-sm text-green-400 text-center">✓ Image ready for blog</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {formData.image && (
                        <button
                            type="button"
                            onClick={insertImageMarkdown}
                            className="mt-2 text-xs text-green-400 hover:text-green-300 underline"
                        >
                            Insert into Content
                        </button>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Content (Markdown)</label>

                    {previewMode ? (
                        <div className="w-full min-h-[500px] p-6 bg-gray-900 rounded border border-gray-700 prose prose-invert max-w-none">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    code({ node, inline, className, children, ...props }) {
                                        const match = /language-(\w+)/.exec(className || '')
                                        return !inline && match ? (
                                            <SyntaxHighlighter
                                                style={vscDarkPlus}
                                                language={match[1]}
                                                PreTag="div"
                                                {...props}
                                            >
                                                {String(children).replace(/\n$/, '')}
                                            </SyntaxHighlighter>
                                        ) : (
                                            <code className={className} {...props}>
                                                {children}
                                            </code>
                                        )
                                    },
                                    pre: ({ children }) => <>{children}</>
                                }}
                            >
                                {formData.content}
                            </ReactMarkdown>
                        </div>
                    ) : (
                        <textarea
                            name="content"
                            value={formData.content}
                            onChange={handleChange}
                            required
                            className="w-full h-[500px] p-4 bg-gray-700 rounded border border-gray-600 focus:outline-none focus:border-blue-500 font-mono text-sm leading-relaxed"
                            placeholder="# Write your blog post in Markdown..."
                        ></textarea>
                    )}
                </div>

                <div className="flex gap-4 pt-4 border-t border-gray-700 mt-8">
                    <button
                        type="submit"
                        disabled={submitting}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded transition-colors disabled:opacity-50"
                    >
                        {submitting ? 'Creating...' : 'Create Blog'}
                    </button>
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </form >
        </div >
    );
}
