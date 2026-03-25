'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Bot, CheckCircle, XCircle, ArrowLeft, Cpu, Key, Radio, Lock, Server, BarChart3, Clock, Database } from 'lucide-react';
import Link from 'next/link';

const PROVIDERS = [
    { id: 'gemini', name: 'Google Gemini' },
    { id: 'groq', name: 'Groq' },
    { id: 'openrouter', name: 'OpenRouter' }
];

export default function AiConfigPage() {
    const router = useRouter();
    const [config, setConfig] = useState({
        enabled: false,
        provider: 'gemini',
        model: 'gemini-1.5-flash',
        systemInstruction: '',
        hasKey: { gemini: false, groq: false, openrouter: false }
    });
    
    const [newKeys, setNewKeys] = useState({ gemini: '', groq: '', openrouter: '' });
    const [showKeyInput, setShowKeyInput] = useState({ gemini: false, groq: false, openrouter: false });
    
    const [availableModels, setAvailableModels] = useState([]);
    const [loadingModels, setLoadingModels] = useState(false);
    
    // Telemetry State
    const [telemetryLogs, setTelemetryLogs] = useState([]);
    const [telemetryStats, setTelemetryStats] = useState(null);
    const [overallTotalTokens, setOverallTotalTokens] = useState(0);
    const [loadingTelemetry, setLoadingTelemetry] = useState(true);
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        fetchConfig();
        fetchTelemetry();
    }, []);

    // Re-fetch models whenever the provider changes, but only if we have the config loaded
    useEffect(() => {
        if (!loading) {
            fetchModels(config.provider);
        }
    }, [config.provider, loading, config.hasKey]);

    const fetchConfig = async () => {
        try {
            const res = await fetch('/api/admin/ai/config');
            const data = await res.json();
            if (data.success && data.data) {
                setConfig({
                    enabled: data.data.enabled || false,
                    provider: data.data.provider || 'gemini',
                    model: data.data.model || 'gemini-1.5-flash',
                    systemInstruction: data.data.systemInstruction || '',
                    hasKey: data.data.hasKey || { gemini: false, groq: false, openrouter: false }
                });
            }
        } catch (error) {
            console.error('Failed to fetch AI config:', error);
            showNotification(false, 'Failed to load configuration');
        } finally {
            setLoading(false);
        }
    };

    const fetchModels = async (providerId) => {
        setLoadingModels(true);
        try {
            const res = await fetch(`/api/admin/ai/models?provider=${providerId}`);
            const data = await res.json();
            if (data.success) {
                setAvailableModels(data.data || []);
            } else {
                setAvailableModels([]);
            }
        } catch (error) {
            console.error('Failed to fetch models:', error);
            setAvailableModels([]);
        } finally {
            setLoadingModels(false);
        }
    };

    const fetchTelemetry = async () => {
        setLoadingTelemetry(true);
        try {
            const res = await fetch('/api/admin/ai/logs');
            const data = await res.json();
            if (data.success) {
                setTelemetryLogs(data.data.logs || []);
                setTelemetryStats(data.data.stats || null);
                setOverallTotalTokens(data.data.overallTotalTokens || 0);
            }
        } catch (error) {
            console.error('Failed to fetch AI telemetry:', error);
        } finally {
            setLoadingTelemetry(false);
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
            // Only send keys that have been modified
            const keysToUpdate = {};
            if (newKeys.gemini) keysToUpdate.gemini = newKeys.gemini;
            if (newKeys.groq) keysToUpdate.groq = newKeys.groq;
            if (newKeys.openrouter) keysToUpdate.openrouter = newKeys.openrouter;

            const res = await fetch('/api/admin/ai/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    enabled: config.enabled,
                    provider: config.provider,
                    model: config.model,
                    systemInstruction: config.systemInstruction,
                    keys: keysToUpdate
                })
            });

            const data = await res.json();

            if (data.success) {
                setConfig(prev => ({ ...prev, hasKey: data.data.hasKey }));
                setNewKeys({ gemini: '', groq: '', openrouter: '' });
                setShowKeyInput({ gemini: false, groq: false, openrouter: false });
                showNotification(true, 'AI System Configuration Updated');
                
                // Refresh models just in case a new key was saved and it unlocks them
                fetchModels(config.provider);
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

    const handleProviderChange = (newProvider) => {
        let newModel = config.model;
        if (newProvider === 'gemini') newModel = 'gemini-1.5-flash';
        else if (newProvider === 'groq') newModel = 'llama-3.1-8b-instant';
        else if (newProvider === 'openrouter') newModel = 'anthropic/claude-3-haiku';

        setConfig({ ...config, provider: newProvider, model: newModel });
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
                        <p className="text-slate-400 mt-1">Configure multi-provider AI integration for automated tasks and intelligence.</p>
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

                {/* Provider Selection */}
                <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                    <h2 className="text-sm font-mono text-emerald-400 uppercase tracking-widest mb-6 flex items-center gap-3">
                        <Server size={14} /> Intelligence Provider
                        <div className="h-px bg-emerald-500/20 flex-grow" />
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
                        {PROVIDERS.map((provider) => (
                            <label
                                key={provider.id}
                                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all
                                    ${config.provider === provider.id
                                        ? 'bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                                        : 'bg-slate-900/30 border-white/5 hover:border-white/10'
                                    }
                                `}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-1.5 rounded-full border ${config.provider === provider.id ? 'border-emerald-400 bg-emerald-400' : 'border-slate-600'}`}>
                                        <div className="w-2 h-2 bg-slate-900 rounded-full" />
                                    </div>
                                    <input
                                        type="radio"
                                        name="provider"
                                        value={provider.id}
                                        checked={config.provider === provider.id}
                                        onChange={() => handleProviderChange(provider.id)}
                                        className="hidden"
                                    />
                                    <span className={`font-bold ${config.provider === provider.id ? 'text-emerald-300' : 'text-slate-300'}`}>
                                        {provider.name}
                                    </span>
                                </div>
                                {config.provider === provider.id && (
                                    <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">Active</span>
                                )}
                            </label>
                        ))}
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
                        {PROVIDERS.map((provider) => {
                            const isProviderActive = config.provider === provider.id;
                            const hasKeyValue = config.hasKey[provider.id];
                            const isShowingInput = showKeyInput[provider.id];
                            const inputValue = newKeys[provider.id];
                            
                            return (
                                <div key={provider.id} className={`p-4 rounded-xl border transition-all ${isProviderActive ? 'border-purple-500/30 bg-purple-500/5' : 'border-white/5 bg-slate-950/30 opacity-70 hover:opacity-100'}`}>
                                    <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-2">
                                        {provider.name} API Key
                                        {isProviderActive && <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />}
                                    </label>
                                    <div className="flex gap-3">
                                        {hasKeyValue && !isShowingInput ? (
                                            <div className="flex-1 bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center gap-3">
                                                <div className="p-1 bg-green-500/20 rounded text-green-400">
                                                    <Lock size={14} />
                                                </div>
                                                <span className="text-green-400 text-sm font-mono flex-1 truncate">
                                                    •••• •••• •••• •••• (Encrypted & Stored)
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowKeyInput(prev => ({ ...prev, [provider.id]: true }))}
                                                    className="shrink-0 px-3 py-1 bg-slate-900/50 hover:bg-slate-900 text-xs text-slate-300 rounded border border-white/10 transition-colors uppercase font-mono"
                                                >
                                                    Replace Key
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex-1 flex gap-2">
                                                <input
                                                    type="password"
                                                    value={inputValue}
                                                    onChange={(e) => setNewKeys(prev => ({ ...prev, [provider.id]: e.target.value }))}
                                                    placeholder={hasKeyValue ? "Enter new key to overwrite current..." : `Paste ${provider.name} API Key here...`}
                                                    className="flex-1 bg-slate-950/80 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-purple-500/50 outline-none text-sm font-mono placeholder:text-slate-600 focus:ring-1 focus:ring-purple-500/50 transition-all"
                                                />
                                                {isShowingInput && (
                                                    <button
                                                        type="button"
                                                        onClick={() => { 
                                                            setShowKeyInput(prev => ({ ...prev, [provider.id]: false })); 
                                                            setNewKeys(prev => ({ ...prev, [provider.id]: '' })); 
                                                        }}
                                                        className="px-4 text-slate-400 hover:text-white border border-white/10 hover:border-white/30 rounded-lg transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        <p className="text-[11px] text-slate-500 mt-2 font-mono ml-1">
                            Keys are encrypted using AES-256 before storage. Never shared with client-side code.
                        </p>
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
                        <div className="flex flex-col">
                            <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                                Active Model ({PROVIDERS.find(p => p.id === config.provider)?.name})
                                {loadingModels && <Loader2 className="animate-spin text-blue-400" size={12} />}
                            </label>

                            <div className="space-y-4">
                                {availableModels.length === 0 && !loadingModels ? (
                                    <div className="p-4 bg-slate-950/50 border border-white/5 rounded-lg text-amber-400/80 text-sm">
                                        No models dynamically loaded. Please ensure your API key is valid.
                                        <div className="mt-4">
                                            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2">Fallback Selection:</p>
                                            <input
                                                type="text"
                                                value={config.model}
                                                onChange={(e) => setConfig({ ...config, model: e.target.value })}
                                                placeholder="Fallback model ID..."
                                                className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 text-slate-200 outline-none text-sm font-mono focus:border-blue-500/50 transition-all"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <select
                                            value={config.model}
                                            onChange={(e) => setConfig({ ...config, model: e.target.value })}
                                            className="w-full appearance-none bg-slate-950/80 border border-white/10 rounded-xl p-4 pr-10 text-slate-200 outline-none text-sm font-mono focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all cursor-pointer shadow-inner"
                                        >
                                            {availableModels.map(model => (
                                                <option key={model.id} value={model.id}>
                                                    {model.name} {model.desc && `- ${model.desc}`}
                                                </option>
                                            ))}
                                            {/* Allow the selected model to persist if it somehow isn't in the list currently */}
                                            {!availableModels.some(m => m.id === config.model) && config.model && (
                                                <option value={config.model}>{config.model} (Custom/Fallback)</option>
                                            )}
                                        </select>
                                        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                                            <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M1 1.5L6 6.5L11 1.5" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        </div>
                                    </div>
                                )}
                                
                                {config.provider === 'openrouter' && (
                                    <div className="p-4 bg-slate-950/30 rounded-lg border border-white/5">
                                        <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
                                            <span className="text-blue-400">Pro Tip:</span> If your preferred OpenRouter model isn't listed, you can override the selection by saving an empty/invalid key, typing the exact model string (e.g. <span className="text-slate-200">anthropic/claude-3-opus</span>), and saving your key again.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-mono uppercase tracking-wider text-slate-500 mb-3">
                                System Persona
                            </label>
                            <textarea
                                value={config.systemInstruction}
                                onChange={(e) => setConfig({ ...config, systemInstruction: e.target.value })}
                                rows={8}
                                placeholder="Define how the AI should behave..."
                                className="w-full bg-slate-950/80 border border-white/10 rounded-xl p-4 text-slate-300 text-sm focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 outline-none resize-none placeholder:text-slate-700 custom-scrollbar shadow-inner"
                            />
                            <p className="text-[10px] text-slate-500 mt-2 font-mono ml-1">
                                This instruction is prepended to all system prompts to define base logic, tone, and behavior restrictions.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Action Footer */}
                <div className="flex justify-end pt-4 border-t border-white/5">
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-8 py-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all shadow-[0_0_20px_rgba(8,145,178,0.3)] hover:shadow-[0_0_30px_rgba(8,145,178,0.5)] disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase tracking-widest flex items-center gap-2"
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

            <div className="my-12">
                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent w-full" />
            </div>

            {/* AI Telemetry & Logs Section */}
            <div className="mb-12">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                    <Database className="text-cyan-400" /> AI Telemetry & Access Logs
                </h2>
                
                {loadingTelemetry ? (
                    <div className="p-12 flex flex-col items-center justify-center bg-slate-900/30 rounded-2xl border border-white/5">
                        <Loader2 className="animate-spin text-cyan-500 mb-4" size={32} />
                        <span className="text-slate-400 font-mono text-sm uppercase tracking-widest">Compiling Telemetry data...</span>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Token Stats Overview */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-slate-900/50 rounded-xl border border-white/10 p-6 flex flex-col justify-center">
                                <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 mb-1">Global Sum</span>
                                <span className="text-3xl font-bold text-white truncate">{overallTotalTokens.toLocaleString()}</span>
                                <span className="text-xs text-emerald-400 mt-2 flex items-center gap-1"><BarChart3 size={12} /> Total Tokens Used</span>
                            </div>
                            
                            {PROVIDERS.map(p => {
                                const statLine = telemetryStats?.[p.id];
                                return (
                                    <div key={p.id} className="bg-slate-900/30 rounded-xl border border-white/5 p-6 relative overflow-hidden">
                                        {/* Subtle colored shadow depending on provider */}
                                        <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-[40px] opacity-20 ${
                                            p.id === 'gemini' ? 'bg-blue-500' : p.id === 'groq' ? 'bg-emerald-500' : 'bg-purple-500'
                                        }`} />
                                        
                                        <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 mb-1">{p.name}</span>
                                        <span className="text-2xl font-bold text-slate-200 truncate block">
                                            {statLine ? statLine.total.toLocaleString() : '0'} <span className="text-xs font-normal text-slate-500">Tokens</span>
                                        </span>
                                        <div className="mt-3 flex items-center gap-3 text-[10px] font-mono text-slate-400">
                                            <span title="Input Tokens">IN: {statLine?.input?.toLocaleString() || 0}</span>
                                            <span title="Output Tokens">OUT: {statLine?.output?.toLocaleString() || 0}</span>
                                        </div>
                                        <span className="text-[10px] text-slate-600 block mt-2">Requests: {statLine?.requests || 0}</span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Recent History Table */}
                        <div className="bg-slate-900/50 rounded-2xl border border-white/10 overflow-hidden">
                            <div className="p-4 bg-slate-900/80 border-b border-white/5 flex items-center justify-between">
                                <span className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold">Recent Generation History (Last 50)</span>
                                <button onClick={fetchTelemetry} className="text-xs text-cyan-500 hover:text-cyan-400 font-mono flex items-center gap-2 transition-colors">
                                    <Clock size={12} /> Refresh
                                </button>
                            </div>
                            
                            {telemetryLogs.length === 0 ? (
                                <div className="p-12 text-center text-slate-500 text-sm font-mono">No telemetry records found.</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-950/50 text-[10px] uppercase font-mono tracking-widest text-slate-500">
                                                <th className="p-4 border-b border-white/5 font-normal">Timestamp</th>
                                                <th className="p-4 border-b border-white/5 font-normal">Provider / Mode</th>
                                                <th className="p-4 border-b border-white/5 font-normal max-w-xs">Data Snippet</th>
                                                <th className="p-4 border-b border-white/5 font-normal text-right">Tokens Used</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {telemetryLogs.map((log) => (
                                                <tr key={log._id} className="border-b border-white/5 last:border-0 hover:bg-slate-800/30 transition-colors">
                                                    <td className="p-4 text-xs text-slate-400 whitespace-nowrap">
                                                        {new Date(log.createdAt).toLocaleString()}
                                                    </td>
                                                    <td className="p-4 text-xs">
                                                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-1 ${
                                                            log.provider === 'gemini' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                                            log.provider === 'groq' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                            'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                                        }`}>
                                                            {log.provider}
                                                        </span>
                                                        <div className="text-[10px] text-slate-500 font-mono mt-1">{log.mode}</div>
                                                    </td>
                                                    <td className="p-4 max-w-xs">
                                                        <div className="text-xs text-slate-300 truncate mb-1">
                                                            <span className="text-slate-500 font-mono mr-2">P:</span>
                                                            {log.prompt || '<No prompt / Image input>'}
                                                        </div>
                                                        <div className="text-xs text-slate-400 truncate">
                                                            <span className="text-slate-500 font-mono mr-2">R:</span>
                                                            {log.response || '<No response>'}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <span className="text-sm font-bold text-slate-200 block">{log.totalTokens?.toLocaleString()}</span>
                                                        <span className="text-[10px] text-slate-500 font-mono">{log.inputTokens} IN / {log.outputTokens} OUT</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}
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
