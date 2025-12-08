"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const ConfigForm = () => {
    const router = useRouter();
    const [formData, setFormData] = useState({
        n8nWebhookUrl: '',
        resume: {
            type: 'url',
            value: '',
            filename: '',
        }
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
                        resume: {
                            type: data.resume?.type || 'url',
                            value: data.resume?.value || '',
                            filename: data.resume?.filename || '',
                        }
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

            {/* N8n Section */}
            <div>
                <h2 className="text-xl font-bold text-white mb-4 border-b border-gray-700 pb-2">Integrations</h2>
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
