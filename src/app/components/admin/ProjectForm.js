"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, Terminal, Code, Layers, Calendar, Link as LinkIcon, Image as ImageIcon, FileText, CheckCircle, Activity, Sparkles, Wand2, Upload, X } from 'lucide-react';
import Toast from './Toast';
import BlogLinkInput from './BlogLinkInput';

const getStatusState = (status) => {
    const safeStatus = String(status || '').trim().toLowerCase();

    if (safeStatus === 'done' || safeStatus === 'completed') {
        return {
            panelClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            dotClass: 'bg-emerald-500',
            message: 'System Stable',
        };
    }

    if (safeStatus === 'deferred' || safeStatus === 'deffered' || safeStatus === 'on hold') {
        return {
            panelClass: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
            dotClass: 'bg-slate-400',
            message: 'Deferred / On Hold',
        };
    }

    return {
        panelClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        dotClass: 'bg-amber-500 animate-pulse',
        message: 'Work In Progress',
    };
};

const ProjectForm = ({ initialData, isEdit = false }) => {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
        techStack: '',
        year: '',
        status: 'Done',
        projectType: '',
        description: '',
        codeLink: '',
        blogLink: '',
        image: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [notification, setNotification] = useState(null);
    const [aiEnabled, setAiEnabled] = useState(false);
    const [aiGenerating, setAiGenerating] = useState(null); // 'name', 'description', 'tech'
    const [uploadingFile, setUploadingFile] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                techStack: initialData.techStack.join(', '),
            });
        }
        checkAiConfig();
    }, [initialData]);

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

    const handleAiAction = async (mode) => {
        if (aiGenerating) return;
        setAiGenerating(mode);

        try {
            let apiMode = 'proofread';
            let prompt = '';
            let context = {};

            if (mode === 'name') {
                apiMode = 'suggest_project_name';
                prompt = formData.description;
                context = { techStack: formData.techStack };
            } else if (mode === 'description') {
                apiMode = 'refine_project_description';
                prompt = formData.description;
            } else if (mode === 'tech') {
                apiMode = 'suggest_tech_stack';
                prompt = formData.description;
            }

            const res = await fetch('/api/admin/ai/text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: apiMode,
                    prompt,
                    context
                })
            });

            const data = await res.json();

            if (data.success) {
                if (mode === 'name') {
                    // Suggest project names (pick the first one as a simple implementation or allow user pick?)
                    // For now, let's just use the first suggested name
                    const names = data.data.split(',').map(n => n.trim());
                    setFormData(prev => ({ ...prev, name: names[0] }));
                    showNotification(true, 'Creative designation synthesized!');
                } else if (mode === 'description') {
                    setFormData(prev => ({ ...prev, description: data.data }));
                    showNotification(true, 'Description payload optimized!');
                } else if (mode === 'tech') {
                    setFormData(prev => ({ ...prev, techStack: data.data }));
                    showNotification(true, 'Technical specs suggested!');
                }
            } else {
                showNotification(false, data.error || 'AI synthesis failed');
            }
        } catch (error) {
            console.error('AI Error:', error);
            showNotification(false, 'AI uplink interrupted');
        } finally {
            setAiGenerating(null);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadingFile(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (data.success) {
                setFormData(prev => ({ ...prev, image: data.url }));
                showNotification(true, 'Visual Asset Synchronized!');
            } else {
                showNotification(false, data.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Upload error:', error);
            showNotification(false, 'High-frequency uplink failure');
        } finally {
            setUploadingFile(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const showNotification = (success, message) => {
        setNotification({ success, message });
        setTimeout(() => setNotification(null), 3000);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const payload = {
            ...formData,
            techStack: formData.techStack.split(',').map((item) => item.trim()),
        };

        try {
            const url = isEdit ? `/api/projects/${initialData._id}` : '/api/projects';
            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                showNotification(true, isEdit ? 'Project Updated Successfully' : 'Project Created Successfully');
                setTimeout(() => {
                    router.push('/admin/projects');
                    router.refresh();
                }, 1500);
            } else {
                const data = await response.json();
                setError(data.error || 'Something went wrong');
                showNotification(false, data.error || 'Failed to save');
            }
        } catch (err) {
            setError('An error occurred');
            showNotification(false, 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const statusState = getStatusState(formData.status);

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3 font-mono text-sm">
                    <Activity className="w-4 h-4" />
                    ERROR: {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Info Column */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Identity Module */}
                    <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-4 md:p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                        <h2 className="text-sm font-mono text-cyan-400 uppercase tracking-widest mb-8 flex items-center gap-4 relative z-10">
                            Project Identity
                            <div className="h-px bg-cyan-500/20 grow" />
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-400">Project Designation</label>
                                    {aiEnabled && (
                                        <button
                                            type="button"
                                            onClick={() => handleAiAction('name')}
                                            disabled={aiGenerating === 'name' || !formData.description}
                                            className="flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg border border-cyan-500/20 transition-all text-[10px] font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed group/ai"
                                            title="Suggest cool project names from description"
                                        >
                                            {aiGenerating === 'name' ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                                <Sparkles className="w-3 h-3 group-hover/ai:rotate-12 transition-transform" />
                                            )}
                                            AI Name
                                        </button>
                                    )}
                                </div>
                                <div className="relative group/input">
                                    <Terminal className="absolute left-4 top-3.5 text-slate-400 group-focus-within/input:text-cyan-400 transition-colors" size={18} />
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-slate-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all placeholder:text-slate-600 font-bold"
                                        required
                                        placeholder="NEON_PROJECT_01"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Timeline / Year</label>
                                <div className="relative group/input">
                                    <Calendar className="absolute left-4 top-3.5 text-slate-400 group-focus-within/input:text-cyan-400 transition-colors" size={18} />
                                    <input
                                        type="text"
                                        name="year"
                                        value={formData.year}
                                        onChange={handleChange}
                                        className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-slate-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all placeholder:text-slate-600 font-mono"
                                        required
                                        placeholder="2024"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 relative z-10">
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400">Description Payload</label>
                                {aiEnabled && (
                                    <button
                                        type="button"
                                        onClick={() => handleAiAction('description')}
                                        disabled={aiGenerating === 'description' || !formData.description}
                                        className="flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg border border-cyan-500/20 transition-all text-[10px] font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed group/ai"
                                    >
                                        {aiGenerating === 'description' ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                            <Wand2 className="w-3 h-3 group-hover/ai:translate-x-0.5 transition-transform" />
                                        )}
                                        Refine Description
                                    </button>
                                )}
                            </div>
                            <div className="relative group/input">
                                <FileText className="absolute left-4 top-3.5 text-slate-400 group-focus-within/input:text-cyan-400 transition-colors" size={18} />
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows="4"
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-slate-300 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all placeholder:text-slate-600 leading-relaxed text-sm resize-none"
                                    required
                                    placeholder="Brief project abstract..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Technical Specs Module */}
                    <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-4 md:p-8 relative group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                        <h2 className="text-sm font-mono text-purple-400 uppercase tracking-widest mb-8 flex items-center gap-4 relative z-10">
                            Technical Specifications
                            <div className="h-px bg-purple-500/20 grow" />
                        </h2>

                        <div className="space-y-6 relative z-10">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-400">Tech Stack (Comma Separated)</label>
                                    {aiEnabled && (
                                        <button
                                            type="button"
                                            onClick={() => handleAiAction('tech')}
                                            disabled={aiGenerating === 'tech' || !formData.description}
                                            className="flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-lg border border-purple-500/20 transition-all text-[10px] font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed group/ai"
                                        >
                                            {aiGenerating === 'tech' ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                                <Sparkles className="w-3 h-3 group-hover/ai:rotate-12 transition-transform" />
                                            )}
                                            AI Suggest
                                        </button>
                                    )}
                                </div>
                                <div className="relative group/input">
                                    <Code className="absolute left-4 top-3.5 text-slate-400 group-focus-within/input:text-purple-400 transition-colors" size={18} />
                                    <input
                                        type="text"
                                        name="techStack"
                                        value={formData.techStack}
                                        onChange={handleChange}
                                        className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-slate-200 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all placeholder:text-slate-600 font-mono"
                                        placeholder="React, Next.js, Tailwind, MongoDB"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Project Category</label>
                                    <div className="relative group/input">
                                        <Layers className="absolute left-4 top-3.5 text-slate-400 group-focus-within/input:text-purple-400 transition-colors" size={18} />
                                        <input
                                            type="text"
                                            name="projectType"
                                            value={formData.projectType}
                                            onChange={handleChange}
                                            className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-slate-200 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all placeholder:text-slate-600"
                                            required
                                            placeholder="Web App / Mobile App"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Repo / Live Link</label>
                                    <div className="relative group/input">
                                        <LinkIcon className="absolute left-4 top-3.5 text-slate-400 group-focus-within/input:text-purple-400 transition-colors" size={18} />
                                        <input
                                            type="url"
                                            name="codeLink"
                                            value={formData.codeLink}
                                            onChange={handleChange}
                                            className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-slate-200 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all placeholder:text-slate-600 font-mono"
                                            placeholder="https://github.com/..."
                                        />
                                    </div>
                                </div>
                            </div>
                            <BlogLinkInput value={formData.blogLink} onChange={handleChange} />
                        </div>
                    </div>
                </div>

                {/* Sidebar Column */}
                <div className="space-y-8">
                    {/* Status Module */}
                    <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />
                        <h2 className="text-sm font-mono text-emerald-400 uppercase tracking-widest mb-6 relative z-10">Development Status</h2>
                        <div className="relative z-10 bg-slate-950/50 p-2 rounded-xl border border-white/10">
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="w-full bg-transparent border-none text-slate-200 outline-none p-2 font-mono"
                            >
                                <option value="Done" className="bg-slate-900 text-slate-200">Done (Completed)</option>
                                <option value="In Progress" className="bg-slate-900 text-slate-200">In Progress (Active)</option>
                                <option value="Deferred" className="bg-slate-900 text-slate-200">Deferred (On Hold)</option>
                            </select>
                        </div>
                        <div className={`mt-4 flex items-center gap-2 text-xs font-mono uppercase tracking-wide justify-center p-2 rounded border ${statusState.panelClass}`}>
                            <div className={`w-2 h-2 rounded-full ${statusState.dotClass}`} />
                            {statusState.message}
                        </div>
                    </div>

                    {/* Image Module */}
                    <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-6 relative overflow-hidden group">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-sm font-mono text-slate-400 uppercase tracking-widest">Visual Asset</h2>
                            <label className={`cursor-pointer group/upload transition-all ${uploadingFile ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    disabled={uploadingFile}
                                />
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg border border-cyan-500/20 transition-all text-[10px] font-bold uppercase tracking-wider">
                                    {uploadingFile ? (
                                        <Loader2 size={12} className="animate-spin" />
                                    ) : (
                                        <Upload size={12} className="group-hover/upload:scale-110 transition-transform" />
                                    )}
                                    {uploadingFile ? 'Uploading...' : 'Upload Asset'}
                                </div>
                            </label>
                        </div>
                        <div className="relative group/input mb-4">
                            <ImageIcon className="absolute left-4 top-3.5 text-slate-400 group-focus-within/input:text-white transition-colors" size={18} />
                            <input
                                type="text"
                                name="image"
                                value={formData.image}
                                onChange={handleChange}
                                className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-slate-200 focus:border-white/30 focus:ring-1 focus:ring-white/10 outline-none transition-all placeholder:text-slate-600 font-mono text-xs"
                                placeholder="IMAGE_URL"
                            />
                        </div>
                        <div className="aspect-video w-full rounded-lg bg-slate-950/50 border border-white/10 flex items-center justify-center overflow-hidden relative group/preview">
                            {formData.image ? (
                                <img src={formData.image} alt="Preview" className="w-full h-full object-cover transition-transform group-hover/preview:scale-105" loading="lazy" decoding="async" />
                            ) : (
                                <div className="text-slate-600 flex flex-col items-center gap-2">
                                    <ImageIcon size={24} />
                                    <span className="text-[10px] font-mono uppercase">No Asset Signal</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="sticky bottom-8 flex justify-end gap-4 pt-6 border border-white/5 bg-slate-900/90 backdrop-blur-lg p-4 rounded-xl shadow-2xl z-50 mt-12">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-6 py-2 rounded bg-white/5 hover:bg-white/10 text-slate-400 transition-colors text-sm font-medium"
                >
                    CANCEL
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="px-8 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all shadow-[0_0_20px_rgba(8,145,178,0.3)] hover:shadow-[0_0_30px_rgba(8,145,178,0.5)] disabled:opacity-50 disabled:cursor-not-allowed text-sm tracking-wide uppercase flex items-center gap-2"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            UPDATING_SYSTEM...
                        </>
                    ) : (
                        isEdit ? 'CONFIRM_UPDATE' : 'INITIALIZE_PROJECT'
                    )}
                </button>
            </div>

            {/* Toast Notification */}
            <Toast notification={notification} />
        </form>
    );
};

export default ProjectForm;
