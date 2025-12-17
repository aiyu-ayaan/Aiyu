"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const ConfigForm = () => {
    const router = useRouter();
    const [formData, setFormData] = useState({
        n8nWebhookUrl: '',
        googleAnalyticsId: '',
        logoText: '< aiyu />',
        siteTitle: '',
        favicon: {
            value: '',
            filename: '',
            mimeType: ''
        },
        resume: {
            type: 'url',
            value: '',
            filename: '',
        },
        projectsTitle: '',
        projectsSubtitle: '',
        blogsTitle: '',
        blogsSubtitle: '',
        galleryTitle: '',
        gallerySubtitle: '',

    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await fetch('/api/config');
            if (res.ok) {
                const data = await res.json();
                if (data) {
                    setFormData({
                        n8nWebhookUrl: data.n8nWebhookUrl || '',
                        googleAnalyticsId: data.googleAnalyticsId || '',
                        logoText: data.logoText || '< aiyu />',
                        siteTitle: data.siteTitle || '',
                        favicon: {
                            value: data.favicon?.value || '',
                            filename: data.favicon?.filename || '',
                            mimeType: data.favicon?.mimeType || ''
                        },
                        resume: {
                            type: data.resume?.type || 'url',
                            value: data.resume?.value || '',
                            filename: data.resume?.filename || '',
                        },
                        projectsTitle: data.projectsTitle || 'Projects Portfolio',
                        projectsSubtitle: data.projectsSubtitle || 'A collection of my work',
                        blogsTitle: data.blogsTitle || 'Latest Insights',
                        blogsSubtitle: data.blogsSubtitle || 'Thoughts, tutorials, and updates on web development and technology.',
                        galleryTitle: data.galleryTitle || 'Gallery',
                        gallerySubtitle: data.gallerySubtitle || 'A visual journey through my lens.'

                    });
                }
            }
        } catch (err) {
            console.error('Failed to fetch config', err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    // Resume Handlers
    const handleResumeTypeChange = (type) => {
        setFormData(prev => ({
            ...prev,
            resume: { ...prev.resume, type }
        }));
    };

    const handleResumeValueChange = (value) => {
        setFormData(prev => ({
            ...prev,
            resume: { ...prev.resume, value }
        }));
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                setError("File size too large. Max 5MB.");
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({
                    ...prev,
                    resume: {
                        ...prev.resume,
                        type: 'file',
                        value: reader.result, // Base64 string
                        filename: file.name
                    }
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleFaviconUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 1 * 1024 * 1024) { // 1MB limit for favicon
                setError("Favicon size too large. Max 1MB.");
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({
                    ...prev,
                    favicon: {
                        value: reader.result,
                        filename: file.name,
                        mimeType: file.type
                    }
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const response = await fetch('/api/config', {
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
        <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl mx-auto bg-gray-800 p-8 rounded-xl border border-gray-700">
            {error && (
                <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded">
                    {error}
                </div>
            )}

            {/* Branding Section */}
            <div>
                <h2 className="text-xl font-bold text-white mb-4 border-b border-gray-700 pb-2">Branding</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-300">Logo Text</label>
                        <input
                            type="text"
                            name="logoText"
                            value={formData.logoText}
                            onChange={handleChange}
                            placeholder="< aiyu />"
                            className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white font-mono"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                            Displayed in the top-left of the header.
                        </p>
                    </div>
                </div>
            </div>

            {/* Browser & SEO Section */}
            <div>
                <h2 className="text-xl font-bold text-white mb-4 border-b border-gray-700 pb-2">Browser & SEO</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-300">Site Title</label>
                        <input
                            type="text"
                            name="siteTitle"
                            value={formData.siteTitle}
                            onChange={handleChange}
                            placeholder="Ayaan's Portfolio"
                            className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                            The title shown in the browser tab.
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-300">Favicon</label>
                        <input
                            type="file"
                            accept=".ico,.png,.jpg,.svg"
                            onChange={handleFaviconUpload}
                            className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-600 file:text-white hover:file:bg-cyan-500"
                        />
                        {formData.favicon.filename && (
                            <div className="mt-2 text-sm text-green-400 flex items-center gap-1">
                                <span>✓ Selected:</span>
                                <span className="font-mono">{formData.favicon.filename}</span>
                            </div>
                        )}
                        {/* Preview */}
                        {formData.favicon.value && (
                            <div className="mt-2">
                                <p className="text-xs text-gray-400 mb-1">Preview:</p>
                                <img src={formData.favicon.value} alt="Favicon Preview" className="w-8 h-8 object-contain bg-gray-900 rounded border border-gray-600" />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Page Headers Section */}
            <div>
                <h2 className="text-xl font-bold text-white mb-4 border-b border-gray-700 pb-2">Page Headers</h2>
                <div className="space-y-6">
                    {/* Projects Header */}
                    <div className="bg-gray-700/30 p-4 rounded-lg border border-gray-700">
                        <h3 className="text-lg font-semibold text-white mb-3">Projects Page</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-300">Title</label>
                                <input
                                    type="text"
                                    name="projectsTitle"
                                    value={formData.projectsTitle}
                                    onChange={handleChange}
                                    className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-300">Subtitle</label>
                                <input
                                    type="text"
                                    name="projectsSubtitle"
                                    value={formData.projectsSubtitle}
                                    onChange={handleChange}
                                    className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Blogs Header */}
                    <div className="bg-gray-700/30 p-4 rounded-lg border border-gray-700">
                        <h3 className="text-lg font-semibold text-white mb-3">Blogs Page</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-300">Title</label>
                                <input
                                    type="text"
                                    name="blogsTitle"
                                    value={formData.blogsTitle}
                                    onChange={handleChange}
                                    className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-300">Subtitle</label>
                                <textarea
                                    name="blogsSubtitle"
                                    value={formData.blogsSubtitle}
                                    onChange={handleChange}
                                    rows="2"
                                    className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Gallery Header */}
                    <div className="bg-gray-700/30 p-4 rounded-lg border border-gray-700">
                        <h3 className="text-lg font-semibold text-white mb-3">Gallery Page</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-300">Title</label>
                                <input
                                    type="text"
                                    name="galleryTitle"
                                    value={formData.galleryTitle}
                                    onChange={handleChange}
                                    className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-300">Subtitle</label>
                                <input
                                    type="text"
                                    name="gallerySubtitle"
                                    value={formData.gallerySubtitle}
                                    onChange={handleChange}
                                    className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Integrations Section */}
            <div>
                <h2 className="text-xl font-bold text-white mb-4 border-b border-gray-700 pb-2">Integrations</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-300">N8n Webhook URL</label>
                        <input
                            type="url"
                            name="n8nWebhookUrl"
                            value={formData.n8nWebhookUrl}
                            onChange={handleChange}
                            placeholder="https://your-n8n-instance.com/webhook/..."
                            className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                            Used for the AI Assistant chat widget.
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-300">Google Analytics ID</label>
                        <input
                            type="text"
                            name="googleAnalyticsId"
                            value={formData.googleAnalyticsId}
                            onChange={handleChange}
                            placeholder="G-XXXXXXXXXX"
                            className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                            Your Google Analytics Measurement ID (starts with G-).
                        </p>
                    </div>
                </div>
            </div>

            {/* Resume Section */}
            <div>
                <h2 className="text-xl font-bold text-white mb-4 border-b border-gray-700 pb-2">Resume</h2>
                <div className="flex gap-4 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name="resumeType"
                            checked={formData.resume.type === 'url'}
                            onChange={() => handleResumeTypeChange('url')}
                            className="accent-cyan-500 w-4 h-4"
                        />
                        <span className="text-gray-300">External URL</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name="resumeType"
                            checked={formData.resume.type === 'file'}
                            onChange={() => handleResumeTypeChange('file')}
                            className="accent-cyan-500 w-4 h-4"
                        />
                        <span className="text-gray-300">Upload File</span>
                    </label>
                </div>

                {formData.resume.type === 'url' ? (
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-300">Resume URL</label>
                        <input
                            type="url"
                            value={formData.resume.value}
                            onChange={(e) => handleResumeValueChange(e.target.value)}
                            placeholder="https://example.com/my-resume.pdf"
                            className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white"
                        />
                    </div>
                ) : (
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-300">Upload PDF</label>
                        <input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={handleFileUpload}
                            className="w-full p-2 rounded bg-gray-700 border border-gray-600 text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-600 file:text-white hover:file:bg-cyan-500"
                        />
                        {formData.resume.filename && (
                            <div className="mt-2 text-sm text-green-400 flex items-center gap-1">
                                <span>✓ Selected:</span>
                                <span className="font-mono">{formData.resume.filename}</span>
                            </div>
                        )}
                        {/* Show link if value exists and it's a data URI */}
                        {formData.resume.value && formData.resume.type === 'file' && formData.resume.value.startsWith('data:') && (
                            <a href={formData.resume.value} download={formData.resume.filename || 'resume.pdf'} className="text-xs text-cyan-400 hover:underline mt-1 inline-block">
                                Download Current File
                            </a>
                        )}
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-4 pt-6 border-t border-gray-700">
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
                    {saving ? 'Save Configuration' : 'Update Configuration'}
                </button>
            </div>
        </form>
    );
};

export default ConfigForm;
