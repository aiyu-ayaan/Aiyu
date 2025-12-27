"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const SocialForm = ({ initialData, isEdit = false }) => {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
        url: '',
        iconName: '',
        isHidden: false,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
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

        try {
            const url = isEdit ? `/api/socials/${initialData._id}` : '/api/socials';
            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                router.push('/admin/footer');
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
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto bg-slate-900/50 p-8 rounded-xl border border-white/10 backdrop-blur-xl">
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-3 rounded font-mono text-sm">
                    {error}
                </div>
            )}

            <div>
                <label className="block text-xs font-mono uppercase tracking-wider mb-2 text-slate-400">Name</label>
                <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full p-3 rounded-lg bg-slate-950/50 border border-white/10 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none text-white transition-all placeholder:text-slate-600"
                    required
                />
            </div>

            <div>
                <label className="block text-xs font-mono uppercase tracking-wider mb-2 text-slate-400">URL</label>
                <input
                    type="url"
                    name="url"
                    value={formData.url}
                    onChange={handleChange}
                    className="w-full p-3 rounded-lg bg-slate-950/50 border border-white/10 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none text-white transition-all placeholder:text-slate-600"
                    required
                />
            </div>

            <div>
                <label className="block text-xs font-mono uppercase tracking-wider mb-2 text-slate-400">Icon Name (e.g., FaGithub)</label>
                <input
                    type="text"
                    name="iconName"
                    value={formData.iconName}
                    onChange={handleChange}
                    className="w-full p-3 rounded-lg bg-slate-950/50 border border-white/10 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none text-white transition-all placeholder:text-slate-600"
                    required
                />
                <p className="text-[10px] text-slate-500 mt-1 font-mono">Must match an icon exported in src/lib/icons.js</p>
            </div>

            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
                <input
                    type="checkbox"
                    id="isHidden"
                    name="isHidden"
                    checked={formData.isHidden || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, isHidden: e.target.checked }))}
                    className="w-5 h-5 rounded border-white/10 bg-slate-950/50 text-cyan-600 focus:ring-cyan-500 focus:ring-offset-0 focus:ring-offset-transparent cursor-pointer accent-cyan-500"
                />
                <label htmlFor="isHidden" className="text-sm font-medium text-slate-300 cursor-pointer">
                    Hide this social link
                </label>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t border-white/5">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-6 py-2 rounded bg-white/5 hover:bg-white/10 text-slate-400 transition-colors text-sm font-medium"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all shadow-[0_0_15px_rgba(8,145,178,0.3)] hover:shadow-[0_0_25px_rgba(8,145,178,0.5)] disabled:opacity-50 text-sm tracking-wide"
                >
                    {loading ? 'Saving...' : isEdit ? 'Update Social' : 'Create Social'}
                </button>
            </div>
        </form>
    );
};

export default SocialForm;
