"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const HomeForm = () => {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
        homeRoles: '',
        githubLink: '',
        codeSnippets: '',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await fetch('/api/home');
            if (res.ok) {
                const data = await res.json();
                if (data) {
                    setFormData({
                        ...data,
                        homeRoles: data.homeRoles ? data.homeRoles.join(', ') : '',
                        codeSnippets: data.codeSnippets ? data.codeSnippets.join('\n') : '',
                    });
                }
            }
        } catch (err) {
            console.error('Failed to fetch home data', err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        const payload = {
            ...formData,
            homeRoles: formData.homeRoles.split(',').map((item) => item.trim()),
            codeSnippets: formData.codeSnippets.split('\n').filter((item) => item.trim() !== ''),
        };

        try {
            const response = await fetch('/api/home', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
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

    if (loading) return <div className="text-white">Loading...</div>;

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto bg-gray-800 p-8 rounded-xl border border-gray-700">
            {error && (
                <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded">
                    {error}
                </div>
            )}

            <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Name</label>
                <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white"
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Roles (comma separated)</label>
                <input
                    type="text"
                    name="homeRoles"
                    value={formData.homeRoles}
                    onChange={handleChange}
                    className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white"
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">GitHub Link</label>
                <input
                    type="url"
                    name="githubLink"
                    value={formData.githubLink}
                    onChange={handleChange}
                    className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white"
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Code Snippets (one per line)</label>
                <textarea
                    name="codeSnippets"
                    value={formData.codeSnippets}
                    onChange={handleChange}
                    rows="5"
                    className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white font-mono"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-gray-700">
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Resume Status</label>
                    <input
                        type="text"
                        name="resumeStatus"
                        value={formData.resumeStatus || 'ONLINE'}
                        onChange={handleChange}
                        className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white font-mono"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Resume Mode</label>
                    <input
                        type="text"
                        name="resumeMode"
                        value={formData.resumeMode || 'DEV_01'}
                        onChange={handleChange}
                        className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white font-mono"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Center Icon</label>
                    <select
                        name="resumeIcon"
                        value={formData.resumeIcon || 'FaBolt'}
                        onChange={handleChange}
                        className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white"
                    >
                        <option value="FaBolt">⚡ Bolt</option>
                        <option value="FaCode">💻 Code</option>
                        <option value="FaTerminal">_ Terminal</option>
                        <option value="FaRobot">🤖 Robot</option>
                        <option value="FaRocket">🚀 Rocket</option>
                        <option value="FaBrain">🧠 Brain</option>
                    </select>
                </div>
            </div>

            <div className="pt-4 border-t border-gray-700">
                <label className="block text-sm font-medium mb-2 text-gray-300">Hero Section Style</label>
                <div className="flex gap-4">
                    <label className={`flex-1 p-4 rounded-lg border cursor-pointer transition-all ${formData.heroSectionType === 'futuristic' ? 'bg-cyan-900/30 border-cyan-500' : 'bg-gray-700 border-gray-600 hover:border-gray-500'}`}>
                        <input
                            type="radio"
                            name="heroSectionType"
                            value="futuristic"
                            checked={formData.heroSectionType === 'futuristic'}
                            onChange={handleChange}
                            className="hidden"
                        />
                        <div className="font-bold text-white mb-1">Futuristic Card</div>
                        <div className="text-xs text-gray-400">New 3D animated card with glitch effects</div>
                    </label>
                    <label className={`flex-1 p-4 rounded-lg border cursor-pointer transition-all ${formData.heroSectionType === 'game' ? 'bg-orange-900/30 border-orange-500' : 'bg-gray-700 border-gray-600 hover:border-gray-500'}`}>
                        <input
                            type="radio"
                            name="heroSectionType"
                            value="game"
                            checked={formData.heroSectionType === 'game'}
                            onChange={handleChange}
                            className="hidden"
                        />
                        <div className="font-bold text-white mb-1">Classic Game</div>
                        <div className="text-xs text-gray-400">Original layout with Snake & Tic-Tac-Toe</div>
                    </label>
                </div>
            </div>

            <div className="flex justify-end gap-4 pt-4">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-6 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-colors disabled:opacity-50"
                >
                    {saving ? 'Saving...' : 'Update Home'}
                </button>
            </div>
        </form>
    );
};

export default HomeForm;
