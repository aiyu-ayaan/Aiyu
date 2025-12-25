'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, MapPin, Activity, Mail } from 'lucide-react';
import Link from 'next/link';

export default function ContactAdminPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Config state
    const [config, setConfig] = useState({
        contactLocation: '',
        contactEmail: '',
        contactStatus: 'Open to opportunities',
        resume: {
            type: 'url',
            value: ''
        }
    });

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await fetch('/api/config');
            const data = await res.json();
            if (data) {
                setConfig({
                    contactLocation: data.contactLocation || '',
                    contactEmail: data.contactEmail || '',
                    contactStatus: data.contactStatus || 'Open to opportunities',
                    resume: data.resume || { type: 'url', value: '' }
                });
            }
        } catch (error) {
            console.error('Failed to fetch config:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const res = await fetch('/api/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });

            if (res.ok) {
                alert('Contact settings saved successfully!');
            } else {
                alert('Failed to save settings');
            }
        } catch (error) {
            console.error('Save error:', error);
            alert('Failed to save settings: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    return (
        <div className="p-8 min-h-screen w-full flex flex-col items-center">
            <div className="w-full max-w-3xl">
                <div className="mb-6">
                    <Link
                        href="/admin"
                        className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors mb-4 group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Activity className="text-[var(--primary)]" />
                        Contact Configuration
                    </h1>
                </div>

                <form onSubmit={handleSave} className="w-full bg-gray-800 p-6 rounded-lg shadow-lg space-y-6">

                    {/* Location */}
                    <div>
                        <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-cyan-400" />
                            Current Location
                        </label>
                        <input
                            type="text"
                            value={config.contactLocation}
                            onChange={(e) => setConfig({ ...config, contactLocation: e.target.value })}
                            placeholder="e.g. San Francisco, CA"
                            className="w-full p-3 bg-gray-700 rounded border border-gray-600 focus:outline-none focus:border-[var(--primary)]"
                        />
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-green-400" />
                            Work Status
                        </label>
                        <select
                            value={config.contactStatus}
                            onChange={(e) => setConfig({ ...config, contactStatus: e.target.value })}
                            className="w-full p-3 bg-gray-700 rounded border border-gray-600 focus:outline-none focus:border-[var(--primary)]"
                        >
                            <option value="Open to opportunities">Open to opportunities</option>
                            <option value="Busy with projects">Busy with projects</option>
                            <option value="Not looking">Not looking</option>
                        </select>
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                            <Mail className="w-4 h-4 text-purple-400" />
                            Contact Email (for 'Email Me' box)
                        </label>
                        <input
                            type="email"
                            value={config.contactEmail}
                            onChange={(e) => setConfig({ ...config, contactEmail: e.target.value })}
                            placeholder="your.name@example.com"
                            className="w-full p-3 bg-gray-700 rounded border border-gray-600 focus:outline-none focus:border-[var(--primary)]"
                        />
                    </div>



                    {/* Submit */}
                    <div className="flex gap-4 pt-4 border-t border-gray-700">
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-[var(--primary)] hover:brightness-110 text-white px-6 py-2 rounded transition-all font-medium disabled:opacity-50 flex items-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save Settings'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
