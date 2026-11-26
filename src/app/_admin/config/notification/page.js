'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    FaFloppyDisk,
    FaPaperPlane,
    FaSpinner,
} from 'react-icons/fa6';
import { Badge, Field, Loading, PageHeader, Panel } from '@/app/components/admin/ui';
import '@/app/styles/admin-system.css';

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
        } catch {
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
                token: ntfyToken,
            },
            telegram: {
                enabled: telegramEnabled,
                botToken: telegramBotToken,
                chatId: telegramChatId,
            },
            discord: {
                enabled: discordEnabled,
                webhookUrl: discordWebhookUrl,
            },
        };

        try {
            const res = await fetch('/api/admin/notifications', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (data.success) {
                setConfig(data.data);
                showMessage('success', 'Changes saved.');
            } else {
                showMessage('error', data.error || 'Failed to save settings.');
            }
        } catch {
            showMessage('error', 'Could not save notification settings.');
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async (channel) => {
        setTestingChannel(channel);
        showMessage('info', `Sending test alert to ${channel}...`);

        const payload = {
            channel,
            ntfy: {
                serverUrl: ntfyServer,
                topic: ntfyTopic,
                token: ntfyToken,
            },
            telegram: {
                botToken: telegramBotToken,
                chatId: telegramChatId,
            },
            discord: {
                webhookUrl: discordWebhookUrl,
            },
        };

        try {
            const res = await fetch('/api/admin/notifications/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (data.success) {
                showMessage('success', data.message || `Test alert sent to ${channel}.`);
            } else {
                showMessage('error', data.error ? `Test failed: ${data.error}` : 'Integration test failed.');
            }
        } catch {
            showMessage('error', 'Network test failed. Verify connection settings.');
        } finally {
            setTestingChannel(null);
        }
    };

    const isConfigured =
        config &&
        config.enabled &&
        ((config.ntfy?.enabled && config.ntfy?.topic) ||
            (config.telegram?.enabled && config.telegram?.botToken && config.telegram?.chatId) ||
            (config.discord?.enabled && config.discord?.webhookUrl));

    return (
        <div className="adm-page">
            <PageHeader
                command="notify"
                title="Notification channels"
                description="Send system alerts and contact form notifications to ntfy, Telegram, or Discord."
            />

            {message && (
                <div
                    role="alert"
                    className={`adm-notice ${
                        message.type === 'error'
                            ? 'adm-notice-error'
                            : message.type === 'success'
                            ? 'adm-notice-ok'
                            : 'adm-notice-info'
                    }`}
                >
                    {message.text}
                </div>
            )}

            {loading ? (
                <section className="adm-panel">
                    <Loading label="Loading notification settings" rows={6} />
                </section>
            ) : (
                <form onSubmit={handleSave} className="adm-split">
                    <div className="adm-stack">
                        <Panel title="Alert rules" flush>
                            <ul className="adm-list">
                                <li className="adm-row justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                        <p className="flex flex-wrap items-center gap-2">
                                            <span className="font-semibold text-[var(--text-bright)]">
                                                Enable notifications
                                            </span>
                                            <Badge tone={isConfigured ? 'ok' : 'warn'}>
                                                {isConfigured ? 'Active' : 'Not configured'}
                                            </Badge>
                                        </p>
                                        <p className="adm-help">
                                            Master switch for all outgoing notification channels.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={globalEnabled}
                                        aria-label="Enable notifications"
                                        onClick={() => setGlobalEnabled(!globalEnabled)}
                                        className="adm-switch"
                                    />
                                </li>
                                <li className="adm-row justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                        <p className="flex flex-wrap items-center gap-2">
                                            <span className="font-semibold text-[var(--text-bright)]">
                                                Contact form messages
                                            </span>
                                            <Badge tone={notifyOnContact ? 'info' : undefined}>
                                                {notifyOnContact ? 'Alert on submission' : 'Database only'}
                                            </Badge>
                                        </p>
                                        <p className="adm-help">
                                            Send an alert whenever someone submits the public contact form.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={notifyOnContact}
                                        aria-label="Notify on contact form submission"
                                        onClick={() => setNotifyOnContact(!notifyOnContact)}
                                        className="adm-switch"
                                    />
                                </li>
                            </ul>
                        </Panel>

                        <div className="grid gap-6 lg:grid-cols-2">
                            <Panel
                                title="ntfy push service"
                                actions={
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={ntfyEnabled}
                                        aria-label="Enable ntfy push service"
                                        onClick={() => setNtfyEnabled(!ntfyEnabled)}
                                        className="adm-switch"
                                    />
                                }
                            >
                                <div className="space-y-4">
                                    <p className="adm-help">
                                        Instant push alerts to your phone or desktop via the ntfy app.
                                    </p>
                                    <Field label="Server URL">
                                        <input
                                            type="url"
                                            required={ntfyEnabled}
                                            disabled={!ntfyEnabled}
                                            value={ntfyServer}
                                            onChange={(e) => setNtfyServer(e.target.value)}
                                            className="adm-input font-mono"
                                            placeholder="https://ntfy.sh"
                                        />
                                    </Field>
                                    <Field label="Topic name">
                                        <input
                                            type="text"
                                            required={ntfyEnabled}
                                            disabled={!ntfyEnabled}
                                            value={ntfyTopic}
                                            onChange={(e) => setNtfyTopic(e.target.value)}
                                            className="adm-input font-mono"
                                            placeholder="my-secret-topic"
                                        />
                                    </Field>
                                    <Field label="Access token (optional)">
                                        <input
                                            type="password"
                                            disabled={!ntfyEnabled}
                                            value={ntfyToken}
                                            onChange={(e) => setNtfyToken(e.target.value)}
                                            className="adm-input font-mono"
                                            placeholder="••••••••••••"
                                        />
                                    </Field>
                                    <div>
                                        <button
                                            type="button"
                                            disabled={!ntfyEnabled || testingChannel === 'ntfy'}
                                            onClick={() => handleTest('ntfy')}
                                            className="adm-btn"
                                        >
                                            {testingChannel === 'ntfy' ? (
                                                <FaSpinner aria-hidden="true" className="animate-spin" />
                                            ) : (
                                                <FaPaperPlane aria-hidden="true" />
                                            )}
                                            {testingChannel === 'ntfy' ? 'Sending test' : 'Send test'}
                                        </button>
                                    </div>
                                </div>
                            </Panel>

                            <Panel
                                title="Telegram bot"
                                actions={
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={telegramEnabled}
                                        aria-label="Enable Telegram bot"
                                        onClick={() => setTelegramEnabled(!telegramEnabled)}
                                        className="adm-switch"
                                    />
                                }
                            >
                                <div className="space-y-4">
                                    <p className="adm-help">
                                        Deliver Markdown messages to a private Telegram chat or channel.
                                    </p>
                                    <Field label="Bot token">
                                        <input
                                            type="password"
                                            required={telegramEnabled}
                                            disabled={!telegramEnabled}
                                            value={telegramBotToken}
                                            onChange={(e) => setTelegramBotToken(e.target.value)}
                                            className="adm-input font-mono"
                                            placeholder="123456789:ABCdefGhI..."
                                        />
                                    </Field>
                                    <Field label="Chat ID">
                                        <input
                                            type="text"
                                            required={telegramEnabled}
                                            disabled={!telegramEnabled}
                                            value={telegramChatId}
                                            onChange={(e) => setTelegramChatId(e.target.value)}
                                            className="adm-input font-mono"
                                            placeholder="987654321"
                                        />
                                    </Field>
                                    <div>
                                        <button
                                            type="button"
                                            disabled={!telegramEnabled || testingChannel === 'telegram'}
                                            onClick={() => handleTest('telegram')}
                                            className="adm-btn"
                                        >
                                            {testingChannel === 'telegram' ? (
                                                <FaSpinner aria-hidden="true" className="animate-spin" />
                                            ) : (
                                                <FaPaperPlane aria-hidden="true" />
                                            )}
                                            {testingChannel === 'telegram' ? 'Sending test' : 'Send test'}
                                        </button>
                                    </div>
                                </div>
                            </Panel>
                        </div>

                        <Panel
                            title="Discord webhook"
                            actions={
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={discordEnabled}
                                    aria-label="Enable Discord webhook"
                                    onClick={() => setDiscordEnabled(!discordEnabled)}
                                    className="adm-switch"
                                />
                            }
                        >
                            <div className="space-y-4">
                                <p className="adm-help">
                                    Deliver formatted embeds to a Discord channel via an incoming webhook URL.
                                </p>
                                <Field label="Webhook URL">
                                    <input
                                        type="url"
                                        required={discordEnabled}
                                        disabled={!discordEnabled}
                                        value={discordWebhookUrl}
                                        onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                                        className="adm-input font-mono"
                                        placeholder="https://discord.com/api/webhooks/..."
                                    />
                                </Field>
                                <div>
                                    <button
                                        type="button"
                                        disabled={!discordEnabled || testingChannel === 'discord'}
                                        onClick={() => handleTest('discord')}
                                        className="adm-btn"
                                    >
                                        {testingChannel === 'discord' ? (
                                            <FaSpinner aria-hidden="true" className="animate-spin" />
                                        ) : (
                                            <FaPaperPlane aria-hidden="true" />
                                        )}
                                        {testingChannel === 'discord' ? 'Sending test' : 'Send test'}
                                    </button>
                                </div>
                            </div>
                        </Panel>
                    </div>

                    <aside className="adm-stack adm-side">
                        <Panel title="Publish">
                            <p className="adm-help mb-4">
                                Save your notification rules and active channel credentials.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="adm-btn adm-btn-primary flex-1"
                                >
                                    {saving ? (
                                        <FaSpinner aria-hidden="true" className="animate-spin" />
                                    ) : (
                                        <FaFloppyDisk aria-hidden="true" />
                                    )}
                                    {saving ? 'Saving' : 'Save changes'}
                                </button>
                                <Link href="/admin" className="adm-btn">
                                    Cancel
                                </Link>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <Badge tone={ntfyEnabled ? 'ok' : undefined}>
                                    ntfy: {ntfyEnabled ? 'On' : 'Off'}
                                </Badge>
                                <Badge tone={telegramEnabled ? 'ok' : undefined}>
                                    Telegram: {telegramEnabled ? 'On' : 'Off'}
                                </Badge>
                                <Badge tone={discordEnabled ? 'ok' : undefined}>
                                    Discord: {discordEnabled ? 'On' : 'Off'}
                                </Badge>
                            </div>
                        </Panel>

                        <Panel title="Related" flush>
                            <ul className="adm-list">
                                <li>
                                    <Link href="/admin/config/crons" className="adm-row adm-link">
                                        Task scheduler
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/admin/messages" className="adm-row adm-link">
                                        Contact inbox
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/admin/config" className="adm-row adm-link">
                                        Site configuration
                                    </Link>
                                </li>
                            </ul>
                        </Panel>
                    </aside>
                </form>
            )}
        </div>
    );
}
