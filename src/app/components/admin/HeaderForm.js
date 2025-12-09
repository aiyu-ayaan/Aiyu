"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const HeaderForm = () => {
    const router = useRouter();
    const [formData, setFormData] = useState({
        navLinks: [],
        contactLink: { name: '', href: '' },
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await fetch('/api/header');
            if (res.ok) {
                const data = await res.json();
                if (data) {
                    setFormData(data);
                }
            }
        } catch (err) {
            console.error('Failed to fetch header data', err);
        } finally {
            setLoading(false);
        }
    };

    const handleNavLinkChange = (index, field, value) => {
        const newNavLinks = [...formData.navLinks];
        newNavLinks[index] = { ...newNavLinks[index], [field]: value };
        setFormData({ ...formData, navLinks: newNavLinks });
    };

    const handleContactLinkChange = (field, value) => {
        setFormData({
            ...formData,
            contactLink: { ...formData.contactLink, [field]: value },
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const response = await fetch('/api/header', {
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

    if (loading) return <div className="text-white">Loading...</div>;

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto bg-gray-800 p-8 rounded-xl border border-gray-700">
            {error && (
                <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded">
                    {error}
                </div>
            )}

            <h3 className="text-xl font-bold text-white mb-4">Navigation Links</h3>
            {formData.navLinks.map((link, index) => (
                <div key={index} className="grid grid-cols-2 gap-4 mb-4 p-4 bg-gray-700/50 rounded">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-300">Name</label>
                        <input
                            type="text"
                            value={link.name}
                            onChange={(e) => handleNavLinkChange(index, 'name', e.target.value)}
                            className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-300">Href</label>
                        <input
                            type="text"
                            value={link.href}
                            onChange={(e) => handleNavLinkChange(index, 'href', e.target.value)}
                            className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white"
                        />
                    </div>
                </div>
            ))}

            <h3 className="text-xl font-bold text-white mb-4 mt-8">Contact Link</h3>
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-700/50 rounded">
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Name</label>
                    <input
                        type="text"
                        value={formData.contactLink?.name || ''}
                        onChange={(e) => handleContactLinkChange('name', e.target.value)}
                        className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Href</label>
                    <input
                        type="text"
                        value={formData.contactLink?.href || ''}
                        onChange={(e) => handleContactLinkChange('href', e.target.value)}
                        className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white"
                    />
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
                    {saving ? 'Saving...' : 'Update Header'}
                </button>
            </div>
        </form>
    );
};

export default HeaderForm;
