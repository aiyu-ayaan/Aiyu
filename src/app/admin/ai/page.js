'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Bot, CheckCircle, XCircle, ArrowLeft, Cpu, Key, Radio, Lock } from 'lucide-react';
import Link from 'next/link';

export default function AiConfigPage() {
    const router = useRouter();
    const [config, setConfig] = useState({
        enabled: false,
        model: 'gemini-1.5-flash',
        systemInstruction: '',
        hasKey: false
    });
    const [newKey, setNewKey] = useState('');
    const [showKeyInput, setShowKeyInput] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await fetch('/api/admin/ai/config');
            const data = await res.json();
            if (data.success && data.data) {
                setConfig({
                    enabled: data.data.enabled || false,
                    model: data.data.model || 'gemini-1.5-flash',
                    systemInstruction: data.data.systemInstruction || '',
                    hasKey: data.data.hasKey || false
                });
            }
        } catch (error) {
            console.error('Failed to fetch AI config:', error);
            showNotification(false, 'Failed to load configuration');
        } finally {
            setLoading(false);
        }
    };

    const showNotification = (success, message) => {
        setNotification({ success, message });
        setTimeout(() => setNotification(null), 3000);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const res = await fetch('/api/admin/ai/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...config,
                    apiKey: newKey || undefined // Only send if changed
                })
            });

            const data = await res.json();

            if (data.success) {
                setConfig(prev => ({ ...prev, hasKey: data.data.hasKey }));
                if (newKey) {
                    setNewKey('');
                    setShowKeyInput(false);
                }
                showNotification(true, 'AI System Configuration Updated');
            } else {
                showNotification(false, `Failed to save: ${data.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Save error:', error);
            showNotification(false, 'Failed to save configuration');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <span className="font-mono text-cyan-400 animate-pulse">INITIALIZING_AI_INTERFACE...</span>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto min-h-screen w-full flex flex-col">
            <div className="mb-8">
                <Link
                    href="/admin"
                    className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors mb-4 font-mono text-sm tracking-wide"
                >
                    ← BACK_TO_COMMAND_CENTER
                </Link>
                <div className="flex items-center gap-4 mb-2">
                    <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400 border border-cyan-500/20">
                        <Bot size={32} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-bold text-white tracking-tight">AI Neural Core</h1>
                        <p className="text-slate-400 mt-1">Configure Gemini integration for automated tasks and intelligence.</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-8">

                {/* Master Switch & Status */}
                <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                        <div>
                            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                                <Cpu className="text-cyan-400" size={18} />
                                System Status
                            </h2>
                            <p className="text-slate-400 text-sm max-w-lg">
                                Master control for all AI-assisted features across the administration panel. Disabling this will shut down all generative capabilities.
                            </p>
                        </div>

                        <div className={`flex items-center gap-4 px-4 py-2 rounded-xl border ${config.enabled
                            ? 'bg-green-500/10 border-green-500/30'
                            : 'bg-slate-800/50 border-white/10'
                            }`}>
                            <div className="flex flex-col items-end">
                                <span className={`text-[10px] uppercase font-bold tracking-widest ${config.enabled ? 'text-green-400' : 'text-slate-500'}`}>
                                    {config.enabled ? 'SYSTEM_ONLINE' : 'SYSTEM_OFFLINE'}
                                </span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={config.enabled}
                                    onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                                    className="sr-only peer"
                                />
                                <div className="w-14 h-7 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* API Key Configuration */}
                <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                    <h2 className="text-sm font-mono text-purple-400 uppercase tracking-widest mb-6 flex items-center gap-3">
                        <Key size={14} /> Security Credentials
                        <div className="h-px bg-purple-500/20 flex-grow" />
                    </h2>

                    <div className="space-y-6 relative z-10">
                        <div>
                            <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 mb-2">
                                Gemini API Key
                            </label>
                            <div className="flex gap-3">
                                {config.hasKey && !showKeyInput ? (
                                    <div className="flex-1 bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center gap-3">
                                        <div className="p-1 bg-green-500/20 rounded text-green-400">
                                            <Lock size={14} />
                                        </div>
                                        <span className="text-green-400 text-sm font-mono flex-1">
                                            •••• •••• •••• •••• (Encrypted & Stored)
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setShowKeyInput(true)}
                                            className="px-3 py-1 bg-slate-900/50 hover:bg-slate-900 text-xs text-slate-300 rounded border border-white/10 transition-colors uppercase font-mono"
                                        >
                                            Replace Key
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex gap-2">
                                        <input
                                            type="password"
                                            value={newKey}
                                            onChange={(e) => setNewKey(e.target.value)}
                                            placeholder={config.hasKey ? "Enter new key to overwrite current..." : "Paste Gemini API Key here (starts with AIza...)"}
                                            className="flex-1 bg-slate-950/50 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-purple-500/50 outline-none text-sm font-mono placeholder:text-slate-600 focus:ring-1 focus:ring-purple-500/50 transition-all"
                                        />
                                        {showKeyInput && (
                                            <button
                                                type="button"
                                                onClick={() => { setShowKeyInput(false); setNewKey(''); }}
                                                className="px-4 text-slate-400 hover:text-white border border-white/10 hover:border-white/30 rounded-lg transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-2 font-mono ml-1">
                                Keys are encrypted using AES-256 before storage. Never shared with client-side code.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Model Configuration */}
                <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                    <h2 className="text-sm font-mono text-blue-400 uppercase tracking-widest mb-6 flex items-center gap-3">
                        <Cpu size={14} /> Model Parameters
                        <div className="h-px bg-blue-500/20 flex-grow" />
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                        <div>
                            <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 mb-3">
                                Active Model
                            </label>
                            <div className="space-y-3">
                                {[
                                    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', desc: 'Fast, efficient, low latency.' },
                                    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', desc: 'High reasoning, complex tasks.' },
                                ].map((model) => (
                                    <label
                                        key={model.id}
                                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all
                                            ${config.model === model.id
                                                ? 'bg-blue-500/10 border-blue-500/40'
                                                : 'bg-slate-900/30 border-white/5 hover:border-white/10'
                                            }
                                        `}
                                    >
                                        <div className={`mt-0.5 p-1 rounded-full border ${config.model === model.id ? 'border-blue-400 bg-blue-400' : 'border-slate-600'}`}>
                                            <div className="w-1.5 h-1.5 bg-slate-900 rounded-full" />
                                        </div>
                                        <input
                                            type="radio"
                                            name="model"
                                            value={model.id}
                                            checked={config.model === model.id}
                                            onChange={(e) => setConfig({ ...config, model: e.target.value })}
                                            className="hidden"
                                        />
                                        <div>
                                            <span className={`block text-sm font-bold ${config.model === model.id ? 'text-blue-300' : 'text-slate-300'}`}>
                                                {model.name}
                                            </span>
                                            <span className="text-xs text-slate-500">{model.desc}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 mb-3">
                                System Persona
                            </label>
                            <textarea
                                value={config.systemInstruction}
                                onChange={(e) => setConfig({ ...config, systemInstruction: e.target.value })}
                                rows={5}
                                placeholder="Define how the AI should behave..."
                                className="w-full bg-slate-950/50 border border-white/10 rounded-lg p-3 text-slate-300 text-sm focus:border-blue-500/50 outline-none resize-none placeholder:text-slate-700 custom-scrollbar"
                            />
                            <p className="text-[10px] text-slate-500 mt-2 font-mono">
                                This instruction is prepended to all system prompts to define tone and behavior.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Action Footer */}
                <div className="flex justify-end pt-4 border-t border-white/5">
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-8 py-3 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all shadow-[0_0_20px_rgba(8,145,178,0.3)] hover:shadow-[0_0_30px_rgba(8,145,178,0.5)] disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase tracking-widest flex items-center gap-2"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="animate-spin" size={14} />
                                SAVING_CONFIGURATION...
                            </>
                        ) : (
                            'UPDATE_NEURAL_CORE'
                        )}
                    </button>
                </div>

            </form>

            <div className="mt-12 mb-8 p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
                <h3 className="text-yellow-500 text-xs font-bold uppercase tracking-wider mb-2">Integration Note</h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                    This module provides the core configuration. To utilize AI features, specific components (like Gallery or Blog) must explicitly invoke the AI service using these secure credentials. Ensure your implementation handles rate limits gracefully.
                </p>
            </div>

            {/* Notification Toast */}
            {notification && (
                <div className={`fixed bottom-8 right-8 p-4 rounded-xl border shadow-2xl backdrop-blur-xl z-50 flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 ${notification.success
                    ? 'bg-green-500/10 border-green-500/20 text-green-400'
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>
                    {notification.success ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                    <span className="font-mono text-sm font-bold">{notification.message}</span>
                </div>
            )}
        </div>
    );
}
