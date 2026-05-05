"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Toast from './Toast';

const AdsForm = () => {
    const router = useRouter();
    const [formData, setFormData] = useState({
        adsenseEnabled: false,
        clientId: '',
        slotId: '',
        adCount: 1
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await fetch('/api/admin/ads');
            if (res.ok) {
                const data = await res.json();
                if (data) {
                    setFormData({
                        adsenseEnabled: data.adsenseEnabled || false,
                        clientId: data.clientId || '',
                        slotId: data.slotId || '',
                        adCount: data.adCount || 1
                    });
                }
            }
        } catch (err) {
            console.error('Failed to fetch ads config', err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const showNotification = (success, message) => {
        setNotification({ success, message });
        setTimeout(() => setNotification(null), 3000);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const response = await fetch('/api/admin/ads', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                showNotification(true, 'Google AdSense Config Updated Successfully');
                router.refresh();
                fetchData();
            } else {
                const data = await response.json();
                setError(data.error || 'Something went wrong');
                showNotification(false, data.error || 'Failed to update');
            }
        } catch {
            setError('An error occurred');
            showNotification(false, 'An error occurred');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="text-green-400 font-mono animate-pulse">LOADING_ADS_CONFIG...</div>;

    return (
        <form onSubmit={handleSubmit} className="space-y-12 max-w-4xl mx-auto">
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-center gap-3">
                    <span className="text-xl">⚠️</span>
                    {error}
                </div>
            )}

            <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                <h2 className="text-sm font-mono text-green-500/70 uppercase tracking-widest mb-8 flex items-center gap-4">
                    AdSense Integration
                    <div className="h-px bg-green-500/10 flex-grow" />
                </h2>

                <div className="space-y-6 relative z-10">
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="adsenseEnabled"
                            name="adsenseEnabled"
                            checked={formData.adsenseEnabled}
                            onChange={handleChange}
                            className="w-5 h-5 rounded border-white/10 bg-slate-950/50 text-green-500 focus:ring-green-500 focus:ring-offset-slate-900"
                        />
                        <label htmlFor="adsenseEnabled" className="text-slate-300 font-bold uppercase tracking-wide">
                            Enable Google AdSense
                        </label>
                    </div>

                    {formData.adsenseEnabled && (
                        <>
                            <div>
                                <label className="block text-slate-400 mb-2 text-xs font-mono uppercase tracking-wider">Client ID (data-ad-client)</label>
                                <input
                                    type="text"
                                    name="clientId"
                                    value={formData.clientId}
                                    onChange={handleChange}
                                    placeholder="ca-pub-XXXXXXXXXXXXXXXX"
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 outline-none transition-all placeholder:text-slate-600 font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-slate-400 mb-2 text-xs font-mono uppercase tracking-wider">Slot ID (data-ad-slot)</label>
                                <input
                                    type="text"
                                    name="slotId"
                                    value={formData.slotId}
                                    onChange={handleChange}
                                    placeholder="XXXXXXXXXX"
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 outline-none transition-all placeholder:text-slate-600 font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-slate-400 mb-2 text-xs font-mono uppercase tracking-wider">Number of Ads to Display</label>
                                <input
                                    type="number"
                                    name="adCount"
                                    value={formData.adCount}
                                    onChange={handleChange}
                                    min="1"
                                    max="5"
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 outline-none transition-all placeholder:text-slate-600 font-mono"
                                />
                                <p className="text-xs text-slate-500 mt-2 font-mono">
                                    {'// Max 5. Dictates how many ad blocks spawn across the article layout (Top, Bottom, Sidebar, etc).'}
                                </p>
                            </div>
                            <p className="text-xs text-slate-500 mt-2 font-mono">
                                {'// The IDs will be securely encrypted in the database and decrypted on the fly when rendering blogs.'}
                            </p>
                        </>
                    )}
                </div>
            </div>

            <div className="sticky bottom-8 flex justify-end gap-4 pt-6 border-t border-white/5 bg-slate-900/90 backdrop-blur-lg p-4 rounded-xl border border-white/5 shadow-2xl z-50 mt-12">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-6 py-2 rounded bg-white/5 hover:bg-white/10 text-slate-400 transition-colors text-sm font-medium"
                >
                    CANCEL
                </button>
                <button
                    type="submit"
                    disabled={saving}
                    className="px-8 py-2 rounded bg-green-600 hover:bg-green-500 text-white font-bold transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] disabled:opacity-50 disabled:cursor-not-allowed text-sm tracking-wide flex items-center gap-2"
                >
                    {saving ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            SAVING_CONFIG...
                        </>
                    ) : (
                        'SAVE_CONFIG'
                    )}
                </button>
            </div>

            <Toast notification={notification} />
        </form>
    );
};

export default AdsForm;
