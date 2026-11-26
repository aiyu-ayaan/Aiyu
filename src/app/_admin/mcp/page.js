"use client";
import React, { useCallback, useEffect, useState } from 'react';
import { useAdminFeedback } from '@/app/components/admin/feedback/AdminFeedbackProvider';
import {
    FaBook,
    FaComment,
    FaCopy,
    FaEye,
    FaEyeSlash,
    FaFloppyDisk,
    FaFolderOpen,
    FaKey,
    FaLink,
    FaPlug,
    FaPlus,
    FaRotate,
    FaScrewdriverWrench,
    FaServer,
    FaShieldHalved,
    FaSliders,
    FaSpinner,
    FaTrashCan,
    FaUpRightFromSquare,
} from 'react-icons/fa6';
import { Badge, EmptyState, Field, Loading, PageHeader, Panel } from '@/app/components/admin/ui';
import '@/app/styles/admin-system.css';

const TABS = [
    { key: 'server', label: 'Server', icon: <FaServer aria-hidden="true" /> },
    { key: 'transports', label: 'Transports', icon: <FaPlug aria-hidden="true" /> },
    { key: 'capabilities', label: 'Capabilities', icon: <FaSliders aria-hidden="true" /> },
    { key: 'tools', label: 'Tools', icon: <FaScrewdriverWrench aria-hidden="true" /> },
    { key: 'resources', label: 'Resources', icon: <FaFolderOpen aria-hidden="true" /> },
    { key: 'prompts', label: 'Prompts', icon: <FaComment aria-hidden="true" /> },
    { key: 'links', label: 'Links', icon: <FaLink aria-hidden="true" /> },
    { key: 'security', label: 'Security', icon: <FaShieldHalved aria-hidden="true" /> },
];

const TRANSPORT_TYPES = ['webmcp', 'streamable-http', 'http', 'sse', 'stdio'];
const ANNOTATIONS = [
    { key: 'readOnlyHint', label: 'Read-only' },
    { key: 'destructiveHint', label: 'Destructive' },
    { key: 'idempotentHint', label: 'Idempotent' },
    { key: 'openWorldHint', label: 'Open-world' },
];

