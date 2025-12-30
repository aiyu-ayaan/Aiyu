'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, MapPin, Activity, Mail, Trash2, MessageSquare, Webhook } from 'lucide-react';
import Link from 'next/link';
import Toast from '@/app/components/admin/Toast';

export default function ContactAdminPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notification, setNotification] = useState(null);

    // Config state
    const [config, setConfig] = useState({
        contactLocation: '',
        contactEmail: '',
        n8nWebhookUrl: '',
        contactStatus: 'Open to opportunities',
        resume: {
            type: 'url',
            value: ''
        }
    });

    const [messages, setMessages] = useState([]);

    const showNotification = (success, message) => {
        setNotification({ success, message });
        setTimeout(() => setNotification(null), 3000);
    };

    useEffect(() => {
        fetchConfig();
        fetchMessages();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await fetch('/api/config');
            const data = await res.json();
            if (data) {
                setConfig({
                    contactLocation: data.contactLocation || '',
                    contactEmail: data.contactEmail || '',
                    n8nWebhookUrl: data.n8nWebhookUrl || '',
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

    const fetchMessages = async () => {
        try {
            const res = await fetch('/api/contact/message');
            const data = await res.json();
            if (data.success) {
                setMessages(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch messages:', error);
        }
    };

    const handleDeleteMessage = async (id) => {
        if (!confirm('Are you sure you want to delete this message?')) return;

        try {
            const res = await fetch(`/api/contact/message?id=${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setMessages(prev => prev.filter(msg => msg._id !== id));
                showNotification(true, 'Message deleted successfully');
            } else {
                showNotification(false, 'Failed to delete message');
            }
        } catch (error) {
            console.error('Delete error:', error);
            showNotification(false, 'Failed to delete message');
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
                showNotification(true, 'Contact Settings Updated Successfully');
            } else {
                showNotification(false, 'Failed to save settings');
            }
        } catch (error) {
            console.error('Save error:', error);
            showNotification(false, 'Failed to save settings: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <span className="font-mono text-cyan-400 animate-pulse">ESTABLISHING_UPLINK...</span>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto min-h-screen w-full flex flex-col">
            <div className="mb-8">
                <Link
                    href="/admin"
                    className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors mb-4 text-sm font-mono opacity-60 hover:opacity-100"
                >
                    ← BACK_TO_COMMAND_CENTER
                </Link>
                <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Comms Array</h1>
                <p className="text-slate-400">Manage incoming transmissions and contact protocols.</p>
            </div>

            <form onSubmit={handleSave} className="space-y-12">

                {/* Contact Configuration Section */}
                <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                    <h2 className="text-sm font-mono text-cyan-500/70 uppercase tracking-widest mb-8 flex items-center gap-4 relative z-10">
                        Signal Parameters
                        <div className="h-px bg-cyan-500/10 flex-grow" />
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                        {/* Location */}
                        <div>
                            <label className="block text-slate-400 mb-2 text-xs font-mono uppercase tracking-wider flex items-center gap-2">
                                <MapPin className="w-3 h-3 text-cyan-400" /> Location Coordinates
                            </label>
                            <input
                                type="text"
                                value={config.contactLocation}
                                onChange={(e) => setConfig({ ...config, contactLocation: e.target.value })}
                                placeholder="e.g. San Francisco, CA"
                                className="w-full bg-slate-950/50 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all placeholder:text-slate-600 font-mono"
                            />
                        </div>

                        {/* Status */}
                        <div>
                            <label className="block text-slate-400 mb-2 text-xs font-mono uppercase tracking-wider flex items-center gap-2">
                                <Activity className="w-3 h-3 text-green-400" /> Operative Status
                            </label>
                            <select
                                value={config.contactStatus}
                                onChange={(e) => setConfig({ ...config, contactStatus: e.target.value })}
                                className="w-full bg-slate-950/50 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all appearance-none"
                            >
                                <option value="Open to opportunities" className="bg-slate-900">Open to opportunities</option>
                                <option value="Busy with projects" className="bg-slate-900">Busy with projects</option>
                                <option value="Not looking" className="bg-slate-900">Not looking</option>
                            </select>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-slate-400 mb-2 text-xs font-mono uppercase tracking-wider flex items-center gap-2">
                                <Mail className="w-3 h-3 text-purple-400" /> Direct Uplink (Email)
                            </label>
                            <input
                                type="email"
                                value={config.contactEmail}
                                onChange={(e) => setConfig({ ...config, contactEmail: e.target.value })}
                                placeholder="your.name@example.com"
                                className="w-full bg-slate-950/50 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all placeholder:text-slate-600 font-mono"
                            />
                        </div>

                        {/* n8n Webhook */}
                        <div>
                            <label className="block text-slate-400 mb-2 text-xs font-mono uppercase tracking-wider flex items-center gap-2">
                                <Webhook className="w-3 h-3 text-orange-400" /> Webhook Endpoint (n8n)
                            </label>
                            <input
                                type="url"
                                value={config.n8nWebhookUrl}
                                onChange={(e) => setConfig({ ...config, n8nWebhookUrl: e.target.value })}
                                placeholder="https://..."
                                className="w-full bg-slate-950/50 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 outline-none transition-all placeholder:text-slate-600 font-mono"
                            />
                        </div>
                    </div>
                </div>

                {/* Sticky Action Footer */}
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
                        className="px-8 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all shadow-[0_0_20px_rgba(8,145,178,0.3)] hover:shadow-[0_0_30px_rgba(8,145,178,0.5)] disabled:opacity-50 disabled:cursor-not-allowed text-sm tracking-wide flex items-center gap-2"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                UPDATING_SYSTEM...
                            </>
                        ) : (
                            'CONFIRM_UPDATE'
                        )}
                    </button>
                </div>
            </form>

            {/* Messages Inbox */}
            <div className="w-full mt-16">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-xl font-bold flex items-center gap-3 text-white">
                        <span className="w-2 h-8 bg-cyan-500 rounded-full" />
                        <MessageSquare className="text-cyan-400 w-5 h-5" />
                        Incoming Transmissions
                        <span className="text-sm bg-white/10 text-slate-400 px-2 py-0.5 rounded-full font-mono">{messages.length}</span>
                    </h2>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {messages.length === 0 ? (
                        <div className="text-slate-500 text-center py-12 bg-white/[0.02] border border-white/5 rounded-2xl font-mono text-sm">
                            [NO_TRANSMISSIONS_DETECTED]
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <div key={msg._id} className="bg-slate-900/40 backdrop-blur-xl p-6 rounded-2xl border border-white/10 hover:border-cyan-500/30 transition-all group relative">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-white/10 text-cyan-400 font-bold text-lg">
                                            {msg.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white tracking-wide">{msg.name}</h3>
                                            <a href={`mailto:${msg.email}`} className="text-slate-400 hover:text-cyan-400 text-xs font-mono transition-colors">
                                                {msg.email}
                                            </a>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-[10px] font-mono text-slate-500">
                                            {new Date(msg.createdAt).toLocaleString()}
                                        </div>
                                        <button
                                            onClick={() => handleDeleteMessage(msg._id)}
                                            className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            title="Purge Transmission"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="pl-14">
                                    <div className="bg-black/40 p-4 rounded-lg border border-white/5 text-slate-300 text-sm leading-relaxed font-mono">
                                        {msg.message}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Toast Notification */}
            <Toast notification={notification} />
        </div>
    );
}
