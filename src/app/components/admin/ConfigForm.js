"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const ConfigForm = () => {
    const router = useRouter();
    const [formData, setFormData] = useState({
        n8nWebhookUrl: '',
        googleAnalyticsId: '',
        logoText: '< aiyu />',
        siteTitle: '',
        favicon: {
            value: '',
            filename: '',
            mimeType: ''
        },
        resume: {
            type: 'url',
            value: '',
            filename: '',
        },
        projectsTitle: '',
        projectsSubtitle: '',
        blogsTitle: '',
        blogsSubtitle: '',
        galleryTitle: '',
        galleryTitle: '',
        gallerySubtitle: '',
        footerVersion: '',
        footerVersionLink: '',

    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await fetch('/api/config');
            if (res.ok) {
                const data = await res.json();
                if (data) {
                    setFormData({
                        n8nWebhookUrl: data.n8nWebhookUrl || '',
                        googleAnalyticsId: data.googleAnalyticsId || '',
                        logoText: data.logoText || '< aiyu />',
                        siteTitle: data.siteTitle || '',
                        favicon: {
                            value: data.favicon?.value || '',
                            filename: data.favicon?.filename || '',
                            mimeType: data.favicon?.mimeType || ''
                        },
                        resume: {
                            type: data.resume?.type || 'url',
                            value: data.resume?.value || '',
                            filename: data.resume?.filename || '',
                        },
                        projectsTitle: data.projectsTitle || 'Projects Portfolio',
                        projectsSubtitle: data.projectsSubtitle || 'A collection of my work',
                        blogsTitle: data.blogsTitle || 'Latest Insights',
                        blogsSubtitle: data.blogsSubtitle || 'Thoughts, tutorials, and updates on web development and technology.',
                        galleryTitle: data.galleryTitle || 'Gallery',
                        galleryTitle: data.galleryTitle || 'Gallery',
                        gallerySubtitle: data.gallerySubtitle || 'A visual journey through my lens.',
                        footerVersion: data.footerVersion || 'v1.0.0',
                        footerVersionLink: data.footerVersionLink || ''

                    });
                }
            }
        } catch (err) {
            console.error('Failed to fetch config', err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    // Resume Handlers
    const handleResumeTypeChange = (type) => {
        setFormData(prev => ({
            ...prev,
            resume: { ...prev.resume, type }
        }));
    };

    const handleResumeValueChange = (value) => {
        setFormData(prev => ({
            ...prev,
            resume: { ...prev.resume, value }
        }));
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                setError("File size too large. Max 5MB.");
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({
                    ...prev,
                    resume: {
                        ...prev.resume,
                        type: 'file',
                        value: reader.result, // Base64 string
                        filename: file.name
                    }
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleFaviconUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 1 * 1024 * 1024) { // 1MB limit for favicon
                setError("Favicon size too large. Max 1MB.");
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({
                    ...prev,
                    favicon: {
                        value: reader.result,
                        filename: file.name,
                        mimeType: file.type
                    }
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const response = await fetch('/api/config', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                router.push('/admin');
                router.refresh();
            } else {
                const data = await response.json();
                setError(data.error || 'Something went wrong');
            }
        } catch (err) {
            setError('An error occurred');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="text-cyan-400 font-mono animate-pulse">LOADING_SYSTEM_CONFIG...</div>;

    return (
        <form onSubmit={handleSubmit} className="space-y-12 max-w-4xl mx-auto">
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-center gap-3">
                    <span className="text-xl">⚠️</span>
                    {error}
                </div>
            )}

            {/* Branding Section */}
            <div className="bg-[#0a0a0a]/60 backdrop-blur-xl rounded-2xl border border-white/5 p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                <h2 className="text-sm font-mono text-cyan-500/70 uppercase tracking-widest mb-8 flex items-center gap-4">
                    Identity Matrix
                    <div className="h-px bg-cyan-500/10 flex-grow" />
                </h2>

                <div className="space-y-6 relative z-10">
                    <div>
                        <label className="block text-slate-400 mb-2 text-xs font-mono uppercase tracking-wider">Logo Identifier</label>
                        <input
                            type="text"
                            name="logoText"
                            value={formData.logoText}
                            onChange={handleChange}
                            placeholder="< aiyu />"
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-cyan-400 font-mono focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all placeholder:text-slate-700"
                        />
                        <p className="text-xs text-slate-500 mt-2 font-mono">
                            {'// Displayed in the top-left of the navigation header.'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Footer Configuration */}
            <div className="bg-[#0a0a0a]/60 backdrop-blur-xl rounded-2xl border border-white/5 p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                <h2 className="text-sm font-mono text-purple-500/70 uppercase tracking-widest mb-8 flex items-center gap-4">
                    Footer Metrics
                    <div className="h-px bg-purple-500/10 flex-grow" />
                </h2>
                <div className="space-y-4 relative z-10">
                    <div>
                        <label className="block text-slate-400 mb-2 text-xs font-mono uppercase tracking-wider">System Version Tag</label>
                        <input
                            type="text"
                            name="footerVersion"
                            value={formData.footerVersion}
                            onChange={handleChange}
                            placeholder="v1.0.0"
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all placeholder:text-slate-700 font-mono"
                        />
                        <p className="text-xs text-slate-500 mt-2 font-mono">
                            {'// Shown in the footer. Use this to track updates.'}
                        </p>
                    </div>
                    <div>
                        <label className="block text-slate-400 mb-2 text-xs font-mono uppercase tracking-wider">System Version Link</label>
                        <input
                            type="url"
                            name="footerVersionLink"
                            value={formData.footerVersionLink}
                            onChange={handleChange}
                            placeholder="https://github.com/..."
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all placeholder:text-slate-700 font-mono"
                        />
                        <p className="text-xs text-slate-500 mt-2 font-mono">
                            {'// Optional URL to make the version tag clickable.'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Browser & SEO Section */}
            <div className="bg-[#0a0a0a]/60 backdrop-blur-xl rounded-2xl border border-white/5 p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                <h2 className="text-sm font-mono text-green-500/70 uppercase tracking-widest mb-8 flex items-center gap-4">
                    SEO & Metadata
                    <div className="h-px bg-green-500/10 flex-grow" />
                </h2>

                <div className="space-y-6 relative z-10">
                    <div>
                        <label className="block text-slate-400 mb-2 text-xs font-mono uppercase tracking-wider">Site Title</label>
                        <input
                            type="text"
                            name="siteTitle"
                            value={formData.siteTitle}
                            onChange={handleChange}
                            placeholder="Ayaan's Portfolio"
                            className="w-full bg-slate-950/50 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 outline-none transition-all placeholder:text-slate-600"
                        />
                        <p className="text-xs text-slate-500 mt-2 font-mono">
                            {'// The title shown in the browser tab.'}
                        </p>
                    </div>
                    <div>
                        <label className="block text-slate-400 mb-2 text-xs font-mono uppercase tracking-wider">Favicon Source</label>
                        <div className="flex items-center gap-4">
                            <label className="cursor-pointer bg-slate-950/50 border border-white/10 hover:border-green-500/50 text-slate-300 px-4 py-3 rounded-lg transition-all flex items-center gap-3 w-full">
                                <span className="bg-green-500/10 text-green-400 px-2 py-1 rounded text-xs font-bold uppercase">Upload</span>
                                <span className="text-sm truncate opacity-60 hover:opacity-100 transition-opacity">
                                    {formData.favicon.filename || "Select .ico, .png, .svg..."}
                                </span>
                                <input
                                    type="file"
                                    accept=".ico,.png,.jpg,.svg"
                                    onChange={handleFaviconUpload}
                                    className="hidden"
                                />
                            </label>
                            {formData.favicon.value && (
                                <div className="h-12 w-12 rounded-lg bg-slate-950/50 border border-white/10 flex items-center justify-center p-2 shrink-0">
                                    <img src={formData.favicon.value} alt="Favicon Preview" className="w-full h-full object-contain" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Page Headers Section */}
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                <h2 className="text-sm font-mono text-orange-500/70 uppercase tracking-widest mb-8 flex items-center gap-4">
                    Route Headers
                    <div className="h-px bg-orange-500/10 flex-grow" />
                </h2>

                <div className="space-y-6 relative z-10">
                    {/* Projects Header */}
                    <div className="p-6 rounded-xl bg-white/[0.02] border border-white/10 hover:border-orange-500/20 transition-colors">
                        <h3 className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <span className="w-1 h-4 bg-orange-500 rounded-full" /> /projects
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-slate-500 mb-2 text-[10px] font-mono uppercase tracking-wider">Title</label>
                                <input
                                    type="text"
                                    name="projectsTitle"
                                    value={formData.projectsTitle}
                                    onChange={handleChange}
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 outline-none transition-all placeholder:text-slate-600/50"
                                />
                            </div>
                            <div>
                                <label className="block text-slate-500 mb-2 text-[10px] font-mono uppercase tracking-wider">Subtitle</label>
                                <input
                                    type="text"
                                    name="projectsSubtitle"
                                    value={formData.projectsSubtitle}
                                    onChange={handleChange}
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 outline-none transition-all placeholder:text-slate-600/50"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Blogs Header */}
                    <div className="p-6 rounded-xl bg-white/[0.02] border border-white/10 hover:border-orange-500/20 transition-colors">
                        <h3 className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <span className="w-1 h-4 bg-orange-500 rounded-full" /> /blogs
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-slate-500 mb-2 text-[10px] font-mono uppercase tracking-wider">Title</label>
                                <input
                                    type="text"
                                    name="blogsTitle"
                                    value={formData.blogsTitle}
                                    onChange={handleChange}
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 outline-none transition-all placeholder:text-slate-600/50"
                                />
                            </div>
                            <div>
                                <label className="block text-slate-500 mb-2 text-[10px] font-mono uppercase tracking-wider">Subtitle</label>
                                <textarea
                                    name="blogsSubtitle"
                                    value={formData.blogsSubtitle}
                                    onChange={handleChange}
                                    rows="1"
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 outline-none transition-all placeholder:text-slate-600/50 resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Gallery Header */}
                    <div className="p-6 rounded-xl bg-white/[0.02] border border-white/10 hover:border-orange-500/20 transition-colors">
                        <h3 className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <span className="w-1 h-4 bg-orange-500 rounded-full" /> /gallery
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-slate-500 mb-2 text-[10px] font-mono uppercase tracking-wider">Title</label>
                                <input
                                    type="text"
                                    name="galleryTitle"
                                    value={formData.galleryTitle}
                                    onChange={handleChange}
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 outline-none transition-all placeholder:text-slate-600/50"
                                />
                            </div>
                            <div>
                                <label className="block text-slate-500 mb-2 text-[10px] font-mono uppercase tracking-wider">Subtitle</label>
                                <input
                                    type="text"
                                    name="gallerySubtitle"
                                    value={formData.gallerySubtitle}
                                    onChange={handleChange}
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 outline-none transition-all placeholder:text-slate-600/50"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Integrations Section */}
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                <h2 className="text-sm font-mono text-yellow-500/70 uppercase tracking-widest mb-8 flex items-center gap-4">
                    External Integrations
                    <div className="h-px bg-yellow-500/10 flex-grow" />
                </h2>

                <div className="space-y-6 relative z-10">
                    <div>
                        <label className="block text-slate-400 mb-2 text-xs font-mono uppercase tracking-wider">N8n Webhook Endpoint</label>
                        <input
                            type="url"
                            name="n8nWebhookUrl"
                            value={formData.n8nWebhookUrl}
                            onChange={handleChange}
                            placeholder="https://your-n8n-instance.com/webhook/..."
                            className="w-full bg-slate-950/50 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 outline-none transition-all placeholder:text-slate-600"
                        />
                        <p className="text-xs text-slate-500 mt-2 font-mono">
                            {'// Used for the AI Assistant chat widget.'}
                        </p>
                    </div>
                    <div>
                        <label className="block text-slate-400 mb-2 text-xs font-mono uppercase tracking-wider">Google Analytics Measurement ID</label>
                        <input
                            type="text"
                            name="googleAnalyticsId"
                            value={formData.googleAnalyticsId}
                            onChange={handleChange}
                            placeholder="G-XXXXXXXXXX"
                            className="w-full bg-slate-950/50 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 outline-none transition-all placeholder:text-slate-600"
                        />
                        <p className="text-xs text-slate-500 mt-2 font-mono">
                            {'// Starts with G-'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Resume Section */}
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                <h2 className="text-sm font-mono text-blue-500/70 uppercase tracking-widest mb-8 flex items-center gap-4">
                    Resume / CV
                    <div className="h-px bg-blue-500/10 flex-grow" />
                </h2>

                <div className="flex gap-6 mb-8">
                    <label className={`flex items-center gap-3 cursor-pointer p-4 rounded-xl border transition-all w-full
                        ${formData.resume.type === 'url' ? 'bg-blue-500/10 border-blue-500/40 text-blue-300' : 'bg-slate-950/50 border-white/10 text-slate-400'}
                    `}>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center
                             ${formData.resume.type === 'url' ? 'border-blue-400' : 'border-slate-600'}
                        `}>
                            {formData.resume.type === 'url' && <div className="w-2 h-2 rounded-full bg-blue-400" />}
                        </div>
                        <input
                            type="radio"
                            name="resumeType"
                            checked={formData.resume.type === 'url'}
                            onChange={() => handleResumeTypeChange('url')}
                            className="hidden"
                        />
                        <span className="font-mono text-xs uppercase tracking-wider font-bold">External URL Link</span>
                    </label>

                    <label className={`flex items-center gap-3 cursor-pointer p-4 rounded-xl border transition-all w-full
                        ${formData.resume.type === 'file' ? 'bg-blue-500/10 border-blue-500/40 text-blue-300' : 'bg-black/40 border-white/10 text-slate-400'}
                    `}>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center
                             ${formData.resume.type === 'file' ? 'border-blue-400' : 'border-slate-600'}
                        `}>
                            {formData.resume.type === 'file' && <div className="w-2 h-2 rounded-full bg-blue-400" />}
                        </div>
                        <input
                            type="radio"
                            name="resumeType"
                            checked={formData.resume.type === 'file'}
                            onChange={() => handleResumeTypeChange('file')}
                            className="hidden"
                        />
                        <span className="font-mono text-xs uppercase tracking-wider font-bold">Direct File Upload</span>
                    </label>
                </div>

                {formData.resume.type === 'url' ? (
                    <div>
                        <label className="block text-slate-400 mb-2 text-xs font-mono uppercase tracking-wider">Resume URL Asset</label>
                        <input
                            type="url"
                            value={formData.resume.value}
                            onChange={(e) => handleResumeValueChange(e.target.value)}
                            placeholder="https://example.com/my-resume.pdf"
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all placeholder:text-slate-700 font-mono"
                        />
                    </div>
                ) : (
                    <div>
                        <label className="block text-slate-400 mb-2 text-xs font-mono uppercase tracking-wider">Upload PDF Asset</label>
                        <div className="flex items-center gap-4">
                            <label className="cursor-pointer bg-black/40 border border-white/10 hover:border-blue-500/50 text-slate-300 px-4 py-3 rounded-lg transition-all flex items-center gap-3 w-full">
                                <span className="bg-blue-500/10 text-blue-400 px-2 py-1 rounded text-xs font-bold uppercase">Choose File</span>
                                <span className="text-sm truncate opacity-60 hover:opacity-100 transition-opacity">
                                    {formData.resume.filename || "Select PDF document..."}
                                </span>
                                <input
                                    type="file"
                                    accept=".pdf,.doc,.docx"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                            </label>
                            {formData.resume.value && formData.resume.type === 'file' && formData.resume.value.startsWith('data:') && (
                                <a href={formData.resume.value} download={formData.resume.filename || 'resume.pdf'} className="flex items-center gap-2 px-4 py-2 bg-[#0a0a0a] border border-white/10 rounded-lg text-xs text-blue-400 hover:text-blue-300 hover:border-blue-500/30 transition-all uppercase tracking-wider font-bold whitespace-nowrap">
                                    Download Existing
                                </a>
                            )}
                        </div>
                        {formData.resume.filename && (
                            <div className="mt-3 text-xs text-blue-400 flex items-center gap-1 font-mono">
                                <span>[SECURE] Asset ready for upload:</span>
                                <span>{formData.resume.filename}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="sticky bottom-8 flex justify-end gap-4 pt-6 border-t border-white/5 bg-[#030014]/80 backdrop-blur-lg p-4 rounded-xl border border-white/5 shadow-2xl z-50">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-6 py-2 rounded bg-white/5 hover:bg-white/10 text-slate-400 transition-colors text-sm font-medium"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={saving}
                    className="px-8 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] disabled:opacity-50 disabled:cursor-not-allowed text-sm tracking-wide"
                >
                    {saving ? 'SAVING...' : 'INITIATE_UPDATE'}
                </button>
            </div>
        </form >
    );
};

export default ConfigForm;