function ServerTab({ config, patch }) {
    const s = config.server;
    const setServer = (p) => patch({ server: { ...s, ...p } });
    return (
        <Panel
            title="Server identity"
            actions={
                <div className="flex items-center gap-2">
                    <Badge tone={config.enabled ? 'ok' : 'warn'}>
                        {config.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={config.enabled}
                        aria-label="Enable MCP server"
                        onClick={() => patch({ enabled: !config.enabled })}
                        className="adm-switch"
                    />
                </div>
            }
        >
            <div className="space-y-4">
                <p className="adm-help">
                    Master switch and server card metadata advertised to connecting MCP agents.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Name (identifier)">
                        <input
                            value={s.name}
                            onChange={(e) => setServer({ name: e.target.value })}
                            placeholder="aiyu"
                            className="adm-input font-mono"
                        />
                    </Field>
                    <Field label="Version">
                        <input
                            value={s.version}
                            onChange={(e) => setServer({ version: e.target.value })}
                            placeholder="1.0.0"
                            className="adm-input font-mono"
                        />
                    </Field>
                    <Field label="Title (display name)">
                        <input
                            value={s.title}
                            onChange={(e) => setServer({ title: e.target.value })}
                            placeholder="Aiyu"
                            className="adm-input"
                        />
                    </Field>
                    <Field label="Website URL">
                        <input
                            value={s.websiteUrl}
                            onChange={(e) => setServer({ websiteUrl: e.target.value })}
                            placeholder="/ or https://…"
                            className="adm-input font-mono"
                        />
                    </Field>
                </div>
                <Field label="Description">
                    <textarea
                        value={s.description}
                        onChange={(e) => setServer({ description: e.target.value })}
                        rows={2}
                        className="adm-input"
                    />
                </Field>
                <Field
                    label="Instructions"
                    help="Guidance sent to connecting clients on how agents should use this MCP server."
                >
                    <textarea
                        value={s.instructions}
                        onChange={(e) => setServer({ instructions: e.target.value })}
                        rows={4}
                        placeholder="Optional. How agents should use this MCP server."
                        className="adm-input font-mono"
                    />
                </Field>
            </div>
        </Panel>
    );
}

function TransportsTab({ config, patch }) {
    const list = config.transports;
    const update = (i, p) => patch({ transports: list.map((t, idx) => (idx === i ? { ...t, ...p } : t)) });
    const add = () =>
        patch({ transports: [{ type: 'webmcp', endpoint: '/', description: '' }, ...list] });
    const remove = (i) => patch({ transports: list.filter((_, idx) => idx !== i) });
    return (
        <Panel
            title="Transports"
            actions={
                <button type="button" onClick={add} className="adm-btn">
                    <FaPlus aria-hidden="true" /> Add transport
                </button>
            }
            flush
        >
            {list.length === 0 ? (
                <EmptyState
                    title="No transports defined"
                    description="Add a transport endpoint so clients know how to connect."
                    action={
                        <button type="button" onClick={add} className="adm-btn adm-btn-primary">
                            <FaPlus aria-hidden="true" /> Add transport
                        </button>
                    }
                />
            ) : (
                <ul className="adm-list">
                    {list.map((t, i) => (
                        <li key={i} className="p-4 sm:px-5 space-y-3">
                            <div className="grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)_auto] sm:items-end">
                                <Field label="Type">
                                    <select
                                        value={t.type}
                                        onChange={(e) => update(i, { type: e.target.value })}
                                        className="adm-input font-mono"
                                    >
                                        {TRANSPORT_TYPES.map((tp) => (
                                            <option key={tp} value={tp}>
                                                {tp}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                                <Field label="Endpoint">
                                    <input
                                        value={t.endpoint}
                                        onChange={(e) => update(i, { endpoint: e.target.value })}
                                        placeholder="/ or https://host/rpc"
                                        className="adm-input font-mono"
                                    />
                                </Field>
                                <button
                                    type="button"
                                    onClick={() => remove(i)}
                                    aria-label={`Remove transport ${i + 1}`}
                                    className="adm-icon-btn"
                                >
                                    <FaTrashCan aria-hidden="true" />
                                </button>
                            </div>
                            <Field label="Description (optional)">
                                <input
                                    value={t.description}
                                    onChange={(e) => update(i, { description: e.target.value })}
                                    placeholder="Description (optional)"
                                    className="adm-input"
                                />
                            </Field>
                        </li>
                    ))}
                </ul>
            )}
        </Panel>
    );
}

function CapRow({ title, cap, keys, onChange }) {
    return (
        <li className="p-4 sm:px-5 space-y-3">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-[var(--text-bright)]">
                        {title}
                    </span>
                    <Badge tone={cap.enabled ? 'ok' : undefined}>
                        {cap.enabled ? 'On' : 'Off'}
                    </Badge>
                </div>
                <button
                    type="button"
                    role="switch"
                    aria-checked={cap.enabled}
                    aria-label={`Enable ${title} capability`}
                    onClick={() => onChange({ enabled: !cap.enabled })}
                    className="adm-switch"
                />
            </div>
            {cap.enabled && keys.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {keys.map((k) => (
                        <label key={k.key} className="adm-choice">
                            <input
                                type="checkbox"
                                checked={!!cap[k.key]}
                                onChange={(e) => onChange({ [k.key]: e.target.checked })}
                                className="adm-check"
                            />
                            <span className="font-mono text-xs">{k.label}</span>
                        </label>
                    ))}
                </div>
            )}
        </li>
    );
}

function CapabilitiesTab({ config, patch }) {
    const c = config.capabilities;
    const setCap = (name, p) => patch({ capabilities: { ...c, [name]: { ...c[name], ...p } } });
    return (
        <Panel title="Advertised capabilities" flush>
            <ul className="adm-list">
                <CapRow
                    title="tools"
                    cap={c.tools}
                    keys={[{ key: 'listChanged', label: 'listChanged' }]}
                    onChange={(p) => setCap('tools', p)}
                />
                <CapRow
                    title="resources"
                    cap={c.resources}
                    keys={[
                        { key: 'subscribe', label: 'subscribe' },
                        { key: 'listChanged', label: 'listChanged' },
                    ]}
                    onChange={(p) => setCap('resources', p)}
                />
                <CapRow
                    title="prompts"
                    cap={c.prompts}
                    keys={[{ key: 'listChanged', label: 'listChanged' }]}
                    onChange={(p) => setCap('prompts', p)}
                />
                <CapRow
                    title="logging"
                    cap={c.logging}
                    keys={[]}
                    onChange={(p) => setCap('logging', p)}
                />
                <CapRow
                    title="completions"
                    cap={c.completions}
                    keys={[]}
                    onChange={(p) => setCap('completions', p)}
                />
            </ul>
        </Panel>
    );
}

function ToolsTab({ config, patch }) {
    const list = config.tools;
    const update = (i, p) => patch({ tools: list.map((t, idx) => (idx === i ? { ...t, ...p } : t)) });
    const setAnn = (i, key, v) =>
        update(i, { annotations: { ...list[i].annotations, [key]: v } });
    const add = () =>
        patch({
            tools: [
                {
                    name: '',
                    title: '',
                    description: '',
                    enabled: true,
                    inputSchema: '',
                    annotations: {},
                },
                ...list,
            ],
        });
    const remove = (i) => patch({ tools: list.filter((_, idx) => idx !== i) });
    return (
        <Panel
            title="Tools"
            actions={
                <button type="button" onClick={add} className="adm-btn">
                    <FaPlus aria-hidden="true" /> Add tool
                </button>
            }
            flush
        >
            {list.length === 0 ? (
                <EmptyState
                    title="No tools defined"
                    description="Register tools exposed in the MCP server card."
                    action={
                        <button type="button" onClick={add} className="adm-btn adm-btn-primary">
                            <FaPlus aria-hidden="true" /> Add tool
                        </button>
                    }
                />
            ) : (
                <ul className="adm-list">
                    {list.map((t, i) => (
                        <li key={i} className="p-4 sm:px-5 space-y-4">
                            <div className="flex flex-wrap items-end gap-3">
                                <Field className="flex-1 basis-48" label="Tool name">
                                    <input
                                        value={t.name}
                                        onChange={(e) => update(i, { name: e.target.value })}
                                        placeholder="tool.name"
                                        className="adm-input font-mono"
                                    />
                                </Field>
                                <Field className="flex-1 basis-48" label="Display title">
                                    <input
                                        value={t.title}
                                        onChange={(e) => update(i, { title: e.target.value })}
                                        placeholder="Title"
                                        className="adm-input"
                                    />
                                </Field>
                                <div className="flex items-center gap-2 pb-1">
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={t.enabled}
                                        aria-label={`Enable tool ${t.name || i + 1}`}
                                        onClick={() => update(i, { enabled: !t.enabled })}
                                        className="adm-switch"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => remove(i)}
                                        aria-label={`Remove tool ${t.name || i + 1}`}
                                        className="adm-icon-btn"
                                    >
                                        <FaTrashCan aria-hidden="true" />
                                    </button>
                                </div>
                            </div>
                            <Field label="Description">
                                <textarea
                                    value={t.description}
                                    onChange={(e) => update(i, { description: e.target.value })}
                                    rows={2}
                                    placeholder="Description"
                                    className="adm-input"
                                />
                            </Field>
                            <Field
                                label="Input schema (JSON)"
                                help="Leave blank if the tool takes no input schema."
                            >
                                <textarea
                                    value={t.inputSchema}
                                    onChange={(e) => update(i, { inputSchema: e.target.value })}
                                    rows={4}
                                    placeholder='{"type":"object","properties":{}}'
                                    className="adm-input font-mono"
                                />
                            </Field>
                            <div className="flex flex-wrap gap-2">
                                {ANNOTATIONS.map((a) => (
                                    <label key={a.key} className="adm-choice">
                                        <input
                                            type="checkbox"
                                            checked={!!t.annotations?.[a.key]}
                                            onChange={(e) => setAnn(i, a.key, e.target.checked)}
                                            className="adm-check"
                                        />
                                        <span>{a.label}</span>
                                    </label>
                                ))}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </Panel>
    );
}

function ResourcesTab({ config, patch }) {
    const list = config.resources;
    const update = (i, p) =>
        patch({ resources: list.map((r, idx) => (idx === i ? { ...r, ...p } : r)) });
    const add = () =>
        patch({
            resources: [
                {
                    uri: '',
                    name: '',
                    title: '',
                    description: '',
                    mimeType: '',
                    enabled: true,
                },
                ...list,
            ],
        });
    const remove = (i) => patch({ resources: list.filter((_, idx) => idx !== i) });
    return (
        <Panel
            title="Resources"
            actions={
                <button type="button" onClick={add} className="adm-btn">
                    <FaPlus aria-hidden="true" /> Add resource
                </button>
            }
            flush
        >
            {list.length === 0 ? (
                <EmptyState
                    title="No resources defined"
                    description="Expose read-only URIs in the MCP server card."
                    action={
                        <button type="button" onClick={add} className="adm-btn adm-btn-primary">
                            <FaPlus aria-hidden="true" /> Add resource
                        </button>
                    }
                />
            ) : (
                <ul className="adm-list">
                    {list.map((r, i) => (
                        <li key={i} className="p-4 sm:px-5 space-y-3">
                            <div className="flex flex-wrap items-end gap-3">
                                <Field className="flex-1 basis-64" label="Resource URI">
                                    <input
                                        value={r.uri}
                                        onChange={(e) => update(i, { uri: e.target.value })}
                                        placeholder="/api/home or https://…"
                                        className="adm-input font-mono"
                                    />
                                </Field>
                                <div className="flex items-center gap-2 pb-1">
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={r.enabled}
                                        aria-label={`Enable resource ${r.name || i + 1}`}
                                        onClick={() => update(i, { enabled: !r.enabled })}
                                        className="adm-switch"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => remove(i)}
                                        aria-label={`Remove resource ${r.name || i + 1}`}
                                        className="adm-icon-btn"
                                    >
                                        <FaTrashCan aria-hidden="true" />
                                    </button>
                                </div>
                            </div>
                            <div className="grid gap-3 md:grid-cols-3">
                                <Field label="Name">
                                    <input
                                        value={r.name}
                                        onChange={(e) => update(i, { name: e.target.value })}
                                        placeholder="name"
                                        className="adm-input"
                                    />
                                </Field>
                                <Field label="Title">
                                    <input
                                        value={r.title}
                                        onChange={(e) => update(i, { title: e.target.value })}
                                        placeholder="Title"
                                        className="adm-input"
                                    />
                                </Field>
                                <Field label="MIME type">
                                    <input
                                        value={r.mimeType}
                                        onChange={(e) => update(i, { mimeType: e.target.value })}
                                        placeholder="application/json"
                                        className="adm-input font-mono"
                                    />
                                </Field>
                            </div>
                            <Field label="Description">
                                <input
                                    value={r.description}
                                    onChange={(e) => update(i, { description: e.target.value })}
                                    placeholder="Description"
                                    className="adm-input"
                                />
                            </Field>
                        </li>
                    ))}
                </ul>
            )}
        </Panel>
    );
}

function PromptsTab({ config, patch }) {
    const list = config.prompts;
    const update = (i, p) =>
        patch({ prompts: list.map((pr, idx) => (idx === i ? { ...pr, ...p } : pr)) });
    const add = () =>
        patch({
            prompts: [
                { name: '', title: '', description: '', enabled: true, arguments: [] },
                ...list,
            ],
        });
    const remove = (i) => patch({ prompts: list.filter((_, idx) => idx !== i) });
    const updateArg = (pi, ai, p) =>
        update(pi, {
            arguments: list[pi].arguments.map((a, idx) => (idx === ai ? { ...a, ...p } : a)),
        });
    const addArg = (pi) =>
        update(pi, {
            arguments: [
                { name: '', description: '', required: false },
                ...list[pi].arguments,
            ],
        });
    const removeArg = (pi, ai) =>
        update(pi, { arguments: list[pi].arguments.filter((_, idx) => idx !== ai) });
    return (
        <Panel
            title="Prompts"
            actions={
                <button type="button" onClick={add} className="adm-btn">
                    <FaPlus aria-hidden="true" /> Add prompt
                </button>
            }
            flush
        >
            {list.length === 0 ? (
                <EmptyState
                    title="No prompts defined"
                    description="Add reusable prompt templates to the server card."
                    action={
                        <button type="button" onClick={add} className="adm-btn adm-btn-primary">
                            <FaPlus aria-hidden="true" /> Add prompt
                        </button>
                    }
                />
            ) : (
                <ul className="adm-list">
                    {list.map((pr, i) => (
                        <li key={i} className="p-4 sm:px-5 space-y-3">
                            <div className="flex flex-wrap items-end gap-3">
                                <Field className="flex-1 basis-48" label="Prompt name">
                                    <input
                                        value={pr.name}
                                        onChange={(e) => update(i, { name: e.target.value })}
                                        placeholder="prompt_name"
                                        className="adm-input font-mono"
                                    />
                                </Field>
                                <Field className="flex-1 basis-48" label="Display title">
                                    <input
                                        value={pr.title}
                                        onChange={(e) => update(i, { title: e.target.value })}
                                        placeholder="Title"
                                        className="adm-input"
                                    />
                                </Field>
                                <div className="flex items-center gap-2 pb-1">
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={pr.enabled}
                                        aria-label={`Enable prompt ${pr.name || i + 1}`}
                                        onClick={() => update(i, { enabled: !pr.enabled })}
                                        className="adm-switch"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => remove(i)}
                                        aria-label={`Remove prompt ${pr.name || i + 1}`}
                                        className="adm-icon-btn"
                                    >
                                        <FaTrashCan aria-hidden="true" />
                                    </button>
                                </div>
                            </div>
                            <Field label="Description">
                                <input
                                    value={pr.description}
                                    onChange={(e) => update(i, { description: e.target.value })}
                                    placeholder="Description"
                                    className="adm-input"
                                />
                            </Field>
                            <div className="space-y-3 rounded-[10px] border border-[var(--hairline)] bg-[var(--bg-primary)] p-3">
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-sm text-[var(--text-bright)]">
                                        Arguments
                                    </span>
                                    <button type="button" onClick={() => addArg(i)} className="adm-btn">
                                        <FaPlus aria-hidden="true" /> Add argument
                                    </button>
                                </div>
                                {pr.arguments.length === 0 ? (
                                    <p className="adm-help">No arguments configured.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {pr.arguments.map((a, ai) => (
                                            <div
                                                key={ai}
                                                className="flex flex-wrap items-center gap-2"
                                            >
                                                <input
                                                    aria-label={`Argument ${ai + 1} name`}
                                                    value={a.name}
                                                    onChange={(e) =>
                                                        updateArg(i, ai, { name: e.target.value })
                                                    }
                                                    placeholder="argName"
                                                    className="adm-input w-40 font-mono"
                                                />
                                                <input
                                                    aria-label={`Argument ${ai + 1} description`}
                                                    value={a.description}
                                                    onChange={(e) =>
                                                        updateArg(i, ai, { description: e.target.value })
                                                    }
                                                    placeholder="Description"
                                                    className="adm-input flex-1 basis-48"
                                                />
                                                <label className="adm-choice">
                                                    <input
                                                        type="checkbox"
                                                        checked={a.required}
                                                        onChange={(e) =>
                                                            updateArg(i, ai, {
                                                                required: e.target.checked,
                                                            })
                                                        }
                                                        className="adm-check"
                                                    />
                                                    <span>Required</span>
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => removeArg(i, ai)}
                                                    aria-label={`Remove argument ${ai + 1}`}
                                                    className="adm-icon-btn"
                                                >
                                                    <FaTrashCan aria-hidden="true" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </Panel>
    );
}

function LinksTab({ config, patch }) {
    const list = config.links;
    const update = (i, p) => patch({ links: list.map((l, idx) => (idx === i ? { ...l, ...p } : l)) });
    const add = () => patch({ links: [{ name: '', url: '' }, ...list] });
    const remove = (i) => patch({ links: list.filter((_, idx) => idx !== i) });
    return (
        <Panel
            title="Links"
            actions={
                <button type="button" onClick={add} className="adm-btn">
                    <FaPlus aria-hidden="true" /> Add link
                </button>
            }
            flush
        >
            {list.length === 0 ? (
                <EmptyState
                    title="No links defined"
                    description="Add reference links (e.g. documentation or repository) to the server card."
                    action={
                        <button type="button" onClick={add} className="adm-btn adm-btn-primary">
                            <FaPlus aria-hidden="true" /> Add link
                        </button>
                    }
                />
            ) : (
                <ul className="adm-list">
                    {list.map((l, i) => (
                        <li key={i} className="adm-row flex-wrap gap-3">
                            <input
                                aria-label={`Link ${i + 1} key`}
                                value={l.name}
                                onChange={(e) => update(i, { name: e.target.value })}
                                placeholder="Key (e.g. documentation)"
                                className="adm-input w-56 font-mono"
                            />
                            <input
                                aria-label={`Link ${i + 1} URL`}
                                value={l.url}
                                onChange={(e) => update(i, { url: e.target.value })}
                                placeholder="/path or https://…"
                                className="adm-input flex-1 basis-56 font-mono"
                            />
                            <button
                                type="button"
                                onClick={() => remove(i)}
                                aria-label={`Remove link ${i + 1}`}
                                className="adm-icon-btn"
                            >
                                <FaTrashCan aria-hidden="true" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </Panel>
    );
}

function SecurityTab({ config, patch, flash, setError }) {
    const { confirm } = useAdminFeedback();
    const writeEnabled = !!config.write?.enabled;
    const [status, setStatus] = useState(null);
    const [busy, setBusy] = useState(false);
    const [newToken, setNewToken] = useState('');
    const [copied, setCopied] = useState(false);

    const loadStatus = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/mcp/token', { cache: 'no-store' });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || 'TOKEN_STATUS_FAILED');
            setStatus(json.data);
        } catch (e) {
            setError(e.message);
        }
    }, [setError]);

    useEffect(() => {
        loadStatus();
    }, [loadStatus]);

    const generate = async () => {
        setBusy(true);
        setError(null);
        setNewToken('');
        try {
            const res = await fetch('/api/admin/mcp/token', { method: 'POST' });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || 'TOKEN_GEN_FAILED');
            setNewToken(json.data.token);
            flash('Write token generated — copy it now, it is shown only once.');
            loadStatus();
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    const revoke = async () => {
        if (
            !(await confirm({
                title: 'Revoke write token?',
                message:
                    'Revoke the MCP write token? Clients using it will lose write access immediately.',
                confirmText: 'Revoke',
                danger: true,
            }))
        )
            return;
        setBusy(true);
        setError(null);
        setNewToken('');
        try {
            const res = await fetch('/api/admin/mcp/token', { method: 'DELETE' });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || 'TOKEN_REVOKE_FAILED');
            flash('Write token revoked.');
            loadStatus();
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(newToken);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* noop */
        }
    };

    const hasToken = !!status?.hasToken;
    const writeReady = writeEnabled && hasToken;

    return (
        <Panel title="Write access and bearer token">
            <div className="space-y-5">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="font-semibold text-[var(--text-bright)]">Enable write tools</p>
                        <p className="adm-help">
                            Advertises and allows create, update, and delete tools at{' '}
                            <code className="adm-code">/api/mcp</code>. Saved with Save changes.
                        </p>
                    </div>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={writeEnabled}
                        aria-label="Enable write tools"
                        onClick={() =>
                            patch({ write: { ...(config.write || {}), enabled: !writeEnabled } })
                        }
                        className="adm-switch"
                    />
                </div>

                <div className={`adm-notice ${writeReady ? 'adm-notice-ok' : 'adm-notice-warn'}`}>
                    {writeReady
                        ? 'Write access is active — enabled and a token is set.'
                        : writeEnabled
                        ? 'Write is enabled but no token is set — generate one below (writes stay blocked until then).'
                        : 'Write is disabled. Enable it above and generate a token to allow writes.'}
                </div>

                <div className="space-y-3 border-t border-[var(--hairline)] pt-4">
                    <div className="flex items-center gap-2">
                        <FaKey aria-hidden="true" className="text-[var(--text-secondary)]" />
                        <h3 className="adm-panel-title">Bearer token</h3>
                    </div>
                    <p className="adm-help">
                        {hasToken ? (
                            <>
                                A token is configured (ends{' '}
                                <code className="adm-code">…{status?.last4}</code>
                                {status?.updatedAt
                                    ? `, set ${new Date(status.updatedAt).toLocaleString()}`
                                    : ''}
                                ). Only its hash is stored.
                            </>
                        ) : (
                            'No token configured. Generate one, then send it as an Authorization: Bearer header.'
                        )}
                    </p>

                    {newToken && (
                        <div className="adm-notice adm-notice-warn space-y-2">
                            <p className="font-semibold text-[var(--text-bright)]">
                                Copy this token now — it will not be shown again.
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                                <input
                                    type="text"
                                    readOnly
                                    aria-label="New MCP write token"
                                    value={newToken}
                                    className="adm-input min-w-0 flex-1 font-mono"
                                />
                                <button type="button" onClick={copy} className="adm-btn">
                                    <FaCopy aria-hidden="true" /> {copied ? 'Copied' : 'Copy'}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={generate}
                            disabled={busy}
                            className="adm-btn adm-btn-primary"
                        >
                            {busy ? (
                                <FaSpinner aria-hidden="true" className="animate-spin" />
                            ) : (
                                <FaRotate aria-hidden="true" />
                            )}
                            {hasToken ? 'Rotate token' : 'Generate token'}
                        </button>
                        {hasToken && (
                            <button
                                type="button"
                                onClick={revoke}
                                disabled={busy}
                                className="adm-btn adm-btn-danger"
                            >
                                <FaTrashCan aria-hidden="true" /> Revoke token
                            </button>
                        )}
                    </div>
                </div>

                <p className="adm-help border-t border-[var(--hairline)] pt-4">
                    Usage: <code className="adm-code">POST /api/mcp</code> with header{' '}
                    <code className="adm-code">Authorization: Bearer &lt;token&gt;</code>. Read tools
                    stay public; write tools (create, update, delete) are hidden and rejected without
                    a valid token. All writes are audited and rate-limited.
                </p>
            </div>
        </Panel>
    );
}

export default function McpDashboard() {
    const [tab, setTab] = useState('server');
    const [config, setConfig] = useState(null);
    const [card, setCard] = useState(null);
    const [cardUrl, setCardUrl] = useState('');
    const [showPreview, setShowPreview] = useState(true);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [notice, setNotice] = useState(null);

    const flash = (msg) => {
        setNotice(msg);
        setTimeout(() => setNotice(null), 4000);
    };
    const patch = (p) => setConfig((c) => ({ ...c, ...p }));

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/mcp/config', { cache: 'no-store' });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || 'LOAD_FAILED');
            setConfig(json.config);
            setCard(json.card);
            setCardUrl(json.cardUrl);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const save = async () => {
        setSaving(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/mcp/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config),
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || 'SAVE_FAILED');
            setConfig(json.config);
            setCard(json.card);
            flash('MCP server configuration saved.');
        } catch (e) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="adm-page">
            <PageHeader
                command="mcp"
                title="MCP server"
                description="Configure the Model Context Protocol server card served to agents."
                actions={
                    <>
                        <a
                            href="/docs/mcp"
                            target="_blank"
                            rel="noreferrer"
                            className="adm-btn"
                        >
                            <FaBook aria-hidden="true" /> Documentation
                        </a>
                        {cardUrl && (
                            <a
                                href={cardUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="adm-btn font-mono"
                            >
                                <FaUpRightFromSquare aria-hidden="true" /> server-card.json
                            </a>
                        )}
                        <button
                            type="button"
                            onClick={save}
                            disabled={saving || !config}
                            className="adm-btn adm-btn-primary"
                        >
                            {saving ? (
                                <FaSpinner aria-hidden="true" className="animate-spin" />
                            ) : (
                                <FaFloppyDisk aria-hidden="true" />
                            )}
                            {saving ? 'Saving' : 'Save changes'}
                        </button>
                    </>
                }
            />

            {error && (
                <div role="alert" className="adm-notice adm-notice-error">
                    {error}
                </div>
            )}
            {notice && (
                <div role="status" className="adm-notice adm-notice-ok">
                    {notice}
                </div>
            )}

            {loading || !config ? (
                <section className="adm-panel">
                    <Loading label="Loading MCP configuration" rows={6} />
                </section>
            ) : (
                <>
                    {!config.enabled && (
                        <div className="adm-notice adm-notice-warn">
                            MCP server is disabled. The server card is still served but advertises no
                            active session — enable it on the Server tab.
                        </div>
                    )}

                    <div role="tablist" aria-label="MCP sections" className="adm-tabs">
                        {TABS.map((t) => (
                            <button
                                key={t.key}
                                id={`mcp-tab-${t.key}`}
                                type="button"
                                role="tab"
                                aria-selected={tab === t.key}
                                aria-controls="mcp-tabpanel"
                                onClick={() => setTab(t.key)}
                                className="adm-tab"
                            >
                                {t.icon} {t.label}
                            </button>
                        ))}
                    </div>

                    <div className={showPreview ? 'adm-split' : 'adm-stack'}>
                        <div
                            id="mcp-tabpanel"
                            role="tabpanel"
                            aria-labelledby={`mcp-tab-${tab}`}
                            tabIndex={0}
                            className="adm-stack"
                        >
                            {tab === 'server' && <ServerTab config={config} patch={patch} />}
                            {tab === 'transports' && <TransportsTab config={config} patch={patch} />}
                            {tab === 'capabilities' && <CapabilitiesTab config={config} patch={patch} />}
                            {tab === 'tools' && <ToolsTab config={config} patch={patch} />}
                            {tab === 'resources' && <ResourcesTab config={config} patch={patch} />}
                            {tab === 'prompts' && <PromptsTab config={config} patch={patch} />}
                            {tab === 'links' && <LinksTab config={config} patch={patch} />}
                            {tab === 'security' && (
                                <SecurityTab
                                    config={config}
                                    patch={patch}
                                    flash={flash}
                                    setError={setError}
                                />
                            )}
                        </div>

                        {showPreview && (
                            <aside className="adm-stack adm-side">
                                <Panel
                                    title="Published card"
                                    actions={
                                        <button
                                            type="button"
                                            onClick={() => setShowPreview(false)}
                                            aria-label="Hide published card preview"
                                            className="adm-icon-btn"
                                        >
                                            <FaEyeSlash aria-hidden="true" />
                                        </button>
                                    }
                                >
                                    <p className="adm-help mb-3">
                                        Reflects the last saved state. Save changes to update.
                                    </p>
                                    <pre className="adm-code max-h-[65vh] whitespace-pre-wrap text-xs">
                                        {JSON.stringify(card, null, 2)}
                                    </pre>
                                </Panel>
                            </aside>
                        )}
                    </div>

                    {!showPreview && (
                        <div>
                            <button
                                type="button"
                                onClick={() => setShowPreview(true)}
                                className="adm-btn"
                            >
                                <FaEye aria-hidden="true" /> Show published card
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
