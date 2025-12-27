
"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminBlogsPage() {
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBlogs();
    }, []);

    const fetchBlogs = async () => {
        try {
            const res = await fetch('/api/blogs?all=true');
            const data = await res.json();
            if (data.success) {
                setBlogs(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch blogs:', error);
        } finally {
            setLoading(false);
        }
    };

    const togglePublish = async (id, currentStatus) => {
        try {
            const res = await fetch(`/api/blogs/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ published: !currentStatus }),
            });
            const data = await res.json();
            if (data.success) {
                // Optimistic update or refetch
                setBlogs(blogs.map(blog =>
                    blog._id === id ? { ...blog, published: !currentStatus } : blog
                ));
            }
        } catch (error) {
            console.error('Failed to toggle blog status:', error);
        }
    };

    const deleteBlog = async (id) => {
        if (!confirm('Are you sure you want to delete this blog?')) return;

        try {
            const res = await fetch(`/api/blogs/${id}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (data.success) {
                fetchBlogs();
            }
        } catch (error) {
            console.error('Failed to delete blog:', error);
        }
    };

    if (loading) return <div className="p-8 text-center text-white">Loading...</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <Link href="/admin" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors mb-4 text-sm font-mono opacity-60 hover:opacity-100">
                    ← BACK_TO_COMMAND_CENTER
                </Link>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">Transmission Logs</h1>
                        <p className="text-slate-400">Manage blog posts, articles, and public transmissions.</p>
                    </div>
                    <Link href="/admin/blogs/new" className="group relative px-6 py-3 rounded-lg overflow-hidden bg-cyan-500/10 border border-cyan-500/20 hover:border-cyan-500/50 transition-all hover:shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                        <span className="relative text-cyan-400 font-bold tracking-wide flex items-center gap-2">
                            <span className="text-lg">+</span> COMPOSE_TRANSMISSION
                        </span>
                    </Link>
                </div>
            </div>

            <div className="bg-[#0a0a0a]/60 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white/5 border-b border-white/5 text-xs uppercase tracking-wider text-slate-400 font-medium">
                            <tr>
                                <th className="px-6 py-5">Transmission Title</th>
                                <th className="px-6 py-5">Timestamp</th>
                                <th className="px-6 py-5">Signal Status</th>
                                <th className="px-6 py-5 text-right">Controls</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                            {blogs.map((blog) => (
                                <tr key={blog._id} className="group hover:bg-white/[0.02] transition-colors">
                                    <td className="px-6 py-5 font-semibold text-slate-200 group-hover:text-cyan-400 transition-colors">
                                        {blog.title}
                                    </td>
                                    <td className="px-6 py-5 text-slate-500 font-mono">{blog.date}</td>
                                    <td className="px-6 py-5">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${blog.published !== false
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                            }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${blog.published !== false ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                            {blog.published !== false ? 'Broadcast Active' : 'Draft / Offline'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 text-right flex items-center justify-end gap-3 opacity-60 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => togglePublish(blog._id, blog.published !== false)}
                                            className={`${blog.published !== false ? 'text-amber-400 hover:text-amber-300' : 'text-emerald-400 hover:text-emerald-300'} transition-colors text-xs uppercase font-bold tracking-wider`}
                                        >
                                            {blog.published !== false ? 'Cease' : 'Broadcast'}
                                        </button>
                                        <Link href={`/admin/blogs/${blog._id}`} className="text-cyan-400 hover:text-cyan-300 transition-colors text-xs uppercase font-bold tracking-wider">
                                            Edit
                                        </Link>
                                        <button
                                            onClick={() => deleteBlog(blog._id)}
                                            className="text-red-400 hover:text-red-300 transition-colors text-xs uppercase font-bold tracking-wider"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {blogs.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
                                        No transmissions intercepted. Initialize new sequence.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
