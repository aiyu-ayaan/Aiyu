'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    Bell,
    CheckCircle2,
    XCircle,
    Activity,
    Info,
    RefreshCw,
    AlertTriangle,
    Save,
    Send,
    ToggleLeft,
    ToggleRight,
    MessageSquare,
    ChevronLeft,
    Settings,
    ShieldAlert
} from 'lucide-react';

export default function NotificationConfigPage() {
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testingChannel, setTestingChannel] = useState(null); // 'ntfy' | 'telegram' | 'discord' | null
    const [message, setMessage] = useState(null);

    // Form inputs
    const [globalEnabled, setGlobalEnabled] = useState(false);
    const [notifyOnContact, setNotifyOnContact] = useState(false);

    // ntfy states
    const [ntfyEnabled, setNtfyEnabled] = useState(false);
    const [ntfyServer, setNtfyServer] = useState('https://ntfy.sh');
    const [ntfyTopic, setNtfyTopic] = useState('');
    const [ntfyToken, setNtfyToken] = useState('');

    // Telegram states
    const [telegramEnabled, setTelegramEnabled] = useState(false);
    const [telegramBotToken, setTelegramBotToken] = useState('');
    const [telegramChatId, setTelegramChatId] = useState('');

    // Discord states
    const [discordEnabled, setDiscordEnabled] = useState(false);
    const [discordWebhookUrl, setDiscordWebhookUrl] = useState('');

    const showMessage = (type, text) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 5000);
    };

    const fetchConfig = async (showLoader = false) => {
        if (showLoader) setLoading(true);
        try {
            const res = await fetch('/api/admin/notifications');
            const data = await res.json();
            if (data.success && data.data) {
                const c = data.data;
                setConfig(c);
                setGlobalEnabled(c.enabled || false);
                setNotifyOnContact(c.notifyOnContactMessage || false);

                // ntfy
                setNtfyEnabled(c.ntfy?.enabled || false);
                setNtfyServer(c.ntfy?.serverUrl || 'https://ntfy.sh');
                setNtfyTopic(c.ntfy?.topic || '');
                setNtfyToken(c.ntfy?.token || '');

                // Telegram
                setTelegramEnabled(c.telegram?.enabled || false);
                setTelegramBotToken(c.telegram?.botToken || '');
                setTelegramChatId(c.telegram?.chatId || '');

                // Discord
                setDiscordEnabled(c.discord?.enabled || false);
                setDiscordWebhookUrl(c.discord?.webhookUrl || '');
            } else {
                showMessage('error', data.error || 'Failed to retrieve notification configurations.');
            }
        } catch (error) {
            showMessage('error', 'Network error. Failed to connect to configurations API.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfig(true);
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        showMessage('info', 'Saving settings...');

        const payload = {
            enabled: globalEnabled,
            notifyOnContactMessage: notifyOnContact,
            ntfy: {
                enabled: ntfyEnabled,
                serverUrl: ntfyServer,
                topic: ntfyTopic,
                token: ntfyToken
            },
            telegram: {
                enabled: telegramEnabled,
                botToken: telegramBotToken,
                chatId: telegramChatId
            },
            discord: {
                enabled: discordEnabled,
                webhookUrl: discordWebhookUrl
            }
        };

        try {
            const res = await fetch('/api/admin/notifications', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                setConfig(data.data);
                showMessage('success', 'Notification configurations updated successfully.');
            } else {
                showMessage('error', data.error || 'Failed to save settings.');
            }
        } catch (error) {
            showMessage('error', 'Communication failure. Could not commit configurations.');
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async (channel) => {
        setTestingChannel(channel);
        showMessage('info', `Dispatching integration test to ${channel.toUpperCase()}...`);

        const payload = {
            channel,
            ntfy: {
                serverUrl: ntfyServer,
                topic: ntfyTopic,
                token: ntfyToken
            },
            telegram: {
                botToken: telegramBotToken,
                chatId: telegramChatId
            },
            discord: {
                webhookUrl: discordWebhookUrl
            }
        };

        try {
            const res = await fetch('/api/admin/notifications/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                showMessage('success', data.message || `Test message dispatched successfully to ${channel.toUpperCase()}!`);
            } else {
                alert(`Test Failed: ${data.error}`);
                showMessage('error', data.error || 'Integration test failed.');
            }
        } catch (error) {
            showMessage('error', 'Network test failed. Verify connection settings.');
        } finally {
            setTestingChannel(null);
        }
    };

    const isConfigured = config && config.enabled && (
        (config.ntfy?.enabled && config.ntfy?.topic) ||
        (config.telegram?.enabled && config.telegram?.botToken && config.telegram?.chatId) ||
        (config.discord?.enabled && config.discord?.webhookUrl)
    );

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto min-h-screen text-slate-200">
            {/* Nav */}
            <div className="mb-10">
                <Link href="/admin" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors mb-4 text-sm font-mono opacity-60 hover:opacity-100">
                    <ChevronLeft size={16} /> BACK_TO_COMMAND_CENTER
                </Link>
                <div className="flex items-start md:items-center justify-between flex-col md:flex-row gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-pink-500/10 rounded-xl border border-pink-500/20 text-pink-400">
                            <Bell className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-white mb-1 tracking-tight">Notification System</h1>
                            <p className="text-slate-400 font-medium">Orchestrate live system alerts and link automated channels to Telegram, Discord, or ntfy.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Notification banner */}
            {message && (
                <div className={`mb-8 rounded-2xl border px-4 py-3.5 text-sm flex items-center gap-2.5 transition-all duration-300 ${
                    message.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-300' :
                    message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' :
                    'bg-cyan-500/10 border-cyan-500/20 text-cyan-300'
                }`}>
                    <Info size={16} className="shrink-0" />
                    <span className="font-medium">{message.text}</span>
                </div>
            )}

            {loading ? (
                <div className="flex min-h-[30vh] items-center justify-center">
                    <div className="text-sm font-mono uppercase tracking-[0.24em] text-pink-400 flex items-center gap-3">
                        <RefreshCw className="animate-spin" size={18} /> Loading settings configuration...
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSave} className="space-y-8">
                    {/* Status Overview Card */}
                    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/40 p-6 backdrop-blur-md">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 rounded-full blur-[60px] pointer-events-none" />
                        
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-1">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Settings className="w-5 h-5 text-pink-400" />
                                    Master Integration Controller
                                </h2>
                                <p className="text-slate-400 text-xs">Activate or suspend all channel notifications globally.</p>
                            </div>
                            
                            <div className="flex items-center gap-6">
                                {/* State Badge */}
                                <div className="text-right">
                                    <span className="text-[10px] font-mono text-slate-500 block uppercase tracking-widest">Gateway Status</span>
                                    {isConfigured ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono mt-1">
                                            ACTIVE & ONLINE
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono mt-1">
                                            NOT CONFIGURATED
                                        </span>
                                    )}
                                </div>

                                {/* Global Switch Gear */}
                                <button
                                    type="button"
                                    onClick={() => setGlobalEnabled(!globalEnabled)}
                                    className="text-slate-400 hover:text-white transition shrink-0"
                                >
                                    {globalEnabled ? (
                                        <ToggleRight className="w-12 h-12 text-emerald-400" />
                                    ) : (
                                        <ToggleLeft className="w-12 h-12 text-slate-600" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Integrated Channel Modules */}
                    <div className="grid gap-8 lg:grid-cols-3">
                        
                        {/* 1. ntfy Channel Card */}
                        <div className="rounded-3xl border border-white/10 bg-slate-900/30 p-6 backdrop-blur-md flex flex-col justify-between hover:border-pink-500/20 transition duration-300">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-white">ntfy Push Service</h3>
                                        <span className="text-[10px] font-bold text-pink-400 font-mono uppercase tracking-wider block mt-1">ntfy.sh Integration</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setNtfyEnabled(!ntfyEnabled)}
                                        className="text-slate-400 hover:text-white transition"
                                    >
                                        {ntfyEnabled ? (
                                            <ToggleRight className="w-9 h-9 text-emerald-400" />
                                        ) : (
                                            <ToggleLeft className="w-9 h-9 text-slate-600" />
                                        )}
                                    </button>
                                </div>
                                <p className="text-slate-400 text-xs mb-6 leading-relaxed">
                                    Send instant push alerts directly to your phone or desktop via the ntfy app. Totally secure and super fast.
                                </p>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Server URL</label>
                                        <input
                                            type="url"
                                            required={ntfyEnabled}
                                            disabled={!ntfyEnabled}
                                            value={ntfyServer}
                                            onChange={(e) => setNtfyServer(e.target.value)}
                                            className="w-full bg-slate-950 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl px-4 py-2 text-xs text-slate-200 focus:border-pink-500 outline-none transition font-mono"
                                            placeholder="https://ntfy.sh"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Topic Name</label>
                                        <input
                                            type="text"
                                            required={ntfyEnabled}
                                            disabled={!ntfyEnabled}
                                            value={ntfyTopic}
                                            onChange={(e) => setNtfyTopic(e.target.value)}
                                            className="w-full bg-slate-950 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl px-4 py-2 text-xs text-slate-200 focus:border-pink-500 outline-none transition font-mono"
                                            placeholder="my-secret-topic"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Access Token (Optional)</label>
                                        <input
                                            type="password"
                                            disabled={!ntfyEnabled}
                                            value={ntfyToken}
                                            onChange={(e) => setNtfyToken(e.target.value)}
                                            className="w-full bg-slate-950 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl px-4 py-2 text-xs text-slate-200 focus:border-pink-500 outline-none transition font-mono"
                                            placeholder="••••••••••••••••"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                disabled={!ntfyEnabled || testingChannel === 'ntfy'}
                                onClick={() => handleTest('ntfy')}
                                className="mt-6 w-full py-2 bg-pink-500/10 hover:bg-pink-500/20 disabled:opacity-30 text-pink-400 rounded-xl text-xs font-bold uppercase tracking-wider transition border border-pink-500/10 flex items-center justify-center gap-1.5"
                            >
                                {testingChannel === 'ntfy' ? (
                                    <>
                                        <RefreshCw size={12} className="animate-spin" /> Dispatching...
                                    </>
                                ) : (
                                    <>
                                        <Send size={12} /> Live Test Connection
                                    </>
                                )}
                            </button>
                        </div>

                        {/* 2. Telegram Channel Card */}
                        <div className="rounded-3xl border border-white/10 bg-slate-900/30 p-6 backdrop-blur-md flex flex-col justify-between hover:border-pink-500/20 transition duration-300">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-white">Telegram Bot</h3>
                                        <span className="text-[10px] font-bold text-pink-400 font-mono uppercase tracking-wider block mt-1">Telegram Messenger</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setTelegramEnabled(!telegramEnabled)}
                                        className="text-slate-400 hover:text-white transition"
                                    >
                                        {telegramEnabled ? (
                                            <ToggleRight className="w-9 h-9 text-emerald-400" />
                                        ) : (
                                            <ToggleLeft className="w-9 h-9 text-slate-600" />
                                        )}
                                    </button>
                                </div>
                                <p className="text-slate-400 text-xs mb-6 leading-relaxed">
                                    Send formatted markdown messages to your private Telegram chat or channel instantly using a Telegram Bot.
                                </p>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Bot Token</label>
                                        <input
                                            type="password"
                                            required={telegramEnabled}
                                            disabled={!telegramEnabled}
                                            value={telegramBotToken}
                                            onChange={(e) => setTelegramBotToken(e.target.value)}
                                            className="w-full bg-slate-950 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl px-4 py-2 text-xs text-slate-200 focus:border-pink-500 outline-none transition font-mono"
                                            placeholder="123456789:ABCdefGhI..."
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Chat ID</label>
                                        <input
                                            type="text"
                                            required={telegramEnabled}
                                            disabled={!telegramEnabled}
                                            value={telegramChatId}
                                            onChange={(e) => setTelegramChatId(e.target.value)}
                                            className="w-full bg-slate-950 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl px-4 py-2 text-xs text-slate-200 focus:border-pink-500 outline-none transition font-mono"
                                            placeholder="e.g. 987654321"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                disabled={!telegramEnabled || testingChannel === 'telegram'}
                                onClick={() => handleTest('telegram')}
                                className="mt-6 w-full py-2 bg-pink-500/10 hover:bg-pink-500/20 disabled:opacity-30 text-pink-400 rounded-xl text-xs font-bold uppercase tracking-wider transition border border-pink-500/10 flex items-center justify-center gap-1.5"
                            >
                                {testingChannel === 'telegram' ? (
                                    <>
                                        <RefreshCw size={12} className="animate-spin" /> Dispatching...
                                    </>
                                ) : (
                                    <>
                                        <Send size={12} /> Live Test Connection
                                    </>
                                )}
                            </button>
                        </div>

                        {/* 3. Discord Channel Card */}
                        <div className="rounded-3xl border border-white/10 bg-slate-900/30 p-6 backdrop-blur-md flex flex-col justify-between hover:border-pink-500/20 transition duration-300">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-white">Discord Webhook</h3>
                                        <span className="text-[10px] font-bold text-pink-400 font-mono uppercase tracking-wider block mt-1">Discord Embeds</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setDiscordEnabled(!discordEnabled)}
                                        className="text-slate-400 hover:text-white transition"
                                    >
                                        {discordEnabled ? (
                                            <ToggleRight className="w-9 h-9 text-emerald-400" />
                                        ) : (
                                            <ToggleLeft className="w-9 h-9 text-slate-600" />
                                        )}
                                    </button>
                                </div>
                                <p className="text-slate-400 text-xs mb-6 leading-relaxed">
                                    Deliver stylized, cyan embeds to your Discord channel instantly using standard server webhook URLs.
                                </p>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Webhook URL</label>
                                        <input
                                            type="url"
                                            required={discordEnabled}
                                            disabled={!discordEnabled}
                                            value={discordWebhookUrl}
                                            onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                                            className="w-full bg-slate-950 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl px-4 py-2 text-xs text-slate-200 focus:border-pink-500 outline-none transition font-mono"
                                            placeholder="https://discord.com/api/webhooks/..."
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                disabled={!discordEnabled || testingChannel === 'discord'}
                                onClick={() => handleTest('discord')}
                                className="mt-6 w-full py-2 bg-pink-500/10 hover:bg-pink-500/20 disabled:opacity-30 text-pink-400 rounded-xl text-xs font-bold uppercase tracking-wider transition border border-pink-500/10 flex items-center justify-center gap-1.5"
                            >
                                {testingChannel === 'discord' ? (
                                    <>
                                        <RefreshCw size={12} className="animate-spin" /> Dispatching...
                                    </>
                                ) : (
                                    <>
                                        <Send size={12} /> Live Test Connection
                                    </>
                                )}
                            </button>
                        </div>

                    </div>

                    {/* Linking & Triggers Options */}
                    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/40 p-6 backdrop-blur-md">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-[60px] pointer-events-none" />
                        
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-1">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5 text-cyan-400" />
                                    Inbox & Contact Notifications
                                </h2>
                                <p className="text-slate-400 text-xs">Link instant alerts automatically to your portfolio's public contact page message submissions.</p>
                            </div>
                            
                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <span className="text-[10px] font-mono text-slate-500 block uppercase tracking-widest">Inbox Link Status</span>
                                    {notifyOnContact ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono mt-1">
                                            NOTIFY_ON_SUBMISSION
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-500/10 border border-white/5 text-slate-400 font-mono mt-1">
                                            DATABASE_SAVE_ONLY
                                        </span>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setNotifyOnContact(!notifyOnContact)}
                                    className="text-slate-400 hover:text-white transition shrink-0"
                                >
                                    {notifyOnContact ? (
                                        <ToggleRight className="w-12 h-12 text-cyan-400" />
                                    ) : (
                                        <ToggleLeft className="w-12 h-12 text-slate-600" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 border-t border-white/5 pt-6 mt-6">
                        <Link
                            href="/admin"
                            className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={saving}
                            className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-emerald-950/20 hover:shadow-emerald-950/40"
                        >
                            {saving ? (
                                <>
                                    <RefreshCw className="animate-spin" size={16} /> Saving...
                                </>
                            ) : (
                                <>
                                    <Save size={16} /> Save Configurations
                                </>
                            )}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
