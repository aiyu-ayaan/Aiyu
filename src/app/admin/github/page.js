'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Github, CheckCircle, XCircle, ArrowLeft, BarChart2, Book, Code, Globe, User } from 'lucide-react';
import Link from 'next/link';

export default function GitHubConfigPage() {
    const router = useRouter();
    const [config, setConfig] = useState({
        username: '',
        enabled: false,
        sections: {
            showProfile: true,
            showStats: true,
            showContributions: true,
            showActivity: true,
            showRepositories: true,
            showLanguages: true
        }
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await fetch('/api/github/config');
            const data = await res.json();
            if (data.success && data.data) {
                setConfig({
                    ...data.data,
                    sections: data.data.sections || config.sections
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
            const res = await fetch('/api/github/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });

            const data = await res.json();

            if (data.success) {
                // Success feedback handled by UI state if needed, or simple alert
            } else {
                alert(`Failed to save: ${data.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Save error:', error);
            alert('Failed to save configuration: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const testConnection = async () => {
        if (!config.username) {
            alert('Please enter a GitHub username first');
            return;
        }

        setTesting(true);
        setTestResult(null);

        try {
            const res = await fetch(`https://api.github.com/users/${config.username}`);
            if (res.ok) {
                const data = await res.json();
                setTestResult({
                    success: true,
                    message: `Verified: ${data.name || data.login}`,
                    avatar: data.avatar_url
                });
            } else {
                setTestResult({
                    success: false,
                    message: 'User identity not found'
                });
            }
        } catch (error) {
            setTestResult({
                success: false,
                message: 'Connection failure'
            });
        } finally {
            setTesting(false);
        }
    };

    const toggleSection = (section) => {
        setConfig(prev => ({
            ...prev,
            sections: {
                ...prev.sections,
                [section]: !prev.sections[section]
            }
        }));
    };

    const sectionIcons = {
        showProfile: User,
        showStats: BarChart2,
        showContributions: Globe,
        showActivity: CheckCircle,
        showRepositories: Book,
        showLanguages: Code,
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <span className="font-mono text-cyan-400 animate-pulse">CONNECTING_TO_GITHUB_HUB...</span>
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
                <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">GitHub Integration</h1>
                <p className="text-slate-400">Configure repositories, activity feeds, and statistical displays.</p>
            </div>

            <form onSubmit={handleSave} className="space-y-8">

                {/* Connection Settings */}
                <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                    <div className="flex justify-between items-center mb-8 relative z-10">
                        <h2 className="text-sm font-mono text-purple-500/70 uppercase tracking-widest flex items-center gap-4">
                            Connection Protocols
                            <div className="h-px w-20 bg-purple-500/10" />
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                        {/* Username Configuration */}
                        <div>
                            <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-2">Target Username</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={config.username}
                                    onChange={(e) => setConfig({ ...config, username: e.target.value })}
                                    placeholder="e.g. octocat"
                                    className="flex-1 bg-slate-950/50 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-purple-500/50 outline-none text-sm font-mono"
                                />
                                <button
                                    type="button"
                                    onClick={testConnection}
                                    disabled={testing || !config.username}
                                    className="px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded-lg transition-colors disabled:opacity-50 text-xs font-mono uppercase tracking-wide"
                                >
                                    {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ping'}
                                </button>
                            </div>

                            {testResult && (
                                <div className={`mt-4 p-3 rounded-lg border flex items-center gap-3 ${testResult.success ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                    {testResult.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                    <span className="text-xs font-mono">{testResult.message}</span>
                                    {testResult.avatar && (
                                        <img src={testResult.avatar} alt="Avatar" className="w-6 h-6 rounded-full border border-white/10 ml-auto" />
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Status Toggle */}
                        <div className="flex flex-col justify-center">
                            <div className="flex items-center justify-between p-4 bg-slate-900/30 border border-white/10 rounded-xl hover:border-purple-500/30 transition-colors">
                                <div>
                                    <div className="text-sm font-bold text-slate-200 mb-1">Public Access</div>
                                    <div className="text-xs text-slate-500 font-mono">/github route visibility</div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={config.enabled}
                                        onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Module Layout */}
                <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                    <div className="flex justify-between items-center mb-8 relative z-10">
                        <h2 className="text-sm font-mono text-green-500/70 uppercase tracking-widest flex items-center gap-4">
                            Module Visibility
                            <div className="h-px w-20 bg-green-500/10" />
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
                        {Object.entries(config.sections).map(([key, value]) => {
                            const Icon = sectionIcons[key] || CheckCircle;
                            return (
                                <label key={key} className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer ${value ? 'bg-green-500/10 border-green-500/30' : 'bg-slate-900/30 border-white/5 hover:border-white/10'}`}>
                                    <div className={`p-2 rounded-lg ${value ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-slate-500'}`}>
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1">
                                        <div className={`text-sm font-bold ${value ? 'text-green-300' : 'text-slate-400'}`}>
                                            {key.replace(/show/, '').replace(/([A-Z])/g, ' $1').trim()}
                                        </div>
                                    </div>
                                    <div className="relative inline-flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={value}
                                            onChange={() => toggleSection(key)}
                                            className="sr-only peer"
                                        />
                                        <div className={`w-8 h-4 rounded-full transition-colors ${value ? 'bg-green-500' : 'bg-slate-700'}`}></div>
                                        <div className={`absolute left-0.5 top-0.5 bg-white w-3 h-3 rounded-full transition-transform ${value ? 'translate-x-4' : ''}`}></div>
                                    </div>
                                </label>
                            );
                        })}
                    </div>
                </div>

                {/* Action Footer */}
                <div className="flex justify-end gap-4 pt-4 border-t border-white/5">
                    {config.enabled && config.username && (
                        <button
                            type="button"
                            onClick={() => window.open('/github', '_blank')}
                            className="px-6 py-2 rounded bg-white/5 hover:bg-white/10 text-slate-400 transition-colors text-sm font-medium flex items-center gap-2"
                        >
                            <Globe className="w-4 h-4" />
                            PREVIEW_NODE
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-8 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] disabled:opacity-50 disabled:cursor-not-allowed text-sm tracking-wide flex items-center gap-2"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                SAVING_CONFIG...
                            </>
                        ) : (
                            'UPDATE_SYSTEM'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
