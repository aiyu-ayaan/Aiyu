'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Github, CheckCircle, XCircle, ArrowLeft, BarChart2, Book, Code, Globe, User, EyeOff, Lock, Unlock, Search } from 'lucide-react';
import Link from 'next/link';

export default function GitHubConfigPage() {
    const router = useRouter();
    const [config, setConfig] = useState({
        username: '',
        enabled: false,
        includePrivate: false,
        sections: {
            showProfile: true,
            showStats: true,
            showContributions: true,
            showActivity: true,
            showRepositories: true,
            showLanguages: true
        },
        hiddenRepos: [],
        hasToken: false
    });
    const [newToken, setNewToken] = useState('');
    const [showTokenInput, setShowTokenInput] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [tokenStatus, setTokenStatus] = useState(null);

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
                    sections: data.data.sections || config.sections,
                    hiddenRepos: data.data.hiddenRepos || [],
                    includePrivate: data.data.includePrivate || false,
                    hasToken: data.data.hasToken || false
                });
                setTokenStatus(data.data.tokenStatus);
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
                body: JSON.stringify({
                    ...config,
                    githubToken: newToken || undefined // Only send if changed
                })
            });

            const data = await res.json();

            if (data.success) {
                showNotification(true, 'System Updated Successfully');
            } else {
                showNotification(false, `Failed to save: ${data.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Save error:', error);
            showNotification(false, 'Failed to save configuration: ' + error.message);
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

    const [availableRepos, setAvailableRepos] = useState([]);
    const [loadingRepos, setLoadingRepos] = useState(false);
    const [notification, setNotification] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const showNotification = (success, message) => {
        setNotification({ success, message });
        setTimeout(() => setNotification(null), 3000);
    };

    const fetchRepos = async () => {
        if (!config.username) return;
        setLoadingRepos(true);
        try {
            // Fetch via our backend to securely use the token and handle private repos
            const res = await fetch(`/api/github/config?mode=repos&includePrivate=${config.includePrivate}`);
            if (res.ok) {
                const data = await res.json();
                if (data.success && Array.isArray(data.data)) {
                    setAvailableRepos(data.data);
                }
            }
        } catch (error) {
            console.error('Failed to fetch repos:', error);
        } finally {
            setLoadingRepos(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (config.username) {
                fetchRepos();
            }
        }, 500); // Debounce to prevent API spam while typing username

        return () => clearTimeout(timer);
    }, [config.username, config.includePrivate]);

    // Re-writing fetchRepos to use a new backend-proxied route logic or just reusing the client-side limitation for now?
    // User wants to SEE private repos in the list to hide/unhide them.
    // The previous implementation d:\VS Code\Next JS\portfolio\src\app\admin\github\page.js:127 was fetching directly from GitHub.
    // I need to proxy this request through my backend to use the GITHUB_TOKEN environment variable.

    // Let's create a simplified fetchRepos that uses a new API route or modifies 'fetchConfig' to include repo list?
    // No, let's create a dedicated small logic. 

    // Actually, I can just use the server action pattern or a simple new route. 
    // Let's try to fetch via the stats endpoint? No, that computes too much.
    // Let's add a `repos` mode to the config endpoint.


    const toggleRepoVisibility = (repoName) => {
        setConfig(prev => {
            const hidden = new Set(prev.hiddenRepos || []);
            if (hidden.has(repoName)) {
                hidden.delete(repoName);
            } else {
                hidden.add(repoName);
            }
            return {
                ...prev,
                hiddenRepos: Array.from(hidden)
            };
        });
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

            {/* Token Status Message */}
            {tokenStatus && (
                <div className={`mb-8 p-4 rounded-xl border flex items-center gap-3 ${tokenStatus === 'valid'
                    ? 'bg-green-500/10 border-green-500/20 text-green-400'
                    : tokenStatus === 'invalid'
                        ? 'bg-red-500/10 border-red-500/20 text-red-400'
                        : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                    }`}>
                    {tokenStatus === 'valid' ? (
                        <CheckCircle className="w-5 h-5 shrink-0" />
                    ) : tokenStatus === 'invalid' ? (
                        <XCircle className="w-5 h-5 shrink-0" />
                    ) : (
                        <BarChart2 className="w-5 h-5 shrink-0" />
                    )}
                    <div>
                        <p className="font-bold text-sm">
                            {tokenStatus === 'valid' ? 'System Optimized' : tokenStatus === 'invalid' ? 'Token Error' : 'Optimization Available'}
                        </p>
                        <p className="text-xs font-mono mt-1 opacity-90">
                            {tokenStatus === 'valid'
                                ? 'Secure Token is active. Full API rate limits and private data access enabled.'
                                : tokenStatus === 'invalid'
                                    ? 'Provided Token is invalid.'
                                    : 'For full stats and higher limits, add a Personal Access Token below.'}
                        </p>
                    </div>
                </div>
            )}

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

                        {/* Token Input Section */}
                        <div>
                            <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-2">Detailed Access Token (Optional)</label>
                            <div className="flex gap-2 items-center">
                                {config.hasToken && !showTokenInput ? (
                                    <div className="flex-1 bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center gap-2">
                                        <Lock className="w-4 h-4 text-green-400" />
                                        <span className="text-green-400 text-sm font-mono flex-1">Securely key stored in system</span>
                                        <button
                                            type="button"
                                            onClick={() => setShowTokenInput(true)}
                                            className="text-xs text-green-300 hover:text-green-200 underline"
                                        >
                                            Update Key
                                        </button>
                                    </div>
                                ) : (
                                    <input
                                        type="password"
                                        value={newToken}
                                        onChange={(e) => setNewToken(e.target.value)}
                                        placeholder={config.hasToken ? "Enter new token to overwrite..." : "ghp_xxxxxxxxxxxx"}
                                        className="flex-1 bg-slate-950/50 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-purple-500/50 outline-none text-sm font-mono placeholder:text-slate-600"
                                    />
                                )}

                                {showTokenInput && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowTokenInput(false);
                                            setNewToken('');
                                        }}
                                        className="text-slate-400 hover:text-white"
                                    >
                                        <XCircle className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                            <p className="text-[10px] text-slate-500 mt-2 font-mono">
                                Token is encrypted before storage. Used for higher rate limits and private options.
                            </p>
                        </div>

                        {/* Connection Status - Replacing Public Access Toggle */}
                        <div className="flex flex-col justify-center">
                            <div className="flex items-center justify-between p-4 bg-slate-900/30 border border-white/10 rounded-xl hover:border-purple-500/30 transition-colors">
                                <div>
                                    <div className="text-sm font-bold text-slate-200 mb-1 flex items-center gap-2">
                                        Private Repos
                                        {config.includePrivate ? <Lock className="w-3 h-3 text-amber-400" /> : <Unlock className="w-3 h-3 text-slate-500" />}
                                    </div>
                                    <div className="text-xs text-slate-500 font-mono">Include private contributions</div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={config.includePrivate}
                                        onChange={(e) => setConfig({ ...config, includePrivate: e.target.checked })}
                                        disabled={!config.hasToken}
                                        className="sr-only peer"
                                    />
                                    <div className={`w-11 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500 ${!config.hasToken ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                                </label>
                            </div>
                            {!config.hasToken && (
                                <p className="text-[10px] text-slate-500 mt-2 font-mono px-1">
                                    * Requires valid Access Token
                                </p>
                            )}
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

                {/* Repo Visibility */}
                <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                    <div className="flex flex-col gap-4 mb-6 relative z-10">
                        <div className="flex justify-between items-center">
                            <h2 className="text-sm font-mono text-blue-500/70 uppercase tracking-widest flex items-center gap-4">
                                Repository Filters
                                <div className="h-px w-20 bg-blue-500/10" />
                            </h2>
                            <span className="text-xs text-slate-500 font-mono">
                                {config.hiddenRepos?.length || 0} HIDDEN
                            </span>
                        </div>

                        {/* Search Bar */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search repositories..."
                                className="w-full bg-slate-900/50 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500/30 transition-colors placeholder:text-slate-600"
                            />
                        </div>
                    </div>

                    <div className="relative z-10">
                        {loadingRepos ? (
                            <div className="flex items-center justify-center p-8 text-slate-500 gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-sm font-mono">LOADING_REPOSITORIES...</span>
                            </div>
                        ) : availableRepos.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                                {availableRepos
                                    .filter(repo => repo.toLowerCase().includes(searchQuery.toLowerCase()))
                                    .map((repo) => {
                                        const isHidden = config.hiddenRepos?.includes(repo);
                                        return (
                                            <label key={repo} className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${isHidden
                                                ? 'bg-red-500/10 border-red-500/30 opacity-75'
                                                : 'bg-slate-900/30 border-white/5 hover:border-white/10'
                                                }`}>
                                                <div className={`p-1.5 rounded-md ${isHidden ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/10 text-blue-400'
                                                    }`}>
                                                    {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Book className="w-3.5 h-3.5" />}
                                                </div>
                                                <span className={`text-sm font-mono truncate flex-1 ${isHidden ? 'text-red-300 line-through decoration-red-500/50' : 'text-slate-300'}`}>
                                                    {repo}
                                                </span>
                                                <input
                                                    type="checkbox"
                                                    checked={isHidden}
                                                    onChange={() => toggleRepoVisibility(repo)}
                                                    className="hidden"
                                                />
                                                {isHidden && <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider">HIDDEN</span>}
                                            </label>
                                        );
                                    })}
                            </div>
                        ) : (
                            <div className="text-center p-8 text-slate-500 font-mono text-sm">
                                NO_PUBLIC_REPOSITORIES_FOUND
                            </div>
                        )}
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
