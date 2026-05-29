"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Activity,
    Globe,
    Image as ImageIcon,
    Layers,
    Loader2,
    Save,
    Server,
    ShieldCheck,
    Sparkles,
    Upload,
    Wand2,
    Workflow,
    Wrench,
} from 'lucide-react';
import Toast from './Toast';
import BlogLinkInput from './BlogLinkInput';

const getStatusState = (status) => {
    const safeStatus = String(status || '').trim().toLowerCase();

    if (safeStatus === 'live') {
        return {
            panelClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            dotClass: 'bg-emerald-500',
            message: 'Serving Traffic',
        };
    }

    if (safeStatus === 'maintenance') {
        return {
            panelClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            dotClass: 'bg-amber-500',
            message: 'Maintenance Window',
        };
    }

    if (safeStatus === 'private') {
        return {
            panelClass: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
            dotClass: 'bg-purple-500',
            message: 'Internal Access Only',
        };
    }

    return {
        panelClass: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
        dotClass: 'bg-slate-400',
        message: 'Archived / Retired',
    };
};

export default function DeploymentForm({ initialData, isEdit = false }) {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
        appType: '',
        environment: 'Production',
        status: 'Live',
        hostingProvider: '',
        description: '',
        hostedUrl: '',
        blogLink: '',
        techStack: '',
        image: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [notification, setNotification] = useState(null);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [aiEnabled, setAiEnabled] = useState(false);
    const [aiGenerating, setAiGenerating] = useState(null);

    useEffect(() => {
        if (!initialData) return;

        setFormData({
            ...initialData,
            techStack: Array.isArray(initialData.techStack) ? initialData.techStack.join(', ') : '',
        });
    }, [initialData]);

    useEffect(() => {
        checkAiConfig();
    }, []);

    const checkAiConfig = async () => {
        try {
            const response = await fetch('/api/admin/ai/config');
            const data = await response.json();
            if (data.success && data.data) {
                setAiEnabled(data.data.enabled);
            }
        } catch (configError) {
            console.error('Failed to fetch AI config:', configError);
        }
    };

    const showNotification = (success, message) => {
        setNotification({ success, message });
        setTimeout(() => setNotification(null), 3000);
    };

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((previous) => ({ ...previous, [name]: value }));
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setUploadingFile(true);
        const uploadData = new FormData();
        uploadData.append('file', file);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: uploadData,
            });
            const data = await response.json();

            if (data.success) {
                setFormData((previous) => ({ ...previous, image: data.url }));
                showNotification(true, 'App preview image uploaded.');
            } else {
                showNotification(false, data.error || 'Upload failed');
            }
        } catch (uploadError) {
            console.error('Upload error:', uploadError);
            showNotification(false, 'Upload failed');
        } finally {
            setUploadingFile(false);
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
                context = {
                    appType: formData.appType,
                    hostingProvider: formData.hostingProvider,
                    environment: formData.environment,
                    techStack: formData.techStack,
                };
            } else if (mode === 'description') {
                apiMode = 'refine_project_description';
                prompt = formData.description;
                context = {
                    name: formData.name,
                    appType: formData.appType,
                    hostingProvider: formData.hostingProvider,
                };
            } else if (mode === 'tech') {
                apiMode = 'suggest_tech_stack';
                prompt = `${formData.name}\n${formData.description}`;
                context = {
                    appType: formData.appType,
                    environment: formData.environment,
                    hostingProvider: formData.hostingProvider,
                };
            }

            const response = await fetch('/api/admin/ai/text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: apiMode,
                    prompt,
                    context,
                }),
            });

            const data = await response.json();

            if (data.success) {
                if (mode === 'name') {
                    const names = String(data.data || '')
                        .split(',')
                        .map((item) => item.trim())
                        .filter(Boolean);
                    if (names.length > 0) {
                        setFormData((previous) => ({ ...previous, name: names[0] }));
                    }
                    showNotification(true, 'AI suggested an app name.');
                } else if (mode === 'description') {
                    setFormData((previous) => ({ ...previous, description: data.data }));
                    showNotification(true, 'AI refined the app description.');
                } else if (mode === 'tech') {
                    setFormData((previous) => ({ ...previous, techStack: data.data }));
                    showNotification(true, 'AI suggested a tech stack.');
                }
            } else {
                showNotification(false, data.error || 'AI suggestion failed');
            }
        } catch (aiError) {
            console.error('AI Error:', aiError);
            showNotification(false, 'AI suggestion failed');
        } finally {
            setAiGenerating(null);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError('');

        const payload = {
            ...formData,
            techStack: formData.techStack
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean),
            hostedUrl: formData.hostedUrl.trim(),
            blogLink: formData.blogLink ? formData.blogLink.trim() : '',
            image: formData.image.trim(),
        };

        try {
            const url = isEdit ? `/api/deployments/${initialData._id}` : '/api/deployments';
            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                showNotification(true, isEdit ? 'App updated successfully.' : 'App created successfully.');
                setTimeout(() => {
                    router.push('/admin/apps');
                    router.refresh();
                }, 1200);
            } else {
                const data = await response.json();
                setError(data.error || 'Something went wrong');
                showNotification(false, data.error || 'Failed to save app');
            }
        } catch (submitError) {
            console.error('Save app error:', submitError);
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
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-4 md:p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />
                        <h2 className="text-sm font-mono text-cyan-400 uppercase tracking-widest mb-8 flex items-center gap-4 relative z-10">
                            App Identity
                            <div className="h-px bg-cyan-500/20 grow" />
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-400">App Name</label>
                                    {aiEnabled && (
                                        <button
                                            type="button"
                                            onClick={() => handleAiAction('name')}
                                            disabled={aiGenerating === 'name' || !formData.description}
                                            className="flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg border border-cyan-500/20 transition-all text-[10px] font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {aiGenerating === 'name' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                            AI Name
                                        </button>
                                    )}
                                </div>
                                <div className="relative group/input">
                                    <Server className="absolute left-4 top-3.5 text-slate-400 group-focus-within/input:text-cyan-400 transition-colors" size={18} />
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-slate-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all placeholder:text-slate-600 font-bold"
                                        placeholder="Payments API"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">App Type</label>
                                <div className="relative group/input">
                                    <Layers className="absolute left-4 top-3.5 text-slate-400 group-focus-within/input:text-cyan-400 transition-colors" size={18} />
                                    <input
                                        type="text"
                                        name="appType"
                                        value={formData.appType}
                                        onChange={handleChange}
                                        className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-slate-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all placeholder:text-slate-600"
                                        placeholder="API / Web App / Worker"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 relative z-10">
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400">Description</label>
                                {aiEnabled && (
                                    <button
                                        type="button"
                                        onClick={() => handleAiAction('description')}
                                        disabled={aiGenerating === 'description' || !formData.description}
                                        className="flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg border border-cyan-500/20 transition-all text-[10px] font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {aiGenerating === 'description' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                                        Refine
                                    </button>
                                )}
                            </div>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows="5"
                                className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 px-4 text-slate-300 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all placeholder:text-slate-600 leading-relaxed text-sm resize-none"
                                placeholder="Explain what this deployment does and why it exists."
                                required
                            />
                        </div>
                    </div>

                    <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-4 md:p-8 relative group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />
                        <h2 className="text-sm font-mono text-purple-400 uppercase tracking-widest mb-8 flex items-center gap-4 relative z-10">
                            App Runtime
                            <div className="h-px bg-purple-500/20 grow" />
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                            <div>
                                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Hosting Provider</label>
                                <div className="relative group/input">
                                    <Workflow className="absolute left-4 top-3.5 text-slate-400 group-focus-within/input:text-purple-400 transition-colors" size={18} />
                                    <input
                                        type="text"
                                        name="hostingProvider"
                                        value={formData.hostingProvider}
                                        onChange={handleChange}
                                        className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-slate-200 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all placeholder:text-slate-600"
                                        placeholder="Vercel / AWS / Azure"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Environment</label>
                                <div className="relative group/input">
                                    <ShieldCheck className="absolute left-4 top-3.5 text-slate-400 group-focus-within/input:text-purple-400 transition-colors" size={18} />
                                    <input
                                        type="text"
                                        name="environment"
                                        value={formData.environment}
                                        onChange={handleChange}
                                        className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-slate-200 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all placeholder:text-slate-600"
                                        placeholder="Production / Staging"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-400">Tech Stack</label>
                                    {aiEnabled && (
                                        <button
                                            type="button"
                                            onClick={() => handleAiAction('tech')}
                                            disabled={aiGenerating === 'tech' || !formData.description}
                                            className="flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-lg border border-purple-500/20 transition-all text-[10px] font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {aiGenerating === 'tech' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                            AI Stack
                                        </button>
                                    )}
                                </div>
                                <div className="relative group/input">
                                    <Wrench className="absolute left-4 top-3.5 text-slate-400 group-focus-within/input:text-purple-400 transition-colors" size={18} />
                                    <input
                                        type="text"
                                        name="techStack"
                                        value={formData.techStack}
                                        onChange={handleChange}
                                        className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-slate-200 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all placeholder:text-slate-600 font-mono"
                                        placeholder="Next.js, Node.js, MongoDB, PostgreSQL"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Hosted URL</label>
                                <div className="relative group/input">
                                    <Globe className="absolute left-4 top-3.5 text-slate-400 group-focus-within/input:text-purple-400 transition-colors" size={18} />
                                    <input
                                        type="url"
                                        name="hostedUrl"
                                        value={formData.hostedUrl}
                                        onChange={handleChange}
                                        className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-slate-200 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all placeholder:text-slate-600 font-mono"
                                        placeholder="https://app.example.com"
                                    />
                                </div>
                            </div>
                            
                            <BlogLinkInput value={formData.blogLink} onChange={handleChange} />
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />
                        <h2 className="text-sm font-mono text-emerald-400 uppercase tracking-widest mb-6 relative z-10">App Status</h2>
                        <div className="relative z-10 bg-slate-950/50 p-2 rounded-xl border border-white/10">
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="w-full bg-transparent border-none text-slate-200 outline-none p-2 font-mono"
                            >
                                <option value="Live" className="bg-slate-900 text-slate-200">Live</option>
                                <option value="Maintenance" className="bg-slate-900 text-slate-200">Maintenance</option>
                                <option value="Private" className="bg-slate-900 text-slate-200">Private</option>
                                <option value="Archived" className="bg-slate-900 text-slate-200">Archived</option>
                            </select>
                        </div>
                        <div className={`mt-4 flex items-center gap-2 text-xs font-mono uppercase tracking-wide justify-center p-2 rounded border ${statusState.panelClass}`}>
                            <div className={`w-2 h-2 rounded-full ${statusState.dotClass}`} />
                            {statusState.message}
                        </div>
                    </div>

                    <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-6 relative overflow-hidden group">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-sm font-mono text-slate-400 uppercase tracking-widest">Preview Image</h2>
                            <label className={`cursor-pointer group/upload transition-all ${uploadingFile ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    disabled={uploadingFile}
                                />
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg border border-cyan-500/20 transition-all text-[10px] font-bold uppercase tracking-wider">
                                    {uploadingFile ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} className="group-hover/upload:scale-110 transition-transform" />}
                                    {uploadingFile ? 'Uploading...' : 'Upload Image'}
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
                                    <span className="text-[10px] font-mono uppercase">No Preview Loaded</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

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
                            SAVING_DEPLOYMENT...
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            {isEdit ? 'UPDATE_APP' : 'CREATE_APP'}
                        </>
                    )}
                </button>
            </div>

            <Toast notification={notification} />
        </form>
    );
}
