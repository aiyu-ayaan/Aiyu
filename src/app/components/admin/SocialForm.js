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
                router.push('/admin/socials');
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
                <label className="block text-sm font-medium mb-1 text-gray-300">URL</label>
                <input
                    type="url"
                    name="url"
                    value={formData.url}
                    onChange={handleChange}
                    className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white"
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Icon Name (e.g., FaGithub)</label>
                <input
                    type="text"
                    name="iconName"
                    value={formData.iconName}
                    onChange={handleChange}
                    className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white"
                    required
                />
                <p className="text-xs text-gray-400 mt-1">Must match an icon exported in src/lib/icons.js</p>
            </div>

            <div className="flex items-center gap-3">
                <input
                    type="checkbox"
                    id="isHidden"
                    name="isHidden"
                    checked={formData.isHidden || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, isHidden: e.target.checked }))}
                    className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-cyan-600 focus:ring-cyan-500 rounded focus:ring-offset-gray-800"
                />
                <label htmlFor="isHidden" className="text-sm font-medium text-gray-300">
                    Hide this social link
                </label>
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
                    disabled={loading}
                    className="px-6 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-colors disabled:opacity-50"
                >
                    {loading ? 'Saving...' : isEdit ? 'Update Social' : 'Create Social'}
                </button>
            </div>
        </form>
    );
};

export default SocialForm;
