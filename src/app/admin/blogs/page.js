
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
        <div className="p-8 min-h-screen">
            <div className="mb-6">
                <Link href="/admin" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors">
                    ← Back to Dashboard
                </Link>
            </div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Manage Blogs</h1>
                <Link href="/admin/blogs/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors">
                    Add New Blog
                </Link>
            </div>

            <div className="bg-gray-800 rounded-lg shadow overflow-hidden">
                <table className="w-full text-left text-gray-300">
                    <thead className="bg-gray-900 text-gray-100 uppercase text-sm font-semibold">
                        <tr>
                            <th className="px-6 py-4">Title</th>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {blogs.map((blog) => (
                            <tr key={blog._id} className="hover:bg-gray-700/50 transition-colors">
                                <td className="px-6 py-4 font-medium text-white">{blog.title}</td>
                                <td className="px-6 py-4">{blog.date}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${blog.published !== false ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                                        }`}>
                                        {blog.published !== false ? 'Published' : 'Draft'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right space-x-3">
                                    <button
                                        onClick={() => togglePublish(blog._id, blog.published !== false)}
                                        className="text-yellow-400 hover:text-yellow-300 transition-colors"
                                    >
                                        {blog.published !== false ? 'Turn Off' : 'Turn On'}
                                    </button>
                                    <Link href={`/admin/blogs/${blog._id}`} className="text-cyan-400 hover:text-cyan-300 transition-colors">
                                        Edit
                                    </Link>
                                    <button onClick={() => deleteBlog(blog._id)} className="text-red-400 hover:text-red-300 transition-colors">
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {blogs.length === 0 && (
                            <tr>
                                <td colSpan="4" className="px-6 py-8 text-center text-gray-500">No blogs found. Create one!</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
