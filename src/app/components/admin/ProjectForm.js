"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, Terminal, Code, Layers, Calendar, Link as LinkIcon, Image as ImageIcon, FileText, CheckCircle, Activity } from 'lucide-react';

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
        image: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                techStack: initialData.techStack.join(', '),
            });
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
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
                router.push('/admin/projects');
                router.refresh();
            } else {
                const data = await response.json();
                setError(data.error || 'Something went wrong');
            }
        } catch (err) {
            setError('An error occurred');
        } finally {
            setLoading(false);
        }
    };

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
                    <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                        <h2 className="text-sm font-mono text-cyan-400 uppercase tracking-widest mb-8 flex items-center gap-4 relative z-10">
                            Project Identity
                            <div className="h-px bg-cyan-500/20 flex-grow" />
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                            <div>
                                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Project Designation</label>
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
                            <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Description Payload</label>
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
                    <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                        <h2 className="text-sm font-mono text-purple-400 uppercase tracking-widest mb-8 flex items-center gap-4 relative z-10">
                            Technical Specifications
                            <div className="h-px bg-purple-500/20 flex-grow" />
                        </h2>

                        <div className="space-y-6 relative z-10">
                            <div>
                                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Tech Stack (Comma Separated)</label>
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
                            </select>
                        </div>
                        <div className={`mt-4 flex items-center gap-2 text-xs font-mono uppercase tracking-wide justify-center p-2 rounded border ${formData.status === 'Done' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                            <div className={`w-2 h-2 rounded-full ${formData.status === 'Done' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                            {formData.status === 'Done' ? 'System Stable' : 'Work In Progress'}
                        </div>
                    </div>

                    {/* Image Module */}
                    <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-6 relative overflow-hidden group">
                        <h2 className="text-sm font-mono text-slate-400 uppercase tracking-widest mb-6">Visual Asset</h2>
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
                                <img src={formData.image} alt="Preview" className="w-full h-full object-cover transition-transform group-hover/preview:scale-105" />
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

            {/* Action Footer */}
            <div className="sticky bottom-8 bg-slate-900/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl flex justify-between items-center z-50">
                <div className="text-xs font-mono text-slate-400 px-4 flex items-center gap-2">
                    <Activity size={14} className={loading ? 'animate-spin' : ''} />
                    SYSTEM_STATUS: {loading ? 'PROCESSING...' : 'READY'}
                </div>
                <div className="flex gap-4">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-6 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-sm font-bold uppercase tracking-wide border border-transparent hover:border-white/10"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-8 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all shadow-[0_0_20px_rgba(8,145,178,0.3)] hover:shadow-[0_0_30px_rgba(8,145,178,0.5)] disabled:opacity-50 disabled:cursor-not-allowed text-sm tracking-wide flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                PROCESSING...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                {isEdit ? 'UPDATE_PROJECT_DATA' : 'INITIALIZE_PROJECT'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </form>
    );
};

export default ProjectForm;
