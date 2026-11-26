"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    FaBell,
    FaCopy,
    FaEnvelope,
    FaFloppyDisk,
    FaKey,
    FaReply,
    FaRotate,
    FaSpinner,
    FaTrashCan,
} from 'react-icons/fa6';
import Toast from '@/app/components/admin/Toast';
import { useAdminFeedback } from '@/app/components/admin/feedback/AdminFeedbackProvider';
import { Badge, EmptyState, Field, Loading, PageHeader, Panel, Stat } from '@/app/components/admin/ui';
import '@/app/styles/admin-structure.css';

export default function ContactAdminPage() {
    const { confirm } = useAdminFeedback();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notification, setNotification] = useState(null);

    const [config, setConfig] = useState({
        contactLocation: '',
        contactEmail: '',
        n8nWebhookUrl: '',
        n8nWebhookAuthKey: '',
        n8nWebhookEnabled: true,
        contactStatus: 'Open to opportunities',
        resume: {
            type: 'url',
            value: '',
        },
    });

    const [messages, setMessages] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [notificationConfigured, setNotificationConfigured] = useState(false);
    const [notifyOnContact, setNotifyOnContact] = useState(false);
    const [activeChannels, setActiveChannels] = useState([]);

    const showNotification = (success, message) => {
        setNotification({ success, message });
        setTimeout(() => setNotification(null), 3000);
    };

    const fetchNotificationStatus = async () => {
        try {
            const res = await fetch('/api/admin/notifications');
            const data = await res.json();
            if (data.success && data.data) {
                const configData = data.data;
                const isLinked = configData.enabled && (
                    (configData.ntfy?.enabled && configData.ntfy?.topic) ||
                    (configData.telegram?.enabled && configData.telegram?.botToken && configData.telegram?.chatId) ||
                    (configData.discord?.enabled && configData.discord?.webhookUrl)
                );
                setNotificationConfigured(Boolean(isLinked));
                setNotifyOnContact(configData.notifyOnContactMessage || false);

                const channels = [];
                if (configData.ntfy?.enabled && configData.ntfy?.topic) channels.push('ntfy');
                if (configData.telegram?.enabled && configData.telegram?.botToken && configData.telegram?.chatId) channels.push('Telegram');
                if (configData.discord?.enabled && configData.discord?.webhookUrl) channels.push('Discord');
                setActiveChannels(channels);
            }
        } catch (error) {
            console.error('Failed to fetch notification status:', error);
        }
    };

    useEffect(() => {
        fetchConfig();
        fetchMessages();
        fetchNotificationStatus();
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
                    n8nWebhookAuthKey: data.n8nWebhookAuthKey || '',
                    n8nWebhookEnabled: data.n8nWebhookEnabled !== undefined ? data.n8nWebhookEnabled : true,
                    contactStatus: data.contactStatus || 'Open to opportunities',
                    resume: data.resume || { type: 'url', value: '' },
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
            if (data.success && Array.isArray(data.data)) {
                setMessages(data.data);
                if (data.data.length > 0) {
                    setSelectedId((prev) => prev || data.data[0]._id);
                }
            }
        } catch (error) {
            console.error('Failed to fetch messages:', error);
        }
    };

    const handleDeleteMessage = async (id) => {
        if (!(await confirm({
            title: 'Delete message?',
            message: 'Are you sure you want to delete this message? This action cannot be undone.',
            confirmText: 'Delete',
            danger: true,
        }))) return;

        try {
            const res = await fetch(`/api/contact/message?id=${id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setMessages((prev) => {
                    const next = prev.filter((msg) => msg._id !== id);
                    if (selectedId === id) {
                        setSelectedId(next[0]?._id || null);
                    }
                    return next;
                });
                showNotification(true, 'Message deleted');
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
                body: JSON.stringify(config),
            });

            const notifRes = await fetch('/api/admin/notifications', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notifyOnContactMessage: notifyOnContact }),
            });

            if (res.ok && notifRes.ok) {
                showNotification(true, 'Contact settings saved');
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

    const filteredMessages = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return messages;
        return messages.filter(
            (m) =>
                m.name?.toLowerCase().includes(q) ||
                m.email?.toLowerCase().includes(q) ||
                m.message?.toLowerCase().includes(q)
        );
    }, [messages, searchQuery]);

    const activeMessage = useMemo(() => {
        if (filteredMessages.length === 0) return null;
        return filteredMessages.find((m) => m._id === selectedId) || filteredMessages[0];
    }, [filteredMessages, selectedId]);

    const webhookReady = Boolean(config.n8nWebhookEnabled && config.n8nWebhookUrl);
    const pushReady = Boolean(notificationConfigured && notifyOnContact);

    return (
        <div className="adm-page">
            <PageHeader
                command="mail"
                title="Contact and messages"
                description="Read messages sent through the contact form and configure contact coordinates and forwarding."
            />

            <div className="adm-stats">
                <Stat
                    label="Inbox messages"
                    value={messages.length}
                    hint={messages[0]?.createdAt ? `Latest ${new Date(messages[0].createdAt).toLocaleDateString()}` : 'No messages yet'}
                />
                <Stat
                    label="Availability"
                    value={config.contactStatus || 'Open'}
                    hint={config.contactLocation || 'Location not set'}
                />
                <Stat
                    label="Push alerts"
                    value={pushReady ? 'Active' : 'Off'}
                    hint={activeChannels.length > 0 ? activeChannels.join(', ') : 'No channels configured'}
                />
                <Stat
                    label="Webhook routing"
                    value={webhookReady ? 'Active' : 'Off'}
                    hint={config.n8nWebhookUrl ? 'n8n / webhook URL set' : 'No webhook URL'}
                />
            </div>

            {loading ? (
                <section className="adm-panel">
                    <Loading label="Loading contact configuration" rows={6} />
                </section>
            ) : (
                <>
                    <Panel
                        title="Messages inbox"
                        actions={
                            <div className="flex flex-wrap items-center gap-2">
                                {messages.length > 0 && (
                                    <input
                                        type="search"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Filter messages…"
                                        aria-label="Filter messages"
                                        className="adm-input !min-h-9 sm:w-56"
                                    />
                                )}
                                <Badge tone={messages.length > 0 ? 'info' : undefined}>
                                    {filteredMessages.length} {filteredMessages.length === 1 ? 'message' : 'messages'}
                                </Badge>
                            </div>
                        }
                        flush
                    >
                        {messages.length === 0 ? (
                            <EmptyState
                                title="No messages in inbox"
                                description="Messages submitted through the public contact form will appear here."
                            />
                        ) : filteredMessages.length === 0 ? (
                            <EmptyState
                                title="No matching messages"
                                description="Try clearing or changing your search filter."
                                action={
                                    <button type="button" onClick={() => setSearchQuery('')} className="adm-btn">
                                        Clear filter
                                    </button>
                                }
                            />
                        ) : (
                            <div className="adm-inbox">
                                <ul
                                    role="listbox"
                                    aria-label="Contact messages"
                                    className="adm-list adm-inbox-list max-h-[32rem] overflow-y-auto"
                                >
                                    {filteredMessages.map((msg) => {
                                        const isSelected = activeMessage?._id === msg._id;
                                        return (
                                            <li key={msg._id}>
                                                <button
                                                    type="button"
                                                    role="option"
                                                    aria-selected={isSelected}
                                                    onClick={() => setSelectedId(msg._id)}
                                                    className="adm-inbox-item"
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="truncate font-semibold text-[var(--text-bright)]">
                                                            {msg.name}
                                                        </span>
                                                        <span className="adm-num adm-help shrink-0 text-xs">
                                                            {new Date(msg.createdAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <span className="truncate font-mono text-xs text-[var(--text-secondary)]">
                                                        {msg.email}
                                                    </span>
                                                    <p className="line-clamp-2 text-xs text-[var(--adm-hint)]">
                                                        {msg.message}
                                                    </p>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>

                                {activeMessage && (
                                    <div className="flex flex-col justify-between p-4 sm:p-6">
                                        <div>
                                            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--hairline)] pb-4">
                                                <div className="min-w-0">
                                                    <h3 className="text-lg font-semibold text-[var(--text-bright)]">
                                                        {activeMessage.name}
                                                    </h3>
                                                    <p className="mt-0.5 flex flex-wrap items-center gap-2 font-mono text-xs text-[var(--text-secondary)]">
                                                        <a href={`mailto:${activeMessage.email}`} className="adm-link">
                                                            {activeMessage.email}
                                                        </a>
                                                        <span>·</span>
                                                        <time dateTime={activeMessage.createdAt}>
                                                            {new Date(activeMessage.createdAt).toLocaleString()}
                                                        </time>
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <a
                                                        href={`mailto:${activeMessage.email}?subject=Re: Contact from portfolio`}
                                                        className="adm-btn"
                                                    >
                                                        <FaReply aria-hidden="true" /> Reply
                                                    </a>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteMessage(activeMessage._id)}
                                                        className="adm-btn adm-btn-danger"
                                                        aria-label={`Delete message from ${activeMessage.name}`}
                                                    >
                                                        <FaTrashCan aria-hidden="true" /> Delete
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="mt-4 rounded-[10px] border border-[var(--hairline)] bg-[var(--bg-secondary)] p-4 text-sm leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap">
                                                {activeMessage.message}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </Panel>

                    <form onSubmit={handleSave} className="adm-split">
                        <div className="adm-stack">
                            <Panel title="Public contact details">
                                <div className="grid gap-4 md:grid-cols-3">
                                    <Field label="Location" help="Displayed on the public contact section.">
                                        <input
                                            type="text"
                                            value={config.contactLocation}
                                            onChange={(e) => setConfig({ ...config, contactLocation: e.target.value })}
                                            placeholder="San Francisco, CA"
                                            className="adm-input"
                                        />
                                    </Field>

                                    <Field label="Availability status" help="Current work availability state.">
                                        <select
                                            value={config.contactStatus}
                                            onChange={(e) => setConfig({ ...config, contactStatus: e.target.value })}
                                            className="adm-input"
                                        >
                                            <option value="Open to opportunities">Open to opportunities</option>
                                            <option value="Busy with projects">Busy with projects</option>
                                            <option value="Not looking">Not looking</option>
                                        </select>
                                    </Field>

                                    <Field label="Direct email" help="Public contact address.">
                                        <input
                                            type="email"
                                            value={config.contactEmail}
                                            onChange={(e) => setConfig({ ...config, contactEmail: e.target.value })}
                                            placeholder="your.name@example.com"
                                            className="adm-input font-mono"
                                        />
                                    </Field>
                                </div>
                            </Panel>

                            <div className="grid gap-6 lg:grid-cols-2">
                                <Panel
                                    title="Push notification forwarding"
                                    actions={
                                        <div className="flex items-center gap-2">
                                            <Badge tone={pushReady ? 'ok' : 'warn'}>
                                                {pushReady ? 'Active' : 'Inactive'}
                                            </Badge>
                                            <button
                                                type="button"
                                                role="switch"
                                                aria-checked={Boolean(notifyOnContact)}
                                                aria-label="Forward contact messages to push channels"
                                                disabled={!notificationConfigured}
                                                onClick={() => setNotifyOnContact(!notifyOnContact)}
                                                className="adm-switch"
                                            />
                                        </div>
                                    }
                                >
                                    <p className="adm-help mb-4">
                                        Deliver incoming contact form submissions directly to your configured push channels (Telegram, Discord, or ntfy).
                                    </p>

                                    {notificationConfigured ? (
                                        <div className="adm-notice adm-notice-ok flex items-center gap-2">
                                            <FaBell aria-hidden="true" />
                                            <span>Connected channels: {activeChannels.join(', ')}</span>
                                        </div>
                                    ) : (
                                        <div className="adm-notice adm-notice-warn space-y-2">
                                            <p className="font-semibold">Push gateway not configured</p>
                                            <p className="text-xs">
                                                Set up Telegram, Discord, or ntfy credentials first to enable instant push alerts.
                                            </p>
                                            <Link href="/admin/config/notification" className="adm-link inline-block text-xs font-semibold">
                                                Configure notification channels
                                            </Link>
                                        </div>
                                    )}
                                </Panel>

                                <Panel
                                    title="Webhook forwarding (n8n)"
                                    actions={
                                        <div className="flex items-center gap-2">
                                            <Badge tone={webhookReady ? 'ok' : undefined}>
                                                {webhookReady ? 'Active' : 'Suspended'}
                                            </Badge>
                                            <button
                                                type="button"
                                                role="switch"
                                                aria-checked={Boolean(config.n8nWebhookEnabled)}
                                                aria-label="Enable webhook forwarding"
                                                onClick={() => setConfig({ ...config, n8nWebhookEnabled: !config.n8nWebhookEnabled })}
                                                className="adm-switch"
                                            />
                                        </div>
                                    }
                                >
                                    <div className="space-y-4">
                                        <Field
                                            label="Webhook URL"
                                            help="External automation endpoint (n8n, Make, Zapier) triggered on new messages."
                                        >
                                            <input
                                                type="url"
                                                value={config.n8nWebhookUrl}
                                                onChange={(e) => setConfig({ ...config, n8nWebhookUrl: e.target.value })}
                                                placeholder="https://n8n.example.com/webhook/…"
                                                className="adm-input font-mono"
                                            />
                                        </Field>

                                        <div className="adm-field">
                                            <label htmlFor="n8n-webhook-token" className="adm-label">
                                                Webhook authorization token
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                <input
                                                    id="n8n-webhook-token"
                                                    type="text"
                                                    value={config.n8nWebhookAuthKey}
                                                    disabled
                                                    placeholder="No token generated"
                                                    className="adm-input flex-1 basis-44 font-mono"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(config.n8nWebhookAuthKey);
                                                        showNotification(true, 'Token copied to clipboard');
                                                    }}
                                                    disabled={!config.n8nWebhookAuthKey}
                                                    className="adm-btn"
                                                >
                                                    <FaCopy aria-hidden="true" /> Copy
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const token = crypto.randomUUID();
                                                        setConfig({ ...config, n8nWebhookAuthKey: token });
                                                    }}
                                                    className="adm-btn"
                                                >
                                                    <FaKey aria-hidden="true" /> Generate
                                                </button>
                                            </div>
                                            <p className="adm-help">
                                                Sent in the <code className="adm-code">Authorization</code> request header.
                                            </p>
                                        </div>
                                    </div>
                                </Panel>
                            </div>
                        </div>

                        <aside className="adm-stack adm-side">
                            <Panel title="Publish">
                                <dl className="adm-facts mb-4">
                                    <div>
                                        <dt>Email</dt>
                                        <dd>{config.contactEmail || 'Not set'}</dd>
                                    </div>
                                    <div>
                                        <dt>Location</dt>
                                        <dd>{config.contactLocation || 'Not set'}</dd>
                                    </div>
                                </dl>
                                <p className="adm-help mb-4">
                                    Saves public contact coordinates, webhook credentials, and push forwarding preferences.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <button type="submit" disabled={saving} className="adm-btn adm-btn-primary flex-1">
                                        {saving ? <FaSpinner className="animate-spin" aria-hidden="true" /> : <FaFloppyDisk aria-hidden="true" />}
                                        {saving ? 'Saving' : 'Save changes'}
                                    </button>
                                    <button type="button" onClick={() => router.back()} className="adm-btn">
                                        Cancel
                                    </button>
                                </div>
                            </Panel>

                            <Panel title="Related" flush>
                                <ul className="adm-list">
                                    <li>
                                        <Link href="/admin/config/notification" className="adm-row adm-link">
                                            <FaBell aria-hidden="true" /> Notification channels
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href="/admin/footer" className="adm-row adm-link">
                                            <FaEnvelope aria-hidden="true" /> Footer and social links
                                        </Link>
                                    </li>
                                    <li>
                                        <button
                                            type="button"
                                            onClick={fetchMessages}
                                            className="adm-row adm-link"
                                        >
                                            <FaRotate aria-hidden="true" /> Refresh inbox
                                        </button>
                                    </li>
                                </ul>
                            </Panel>
                        </aside>
                    </form>
                </>
            )}

            <Toast notification={notification} />
        </div>
    );
}
