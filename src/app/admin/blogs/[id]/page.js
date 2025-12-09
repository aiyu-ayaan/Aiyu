
"use client";
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import dynamic from 'next/dynamic';

const SyntaxHighlighter = dynamic(() => import('react-syntax-highlighter').then(mod => mod.Prism), { ssr: false });
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function EditBlogPage() {
    const router = useRouter();
    const { id } = useParams();
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        image: '',
        tags: '',
        date: '',
    });
    const [loading, setLoading] = useState(true);
    const [useUrl, setUseUrl] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);

    useEffect(() => {
        const fetchBlog = async () => {
            try {
                const res = await fetch(`/api/blogs/${id}`);
                const data = await res.json();
                if (data.success) {
                    const d = new Date(data.data.date);
                    // Format to YYYY-MM-DD manually to avoid timezone shifts from toISOString()
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');

                    setFormData({
                        ...data.data,
                        tags: data.data.tags ? data.data.tags.join(', ') : '',
                        date: `${year}-${month}-${day}`,
                    });
                    if (data.data.image && !data.data.image.startsWith('http')) {
                        setUseUrl(false);
                    }
                } else {
                    alert('Blog not found');
                    router.push('/admin/blogs');
                }
            } catch (error) {
                console.error('Failed to fetch blog:', error);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchBlog();
        }
    }, [id, router]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (data.success) {
                setFormData((prev) => ({ ...prev, image: data.url }));
            } else {
                alert('Upload failed: ' + data.error);
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        // Create date object from the YYYY-MM-DD string treating it as local time
        const [year, month, day] = formData.date.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);

        const dataToSubmit = {
            ...formData,
            date: dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '')
        };

        try {
            const res = await fetch(`/api/blogs/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dataToSubmit),
            });

            if (res.ok) {
                router.push('/admin/blogs');
            } else {
                alert('Failed to update blog');
            }
        } catch (error) {
            console.error('Error updating blog:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const insertImageMarkdown = () => {
        if (formData.image) {
            const imageMarkdown = `![Image Alt Text](${formData.image})`;
            setFormData(prev => ({ ...prev, content: prev.content + '\n' + imageMarkdown }));
            alert('Image markdown appended to content!');
        } else {
            alert('No image selected/uploaded to insert.');
        }
    };

    if (loading) return <div className="p-8 text-center text-white">Loading...</div>;

    return (
        <div className="p-8 min-h-screen text-white w-full">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Edit Blog</h1>
                <button
                    type="button"
                    onClick={() => setPreviewMode(!previewMode)}
                    className="text-sm bg-gray-700 px-4 py-2 rounded hover:bg-gray-600 transition-colors"
                >
                    {previewMode ? 'Edit Mode' : 'Preview Mode'}
                </button>
            </div>

            <form onSubmit={handleSubmit} className="w-full bg-gray-800 p-6 rounded-lg shadow-lg space-y-6">
                {/* Meta Fields Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium mb-1">Title</label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            required
                            className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Date</label>
                        <div className="custom-datepicker-wrapper">
                            <DatePicker
                                selected={formData.date ? new Date(formData.date) : null}
                                onChange={(date) => {
                                    if (!date) {
                                        setFormData({ ...formData, date: '' });
                                    } else {
                                        const year = date.getFullYear();
                                        const month = String(date.getMonth() + 1).padStart(2, '0');
                                        const day = String(date.getDate()).padStart(2, '0');
                                        setFormData({ ...formData, date: `${year}-${month}-${day}` });
                                    }
                                }}
                                dateFormat="MMMM d, yyyy"
                                className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:outline-none focus:border-blue-500 text-white"
                                placeholderText="Select date"
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Tags (comma separated)</label>
                    <input
                        type="text"
                        name="tags"
                        value={formData.tags}
                        onChange={handleChange}
                        placeholder="React, Next.js, Web"
                        className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
                    />
                </div>

                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium">Image Cover</label>
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => setUseUrl(!useUrl)}
                                className="text-xs text-blue-400 hover:text-blue-300 underline"
                            >
                                {useUrl ? 'Switch to Upload' : 'Switch to URL'}
                            </button>
                            {formData.image && (
                                <button
                                    type="button"
                                    onClick={insertImageMarkdown}
                                    className="text-xs text-green-400 hover:text-green-300 underline"
                                >
                                    Insert into Content
                                </button>
                            )}
                        </div>
                    </div>

                    {useUrl ? (
                        <input
                            type="text"
                            name="image"
                            value={formData.image}
                            onChange={handleChange}
                            placeholder="https://example.com/image.jpg"
                            className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
                        />
                    ) : (
                        <div className="flex items-center gap-4">
                            <input
                                type="file"
                                onChange={handleFileChange}
                                accept="image/*"
                                className="block w-full text-sm text-slate-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 and file:text-blue-700
                      hover:file:bg-blue-100
                    "
                            />
                            {uploading && <span className="text-yellow-400">Uploading...</span>}
                        </div>
                    )}
                    {formData.image && (
                        <div className="mt-2 text-center">
                            <p className="text-xs text-gray-400 mb-1">Preview:</p>
                            <img src={formData.image} alt="Preview" className="h-48 mx-auto rounded object-cover border border-gray-600" />
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Content (Markdown)</label>
                    {previewMode ? (
                        <div className="w-full min-h-[500px] p-6 bg-gray-900 rounded border border-gray-700 prose prose-invert max-w-none">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    code({ node, inline, className, children, ...props }) {
                                        const match = /language-(\w+)/.exec(className || '')
                                        return !inline && match ? (
                                            <SyntaxHighlighter
                                                style={vscDarkPlus}
                                                language={match[1]}
                                                PreTag="div"
                                                {...props}
                                            >
                                                {String(children).replace(/\n$/, '')}
                                            </SyntaxHighlighter>
                                        ) : (
                                            <code className={className} {...props}>
                                                {children}
                                            </code>
                                        )
                                    },
                                    pre: ({ children }) => <>{children}</>
                                }}
                            >
                                {formData.content}
                            </ReactMarkdown>
                        </div>
                    ) : (
                        <textarea
                            name="content"
                            value={formData.content}
                            onChange={handleChange}
                            required
                            className="w-full h-[500px] p-4 bg-gray-700 rounded border border-gray-600 focus:outline-none focus:border-blue-500 font-mono text-sm leading-relaxed"
                            placeholder="# Write your blog post in Markdown..."
                        ></textarea>
                    )}
                </div>

                <div className="flex gap-4 pt-4 border-t border-gray-700 mt-8">
                    <button
                        type="submit"
                        disabled={submitting || uploading}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded transition-colors disabled:opacity-50"
                    >
                        {submitting ? 'Updating...' : 'Update Blog'}
                    </button>
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </form >
        </div >
    );
}
