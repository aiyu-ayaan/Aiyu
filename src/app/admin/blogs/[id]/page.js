"use client";
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import dynamic from 'next/dynamic';
import Link from 'next/link';

// Dynamic imports for heavy components
const SyntaxHighlighter = dynamic(() => import('react-syntax-highlighter').then(mod => mod.Prism), { ssr: false });
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Loader2, Save, ArrowLeft, Image as ImageIcon, Eye, Edit2, Upload, FileText, Calendar, Tag, X } from 'lucide-react';

export default function EditBlogPage() {
    const router = useRouter();
    const { id } = useParams();
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        image: '',
        tags: '',
        date: '',
    });
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);
    const [imageMode, setImageMode] = useState('url'); // 'url' or 'upload'
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadPreview, setUploadPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    useEffect(() => {
        const fetchBlog = async () => {
            try {
                const res = await fetch(`/api/blogs/${id}`);
                const data = await res.json();
                if (data.success) {
                    const d = new Date(data.data.date);
                    // Format to YYYY-MM-DD manually to avoid timezone shifts from toISOString()
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');

                    setFormData({
                        ...data.data,
                        tags: data.data.tags ? data.data.tags.join(', ') : '',
                        date: `${year}-${month}-${day}`,
                    });
                } else {
                    alert('Blog not found');
                    router.push('/admin/blogs');
                }
            } catch (error) {
                console.error('Failed to fetch blog:', error);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchBlog();
        }
    }, [id, router]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        const [year, month, day] = formData.date.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);

        const dataToSubmit = {
            ...formData,
            date: dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '')
        };

        try {
            const res = await fetch(`/api/blogs/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dataToSubmit),
            });

            if (res.ok) {
                router.push('/admin/blogs');
            } else {
                alert('Failed to update blog');
            }
        } catch (error) {
            console.error('Error updating blog:', error);
        } finally {
            setSubmitting(false);
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

    const insertImageMarkdown = () => {
        if (formData.image) {
            const imageMarkdown = `![Image Alt Text](${formData.image})`;
            setFormData(prev => ({ ...prev, content: prev.content + '\n' + imageMarkdown }));
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <span className="font-mono text-cyan-400 animate-pulse">DECRYPTING_TRANSMISSION...</span>
        </div>
    );

    return (
        <div className="p-8 max-w-7xl mx-auto min-h-screen">
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <Link href="/admin/blogs" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors mb-4 text-sm font-mono opacity-60 hover:opacity-100">
                        ← ABORT_EDIT
                    </Link>
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-1 tracking-tight">Edit Transmission</h1>
                    <p className="text-slate-400">Modify existing content entry ID: <span className="font-mono text-xs opacity-50">{id}</span></p>
                </div>

                {/* Mode Toggle */}
                <div className="bg-slate-900/50 p-1 rounded-lg border border-white/10 flex">
                    <button
                        type="button"
                        onClick={() => setPreviewMode(false)}
                        className={`px-4 py-2 rounded-md transition-all flex items-center gap-2 text-sm font-bold uppercase tracking-wide ${!previewMode ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Edit2 className="w-3.5 h-3.5" /> Editor
                    </button>
                    <button
                        type="button"
                        onClick={() => setPreviewMode(true)}
                        className={`px-4 py-2 rounded-md transition-all flex items-center gap-2 text-sm font-bold uppercase tracking-wide ${previewMode ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Eye className="w-3.5 h-3.5" /> Preview
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Metadata Section */}
                <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                    <h2 className="text-sm font-mono text-cyan-500/70 uppercase tracking-widest mb-8 flex items-center gap-4 relative z-10">
                        Header Metadata
                        <div className="h-px bg-cyan-500/10 flex-grow" />
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                        <div>
                            <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 mb-2">Transmission Title</label>
                            <div className="relative group/input">
                                <FileText className="absolute left-4 top-3.5 text-slate-500 group-focus-within/input:text-cyan-400 transition-colors" size={18} />
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    required
                                    placeholder="ENTER_TITLE"
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-slate-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all placeholder:text-slate-600 font-bold"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 mb-2">Stardate</label>
                            <div className="relative group/input">
                                <Calendar className="absolute left-4 top-3.5 text-slate-500 group-focus-within/input:text-cyan-400 transition-colors z-10" size={18} />
                                <div className="custom-datepicker-wrapper w-full">
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
                                        dateFormat="yyyy-MM-dd"
                                        className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-slate-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all placeholder:text-slate-600 font-mono"
                                        placeholderText="YYYY-MM-DD"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 relative z-10">
                        <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 mb-2">Topic Vectors (Comma Separated)</label>
                        <div className="relative group/input">
                            <Tag className="absolute left-4 top-3.5 text-slate-500 group-focus-within/input:text-cyan-400 transition-colors" size={18} />
                            <input
                                type="text"
                                name="tags"
                                value={formData.tags}
                                onChange={handleChange}
                                placeholder="REACT, NEXT.JS, SYSTEM_DESIGN"
                                className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-slate-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all placeholder:text-slate-600 font-mono"
                            />
                        </div>
                    </div>
                </div>

                {/* Cover Image Section */}
                <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                    <div className="flex justify-between items-center mb-8 relative z-10">
                        <h2 className="text-sm font-mono text-purple-500/70 uppercase tracking-widest flex items-center gap-4">
                            Visual Attachment
                            <div className="h-px w-20 bg-purple-500/10" />
                        </h2>
                        <div className="flex bg-slate-950/50 rounded-lg p-1 border border-white/10">
                            <button
                                type="button"
                                onClick={() => setImageMode('url')}
                                className={`px-3 py-1 text-[10px] uppercase font-bold rounded transition-colors ${imageMode === 'url' ? 'bg-purple-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                External URL
                            </button>
                            <button
                                type="button"
                                onClick={() => setImageMode('upload')}
                                className={`px-3 py-1 text-[10px] uppercase font-bold rounded transition-colors ${imageMode === 'upload' ? 'bg-purple-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                Local Upload
                            </button>
                        </div>
                    </div>

                    <div className="relative z-10">
                        {imageMode === 'url' ? (
                            <div className="space-y-4">
                                <div className="relative group/input">
                                    <ImageIcon className="absolute left-4 top-3.5 text-slate-500 group-focus-within/input:text-purple-400 transition-colors" size={18} />
                                    <input
                                        type="text"
                                        name="image"
                                        value={formData.image}
                                        onChange={handleChange}
                                        placeholder="https://source.com/image_asset.jpg"
                                        className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-slate-200 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all placeholder:text-slate-600 font-mono"
                                    />
                                </div>
                                {formData.image && (
                                    <div className="relative h-48 w-full rounded-xl overflow-hidden border border-white/10 group/preview">
                                        <img src={formData.image} alt="Preview" className="w-full h-full object-cover opacity-60 group-hover/preview:opacity-100 transition-opacity" />
                                        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-xs font-mono text-purple-400 border border-purple-500/30">PREVIEW_ACTIVE</div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col md:flex-row gap-6">
                                {/* Upload Box */}
                                {!uploadFile ? (
                                    <div
                                        className={`flex-1 border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer group/drop ${dragActive ? 'border-purple-500 bg-purple-500/10' : 'border-white/10 hover:border-purple-500/30 hover:bg-white/[0.02]'
                                            }`}
                                        onDragEnter={handleDrag}
                                        onDragLeave={handleDrag}
                                        onDragOver={handleDrag}
                                        onDrop={handleDrop}
                                        onClick={() => document.getElementById('blog-edit-upload').click()}
                                    >
                                        <input
                                            type="file"
                                            id="blog-edit-upload"
                                            className="hidden"
                                            onChange={handleFileChange}
                                            accept="image/*"
                                        />
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center group-hover/drop:scale-110 transition-transform group-hover/drop:bg-purple-500/10 group-hover/drop:text-purple-400 text-slate-500">
                                                <Upload className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="text-slate-300 font-bold mb-1">Upload Asset</h3>
                                                <p className="text-slate-500 text-xs font-mono">DRAG_AND_DROP_OR_CLICK</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-full flex gap-4 p-4 bg-slate-950/50 rounded-xl border border-white/10 items-center">
                                        <div className="w-20 h-20 bg-white/5 rounded-lg overflow-hidden flex items-center justify-center shrink-0 border border-white/5">
                                            {uploadPreview === 'HEIC_PLACEHOLDER' ? (
                                                <span className="text-xs font-mono text-purple-400">HEIC</span>
                                            ) : (
                                                <img src={uploadPreview} className="w-full h-full object-cover" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <p className="text-sm font-bold text-slate-200 truncate">{uploadFile.name}</p>
                                                    <p className="text-xs font-mono text-slate-500">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                                                </div>
                                                <button type="button" onClick={clearUpload} className="p-1 hover:bg-white/10 rounded text-slate-500 hover:text-white transition-colors">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                            {formData.image !== uploadPreview && (
                                                <button
                                                    type="button"
                                                    onClick={handleUpload}
                                                    disabled={uploading}
                                                    className="w-full py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2"
                                                >
                                                    {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                                    {uploading ? 'UPLOADING...' : 'CONFIRM_UPLOAD'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Insert Button */}
                        {formData.image && (
                            <button
                                type="button"
                                onClick={insertImageMarkdown}
                                className="mt-4 text-xs font-mono text-purple-400 hover:text-purple-300 flex items-center gap-2 hover:underline"
                            >
                                <Upload className="w-3 h-3" />
                                INJECT_MARKDOWN_REFERENCE
                            </button>
                        )}
                    </div>
                </div>

                {/* Content Editor */}
                <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-8 relative overflow-hidden group min-h-[600px] flex flex-col">
                    <h2 className="text-sm font-mono text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-4">
                        Data Payload (Markdown)
                        <div className="h-px bg-white/5 flex-grow" />
                    </h2>

                    <div className="flex-1 bg-slate-950/50 rounded-xl border border-white/10 overflow-hidden relative">
                        {previewMode ? (
                            <div className="absolute inset-0 overflow-y-auto p-8 prose prose-invert max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-cyan-400 prose-img:rounded-xl prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10">
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
                                        }
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
                                className="w-full h-full p-6 bg-transparent resize-none focus:outline-none font-mono text-sm leading-relaxed text-slate-300 placeholder:text-slate-600"
                                placeholder="# Begin transmission..."
                            />
                        )}
                    </div>
                </div>

                {/* Action Footer */}
                <div className="sticky bottom-8 bg-slate-900/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl flex justify-between items-center z-50">
                    <div className="text-xs font-mono text-slate-500 px-4">
                        SYSTEM_STATUS: {submitting ? 'WRITING...' : 'READY'}
                    </div>
                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="px-6 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-sm font-bold uppercase tracking-wide"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-8 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] disabled:opacity-50 disabled:cursor-not-allowed text-sm tracking-wide flex items-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    SAVING_CHANGES...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    COMMIT_UPDATE
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
