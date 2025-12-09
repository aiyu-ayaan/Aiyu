"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto bg-gray-800 p-8 rounded-xl border border-gray-700">
            {error && (
                <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Project Name</label>
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
                    <label className="block text-sm font-medium mb-1 text-gray-300">Year</label>
                    <input
                        type="text"
                        name="year"
                        value={formData.year}
                        onChange={handleChange}
                        className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white"
                        required
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Tech Stack (comma separated)</label>
                <input
                    type="text"
                    name="techStack"
                    value={formData.techStack}
                    onChange={handleChange}
                    className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white"
                    placeholder="React, Node.js, MongoDB"
                    required
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Status</label>
                    <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white"
                    >
                        <option value="Done">Done</option>
                        <option value="In Progress">In Progress</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Project Type</label>
                    <input
                        type="text"
                        name="projectType"
                        value={formData.projectType}
                        onChange={handleChange}
                        className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white"
                        required
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Description</label>
                <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows="4"
                    className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white"
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Code Link</label>
                <input
                    type="url"
                    name="codeLink"
                    value={formData.codeLink}
                    onChange={handleChange}
                    className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white"
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Image URL (Optional)</label>
                <input
                    type="text"
                    name="image"
                    value={formData.image}
                    onChange={handleChange}
                    className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white"
                />
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
                    {loading ? 'Saving...' : isEdit ? 'Update Project' : 'Create Project'}
                </button>
            </div>
        </form>
    );
};

export default ProjectForm;
