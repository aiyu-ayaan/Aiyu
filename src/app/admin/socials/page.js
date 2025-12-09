"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function AdminSocials() {
    const [socials, setSocials] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSocials();
    }, []);

    const fetchSocials = async () => {
        try {
            const res = await fetch('/api/socials');
            const data = await res.json();
            setSocials(data);
        } catch (error) {
            console.error('Failed to fetch socials', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this social link?')) return;

        try {
            const res = await fetch(`/api/socials/${id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setSocials(socials.filter((s) => s._id !== id));
            } else {
                alert('Failed to delete social link');
            }
        } catch (error) {
            console.error('Error deleting social link', error);
        }
    };

    if (loading) return <div className="p-8 text-white">Loading...</div>;

    return (
        <div className="p-8">
            <div className="mb-6">
                <Link href="/admin" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors">
                    ← Back to Dashboard
                </Link>
            </div>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-white">Manage Socials</h1>
                <Link href="/admin/socials/new" className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded transition-colors">
                    Add New Social
                </Link>
            </div>

            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <table className="w-full text-left text-gray-300">
                    <thead className="bg-gray-900 text-gray-100 uppercase text-sm font-semibold">
                        <tr>
                            <th className="px-6 py-4">Name</th>
                            <th className="px-6 py-4">URL</th>
                            <th className="px-6 py-4">Icon</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {socials.map((social) => (
                            <tr key={social._id} className="hover:bg-gray-700/50 transition-colors">
                                <td className="px-6 py-4 font-medium text-white">{social.name}</td>
                                <td className="px-6 py-4 truncate max-w-xs">{social.url}</td>
                                <td className="px-6 py-4">{social.iconName}</td>
                                <td className="px-6 py-4 text-right space-x-3">
                                    <Link href={`/admin/socials/${social._id}`} className="text-cyan-400 hover:text-cyan-300 transition-colors">
                                        Edit
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(social._id)}
                                        className="text-red-400 hover:text-red-300 transition-colors"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
