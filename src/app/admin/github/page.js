'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Github, CheckCircle, XCircle } from 'lucide-react';

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

            console.log('Save response:', res.status, data);

            if (data.success) {
                alert('GitHub configuration saved successfully!');
            } else {
                alert(`Failed to save: ${data.error || data.message || 'Unknown error'}\\nStatus: ${res.status}`);
                console.error('Save failed:', data);
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
                    message: `Found: ${data.name || data.login}`,
                    avatar: data.avatar_url
                });
            } else {
                setTestResult({
                    success: false,
                    message: 'User not found'
                });
            }
        } catch (error) {
            setTestResult({
                success: false,
                message: 'Connection error'
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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    return (
        <div className="p-8 min-h-screen text-white w-full flex flex-col items-center">
            <div className="w-full max-w-3xl">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Github className="text-[var(--primary)]" />
                        GitHub Configuration
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-2">
                        Configure your GitHub username to display stats on the /github page
                    </p>
                </div>

                <form onSubmit={handleSave} className="w-full bg-gray-800 p-6 rounded-lg shadow-lg space-y-6">
                    {/* Username Input */}
                    <div>
                        <label className="block text-sm font-medium mb-2">GitHub Username</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={config.username}
                                onChange={(e) => setConfig({ ...config, username: e.target.value })}
                                placeholder="e.g., octocat"
                                className="flex-1 p-3 bg-gray-700 rounded border border-gray-600 focus:outline-none focus:border-[var(--primary)]"
                            />
                            <button
                                type="button"
                                onClick={testConnection}
                                disabled={testing || !config.username}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {testing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Test'}
                            </button>
                        </div>

                        {testResult && (
                            <div className={`mt-2 p-3 rounded flex items-center gap-2 ${testResult.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                }`}>
                                {testResult.success ? (
                                    <>
                                        <CheckCircle className="w-5 h-5" />
                                        {testResult.avatar && (
                                            <img src={testResult.avatar} alt="Avatar" className="w-8 h-8 rounded-full" />
                                        )}
                                        <span>{testResult.message}</span>
                                    </>
                                ) : (
                                    <>
                                        <XCircle className="w-5 h-5" />
                                        <span>{testResult.message}</span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Enable Toggle */}
                    <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded">
                        <div>
                            <p className="font-medium">Enable GitHub Stats Page</p>
                            <p className="text-sm text-[var(--text-secondary)]">
                                Make /github page publicly accessible
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={config.enabled}
                                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--primary)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
                        </label>
                    </div>

                    {/* Section Visibility Controls */}
                    <div className="bg-gray-700/30 rounded-lg p-4">
                        <h3 className="font-medium mb-3">Section Visibility</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { key: 'showProfile', label: 'Profile Card' },
                                { key: 'showStats', label: 'Statistics Cards' },
                                { key: 'showContributions', label: 'Contribution Graph' },
                                { key: 'showActivity', label: 'Recent Activity' },
                                { key: 'showRepositories', label: 'Repositories' },
                                { key: 'showLanguages', label: 'Languages' }
                            ].map(section => (
                                <label key={section.key} className="flex items-center gap-2 cursor-pointer hover:bg-gray-700/50 p-2 rounded">
                                    <input
                                        type="checkbox"
                                        checked={config.sections[section.key]}
                                        onChange={() => toggleSection(section.key)}
                                        className="w-4 h-4 rounded border-gray-600 text-[var(--primary)] focus:ring-[var(--primary)]"
                                    />
                                    <span className="text-sm">{section.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Save Buttons */}
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
                                'Save Configuration'
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => router.push('/admin')}
                            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded transition-colors"
                        >
                            Cancel
                        </button>
                        {config.enabled && config.username && (
                            <button
                                type="button"
                                onClick={() => window.open('/github', '_blank')}
                                className="ml-auto bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded transition-colors flex items-center gap-2"
                            >
                                <Github className="w-4 h-4" />
                                Preview Page
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
