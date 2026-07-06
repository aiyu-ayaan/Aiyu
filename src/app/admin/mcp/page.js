"use client";
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
    FaPlug, FaServer, FaScrewdriverWrench, FaFolderOpen, FaComment, FaLink,
    FaSliders, FaFloppyDisk, FaPlus, FaTrash, FaSpinner, FaTriangleExclamation,
    FaCircleCheck, FaUpRightFromSquare, FaEyeSlash, FaEye, FaBook,
    FaShieldHalved, FaKey, FaRotate, FaCopy,
} from 'react-icons/fa6';

const TABS = [
    { key: 'server', label: 'Server', icon: <FaServer /> },
    { key: 'transports', label: 'Transports', icon: <FaPlug /> },
    { key: 'capabilities', label: 'Capabilities', icon: <FaSliders /> },
    { key: 'tools', label: 'Tools', icon: <FaScrewdriverWrench /> },
    { key: 'resources', label: 'Resources', icon: <FaFolderOpen /> },
    { key: 'prompts', label: 'Prompts', icon: <FaComment /> },
    { key: 'links', label: 'Links', icon: <FaLink /> },
    { key: 'security', label: 'Security', icon: <FaShieldHalved /> },
];

const TRANSPORT_TYPES = ['webmcp', 'streamable-http', 'http', 'sse', 'stdio'];
const ANNOTATIONS = [
    { key: 'readOnlyHint', label: 'Read-only' },
    { key: 'destructiveHint', label: 'Destructive' },
    { key: 'idempotentHint', label: 'Idempotent' },
    { key: 'openWorldHint', label: 'Open-world' },
];

const inputClass = "w-full bg-slate-950/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-cyan-500/40 outline-none";
const labelClass = "block text-xs font-mono text-slate-500 mb-1";

function Panel({ children, className = '' }) {
    return <div className={`bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 ${className}`}>{children}</div>;
}

function Toggle({ checked, onChange, label }) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-mono transition-colors ${checked ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-slate-200'}`}
        >
            <span className={`w-8 h-4 rounded-full relative transition-colors ${checked ? 'bg-emerald-500/60' : 'bg-slate-700'}`}>
                <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${checked ? 'left-4' : 'left-0.5'}`} />
            </span>
            {label}
        </button>
    );
}

function SectionHeader({ title, onAdd, addLabel }) {
    return (
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-mono uppercase tracking-widest text-cyan-400">{title}</h3>
            {onAdd && (
                <button onClick={onAdd} className="text-xs font-mono px-2 py-1 rounded bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 flex items-center gap-1">
                    <FaPlus size={10} /> {addLabel}
                </button>
            )}
        </div>
    );
}

// ─────────────────────────────── Tabs ───────────────────────────────

function ServerTab({ config, patch }) {
    const s = config.server;
    const setServer = (p) => patch({ server: { ...s, ...p } });
    return (
        <Panel className="p-5 space-y-4 max-w-3xl">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/5">
                <div>
                    <h3 className="text-sm font-bold text-white">MCP Server</h3>
                    <p className="text-xs text-slate-500">Master switch and identity advertised in the server card.</p>
                </div>
                <Toggle checked={config.enabled} onChange={(v) => patch({ enabled: v })} label={config.enabled ? 'ENABLED' : 'DISABLED'} />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>Name (identifier)</label>
                    <input value={s.name} onChange={(e) => setServer({ name: e.target.value })} placeholder="aiyu" className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>Version</label>
                    <input value={s.version} onChange={(e) => setServer({ version: e.target.value })} placeholder="1.0.0" className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>Title (display name)</label>
                    <input value={s.title} onChange={(e) => setServer({ title: e.target.value })} placeholder="Aiyu" className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>Website URL</label>
                    <input value={s.websiteUrl} onChange={(e) => setServer({ websiteUrl: e.target.value })} placeholder="/ or https://…" className={inputClass} />
                </div>
            </div>
            <div>
                <label className={labelClass}>Description</label>
                <textarea value={s.description} onChange={(e) => setServer({ description: e.target.value })} rows={2} className={inputClass} />
            </div>
            <div>
                <label className={labelClass}>Instructions (guidance sent to connecting clients)</label>
                <textarea value={s.instructions} onChange={(e) => setServer({ instructions: e.target.value })} rows={4} className={`${inputClass} font-mono`} placeholder="Optional. How agents should use this MCP server." />
            </div>
        </Panel>
    );
}

function TransportsTab({ config, patch }) {
    const list = config.transports;
    const update = (i, p) => patch({ transports: list.map((t, idx) => (idx === i ? { ...t, ...p } : t)) });
    const add = () => patch({ transports: [...list, { type: 'webmcp', endpoint: '/', description: '' }] });
    const remove = (i) => patch({ transports: list.filter((_, idx) => idx !== i) });
    return (
        <Panel className="p-5">
            <SectionHeader title="Transports" onAdd={add} addLabel="TRANSPORT" />
            <div className="space-y-3">
                {list.map((t, i) => (
                    <div key={i} className="rounded-xl border border-white/5 bg-slate-950/40 p-3 space-y-2">
                        <div className="flex items-center gap-2">
                            <select value={t.type} onChange={(e) => update(i, { type: e.target.value })} className={`${inputClass} w-48`}>
                                {TRANSPORT_TYPES.map((tp) => <option key={tp} value={tp}>{tp}</option>)}
                            </select>
                            <input value={t.endpoint} onChange={(e) => update(i, { endpoint: e.target.value })} placeholder="/ or https://host/rpc" className={inputClass} />
                            <button onClick={() => remove(i)} className="text-slate-500 hover:text-red-400 p-2"><FaTrash size={12} /></button>
                        </div>
                        <input value={t.description} onChange={(e) => update(i, { description: e.target.value })} placeholder="Description (optional)" className={inputClass} />
                    </div>
                ))}
                {!list.length && <p className="text-xs text-slate-600 font-mono">No transports defined.</p>}
            </div>
        </Panel>
    );
}

function CapRow({ title, cap, keys, onChange }) {
    return (
        <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4">
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-200 font-mono">{title}</span>
                <Toggle checked={cap.enabled} onChange={(v) => onChange({ enabled: v })} label={cap.enabled ? 'ON' : 'OFF'} />
            </div>
            {cap.enabled && keys.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {keys.map((k) => (
                        <Toggle key={k.key} checked={!!cap[k.key]} onChange={(v) => onChange({ [k.key]: v })} label={k.label} />
                    ))}
                </div>
            )}
        </div>
    );
}

function CapabilitiesTab({ config, patch }) {
    const c = config.capabilities;
    const setCap = (name, p) => patch({ capabilities: { ...c, [name]: { ...c[name], ...p } } });
    return (
        <Panel className="p-5 space-y-3 max-w-3xl">
            <SectionHeader title="Advertised Capabilities" />
            <CapRow title="tools" cap={c.tools} keys={[{ key: 'listChanged', label: 'listChanged' }]} onChange={(p) => setCap('tools', p)} />
            <CapRow title="resources" cap={c.resources} keys={[{ key: 'subscribe', label: 'subscribe' }, { key: 'listChanged', label: 'listChanged' }]} onChange={(p) => setCap('resources', p)} />
            <CapRow title="prompts" cap={c.prompts} keys={[{ key: 'listChanged', label: 'listChanged' }]} onChange={(p) => setCap('prompts', p)} />
            <CapRow title="logging" cap={c.logging} keys={[]} onChange={(p) => setCap('logging', p)} />
            <CapRow title="completions" cap={c.completions} keys={[]} onChange={(p) => setCap('completions', p)} />
        </Panel>
    );
}

function ToolsTab({ config, patch }) {
    const list = config.tools;
    const update = (i, p) => patch({ tools: list.map((t, idx) => (idx === i ? { ...t, ...p } : t)) });
    const setAnn = (i, key, v) => update(i, { annotations: { ...list[i].annotations, [key]: v } });
    const add = () => patch({ tools: [...list, { name: '', title: '', description: '', enabled: true, inputSchema: '', annotations: {} }] });
    const remove = (i) => patch({ tools: list.filter((_, idx) => idx !== i) });
    return (
        <Panel className="p-5">
            <SectionHeader title="Tools" onAdd={add} addLabel="TOOL" />
            <div className="space-y-4">
                {list.map((t, i) => (
                    <div key={i} className="rounded-xl border border-white/5 bg-slate-950/40 p-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <input value={t.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="tool.name" className={`${inputClass} font-mono`} />
                            <input value={t.title} onChange={(e) => update(i, { title: e.target.value })} placeholder="Title" className={inputClass} />
                            <Toggle checked={t.enabled} onChange={(v) => update(i, { enabled: v })} label={t.enabled ? 'ON' : 'OFF'} />
                            <button onClick={() => remove(i)} className="text-slate-500 hover:text-red-400 p-2"><FaTrash size={12} /></button>
                        </div>
                        <textarea value={t.description} onChange={(e) => update(i, { description: e.target.value })} rows={2} placeholder="Description" className={inputClass} />
                        <div>
                            <label className={labelClass}>Input schema (JSON — leave blank for none)</label>
                            <textarea value={t.inputSchema} onChange={(e) => update(i, { inputSchema: e.target.value })} rows={4} placeholder='{"type":"object","properties":{}}' className={`${inputClass} font-mono`} />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {ANNOTATIONS.map((a) => (
                                <Toggle key={a.key} checked={!!t.annotations?.[a.key]} onChange={(v) => setAnn(i, a.key, v)} label={a.label} />
                            ))}
                        </div>
                    </div>
                ))}
                {!list.length && <p className="text-xs text-slate-600 font-mono">No tools defined.</p>}
            </div>
        </Panel>
    );
}

function ResourcesTab({ config, patch }) {
    const list = config.resources;
    const update = (i, p) => patch({ resources: list.map((r, idx) => (idx === i ? { ...r, ...p } : r)) });
    const add = () => patch({ resources: [...list, { uri: '', name: '', title: '', description: '', mimeType: '', enabled: true }] });
    const remove = (i) => patch({ resources: list.filter((_, idx) => idx !== i) });
    return (
        <Panel className="p-5">
            <SectionHeader title="Resources" onAdd={add} addLabel="RESOURCE" />
            <div className="space-y-4">
                {list.map((r, i) => (
                    <div key={i} className="rounded-xl border border-white/5 bg-slate-950/40 p-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <input value={r.uri} onChange={(e) => update(i, { uri: e.target.value })} placeholder="/api/home or https://…" className={`${inputClass} font-mono`} />
                            <Toggle checked={r.enabled} onChange={(v) => update(i, { enabled: v })} label={r.enabled ? 'ON' : 'OFF'} />
                            <button onClick={() => remove(i)} className="text-slate-500 hover:text-red-400 p-2"><FaTrash size={12} /></button>
                        </div>
                        <div className="grid md:grid-cols-3 gap-2">
                            <input value={r.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="name" className={inputClass} />
                            <input value={r.title} onChange={(e) => update(i, { title: e.target.value })} placeholder="Title" className={inputClass} />
                            <input value={r.mimeType} onChange={(e) => update(i, { mimeType: e.target.value })} placeholder="mimeType (e.g. application/json)" className={inputClass} />
                        </div>
                        <input value={r.description} onChange={(e) => update(i, { description: e.target.value })} placeholder="Description" className={inputClass} />
                    </div>
                ))}
                {!list.length && <p className="text-xs text-slate-600 font-mono">No resources defined.</p>}
            </div>
        </Panel>
    );
}

function PromptsTab({ config, patch }) {
    const list = config.prompts;
    const update = (i, p) => patch({ prompts: list.map((pr, idx) => (idx === i ? { ...pr, ...p } : pr)) });
    const add = () => patch({ prompts: [...list, { name: '', title: '', description: '', enabled: true, arguments: [] }] });
    const remove = (i) => patch({ prompts: list.filter((_, idx) => idx !== i) });
    const updateArg = (pi, ai, p) => update(pi, { arguments: list[pi].arguments.map((a, idx) => (idx === ai ? { ...a, ...p } : a)) });
    const addArg = (pi) => update(pi, { arguments: [...list[pi].arguments, { name: '', description: '', required: false }] });
    const removeArg = (pi, ai) => update(pi, { arguments: list[pi].arguments.filter((_, idx) => idx !== ai) });
    return (
        <Panel className="p-5">
            <SectionHeader title="Prompts" onAdd={add} addLabel="PROMPT" />
            <div className="space-y-4">
                {list.map((pr, i) => (
                    <div key={i} className="rounded-xl border border-white/5 bg-slate-950/40 p-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <input value={pr.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="prompt_name" className={`${inputClass} font-mono`} />
                            <input value={pr.title} onChange={(e) => update(i, { title: e.target.value })} placeholder="Title" className={inputClass} />
                            <Toggle checked={pr.enabled} onChange={(v) => update(i, { enabled: v })} label={pr.enabled ? 'ON' : 'OFF'} />
                            <button onClick={() => remove(i)} className="text-slate-500 hover:text-red-400 p-2"><FaTrash size={12} /></button>
                        </div>
                        <input value={pr.description} onChange={(e) => update(i, { description: e.target.value })} placeholder="Description" className={inputClass} />
                        <div className="pl-3 border-l border-white/10 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-mono text-slate-500">Arguments</span>
                                <button onClick={() => addArg(i)} className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 flex items-center gap-1"><FaPlus size={9} /> ARG</button>
                            </div>
                            {pr.arguments.map((a, ai) => (
                                <div key={ai} className="flex items-center gap-2">
                                    <input value={a.name} onChange={(e) => updateArg(i, ai, { name: e.target.value })} placeholder="argName" className={`${inputClass} font-mono w-40`} />
                                    <input value={a.description} onChange={(e) => updateArg(i, ai, { description: e.target.value })} placeholder="Description" className={inputClass} />
                                    <Toggle checked={a.required} onChange={(v) => updateArg(i, ai, { required: v })} label="required" />
                                    <button onClick={() => removeArg(i, ai)} className="text-slate-500 hover:text-red-400 p-1.5"><FaTrash size={11} /></button>
                                </div>
                            ))}
                            {!pr.arguments.length && <p className="text-xs text-slate-600 font-mono">No arguments.</p>}
                        </div>
                    </div>
                ))}
                {!list.length && <p className="text-xs text-slate-600 font-mono">No prompts defined.</p>}
            </div>
        </Panel>
    );
}

function LinksTab({ config, patch }) {
    const list = config.links;
    const update = (i, p) => patch({ links: list.map((l, idx) => (idx === i ? { ...l, ...p } : l)) });
    const add = () => patch({ links: [...list, { name: '', url: '' }] });
    const remove = (i) => patch({ links: list.filter((_, idx) => idx !== i) });
    return (
        <Panel className="p-5 max-w-3xl">
            <SectionHeader title="Links" onAdd={add} addLabel="LINK" />
            <div className="space-y-2">
                {list.map((l, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <input value={l.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="key (e.g. documentation)" className={`${inputClass} w-56 font-mono`} />
                        <input value={l.url} onChange={(e) => update(i, { url: e.target.value })} placeholder="/path or https://…" className={inputClass} />
                        <button onClick={() => remove(i)} className="text-slate-500 hover:text-red-400 p-2"><FaTrash size={12} /></button>
                    </div>
                ))}
                {!list.length && <p className="text-xs text-slate-600 font-mono">No links defined.</p>}
            </div>
        </Panel>
    );
}

function SecurityTab({ config, patch, flash, setError }) {
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
        } catch (e) { setError(e.message); }
    }, [setError]);

    useEffect(() => { loadStatus(); }, [loadStatus]);

    const generate = async () => {
        setBusy(true); setError(null); setNewToken('');
        try {
            const res = await fetch('/api/admin/mcp/token', { method: 'POST' });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || 'TOKEN_GEN_FAILED');
            setNewToken(json.data.token);
            flash('Write token generated — copy it now, it is shown only once.');
            loadStatus();
        } catch (e) { setError(e.message); } finally { setBusy(false); }
    };

    const revoke = async () => {
        if (!window.confirm('Revoke the MCP write token? Clients using it will lose write access immediately.')) return;
        setBusy(true); setError(null); setNewToken('');
        try {
            const res = await fetch('/api/admin/mcp/token', { method: 'DELETE' });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || 'TOKEN_REVOKE_FAILED');
            flash('Write token revoked.');
            loadStatus();
        } catch (e) { setError(e.message); } finally { setBusy(false); }
    };

    const copy = async () => {
        try { await navigator.clipboard.writeText(newToken); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* noop */ }
    };

    const hasToken = !!status?.hasToken;
    const writeReady = writeEnabled && hasToken;

    return (
        <Panel className="p-5 space-y-5 max-w-3xl">
            <div className="pb-4 border-b border-white/5">
                <h3 className="text-sm font-bold text-white">Write Access</h3>
                <p className="text-xs text-slate-500">Writes require BOTH the switch below and a valid bearer token. Both off by default.</p>
            </div>

            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-sm text-slate-200 font-mono">Enable write tools</p>
                    <p className="text-xs text-slate-500">Advertises &amp; allows create/update/delete tools at <code className="text-cyan-400">/api/mcp</code>. Saved with the main SAVE button.</p>
                </div>
                <Toggle checked={writeEnabled} onChange={(v) => patch({ write: { ...(config.write || {}), enabled: v } })} label={writeEnabled ? 'ENABLED' : 'DISABLED'} />
            </div>

            <div className={`text-xs font-mono px-3 py-2 rounded-lg border ${writeReady ? 'text-emerald-300 border-emerald-500/20 bg-emerald-500/10' : 'text-amber-300 border-amber-500/20 bg-amber-500/10'}`}>
                {writeReady
                    ? 'Write access is ACTIVE — enabled and a token is set.'
                    : writeEnabled
                        ? 'Write is enabled but NO token is set — generate one below (writes stay blocked until then).'
                        : 'Write is disabled. Enable it above and generate a token to allow writes.'}
            </div>

            <div className="pt-2 border-t border-white/5">
                <div className="flex items-center gap-2 mb-2">
                    <FaKey className="text-cyan-400" size={14} />
                    <h4 className="text-sm font-mono uppercase tracking-widest text-cyan-400">Bearer Token</h4>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                    {hasToken
                        ? <>A token is configured (ends <code className="text-slate-300">…{status?.last4}</code>{status?.updatedAt ? `, set ${new Date(status.updatedAt).toLocaleString()}` : ''}). Only its hash is stored.</>
                        : 'No token configured. Generate one, then send it as an Authorization: Bearer header.'}
                </p>

                {newToken && (
                    <div className="mb-3 p-3 rounded-lg border border-cyan-500/30 bg-slate-950/60">
                        <p className="text-[11px] text-amber-300 font-mono mb-2">Copy this now — it will not be shown again.</p>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 text-xs text-cyan-300 break-all font-mono">{newToken}</code>
                            <button onClick={copy} className="shrink-0 px-2 py-1 rounded bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 text-xs font-mono flex items-center gap-1">
                                <FaCopy size={11} /> {copied ? 'COPIED' : 'COPY'}
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex gap-2">
                    <button onClick={generate} disabled={busy} className="px-4 py-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/25 disabled:opacity-50 flex items-center gap-2 font-mono text-sm">
                        {busy ? <FaSpinner className="animate-spin" /> : <FaRotate />} {hasToken ? 'ROTATE TOKEN' : 'GENERATE TOKEN'}
                    </button>
                    {hasToken && (
                        <button onClick={revoke} disabled={busy} className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/20 disabled:opacity-50 flex items-center gap-2 font-mono text-sm">
                            <FaTrash size={12} /> REVOKE
                        </button>
                    )}
                </div>
            </div>

            <div className="pt-3 border-t border-white/5 text-[11px] text-slate-500 font-mono leading-relaxed">
                Usage: <code className="text-slate-300">POST /api/mcp</code> with header{' '}
                <code className="text-slate-300">Authorization: Bearer &lt;token&gt;</code>. Read tools stay public; write tools
                (create/update/delete) are hidden and rejected without a valid token. All writes are audited &amp; rate-limited.
            </div>
        </Panel>
    );
}

// ─────────────────────────────── Page ───────────────────────────────

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

    const flash = (msg) => { setNotice(msg); setTimeout(() => setNotice(null), 4000); };
    const patch = (p) => setConfig((c) => ({ ...c, ...p }));

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const res = await fetch('/api/admin/mcp/config', { cache: 'no-store' });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || 'LOAD_FAILED');
            setConfig(json.config);
            setCard(json.card);
            setCardUrl(json.cardUrl);
        } catch (e) { setError(e.message); } finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const save = async () => {
        setSaving(true); setError(null);
        try {
            const res = await fetch('/api/admin/mcp/config', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config),
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || 'SAVE_FAILED');
            setConfig(json.config);
            setCard(json.card);
            flash('MCP server configuration saved.');
        } catch (e) { setError(e.message); } finally { setSaving(false); }
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
            <div className="mb-8">
                <Link href="/admin" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors mb-4 text-sm font-mono opacity-60 hover:opacity-100">
                    ← BACK_TO_COMMAND_CENTER
                </Link>
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
                            <FaPlug className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-white mb-1 tracking-tight">MCP Server</h1>
                            <p className="text-slate-400">Configure the Model Context Protocol server card served to agents.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <a href="/docs/mcp" target="_blank" rel="noreferrer" className="px-3 py-2 rounded-xl bg-slate-900/60 border border-white/10 text-slate-300 hover:text-cyan-300 flex items-center gap-2 font-mono text-xs">
                            <FaBook size={12} /> Documentation
                        </a>
                        {cardUrl && (
                            <a href={cardUrl} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-xl bg-slate-900/60 border border-white/10 text-slate-300 hover:text-cyan-300 flex items-center gap-2 font-mono text-xs">
                                <FaUpRightFromSquare size={12} /> server-card.json
                            </a>
                        )}
                        <button onClick={save} disabled={saving || !config} className="px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-50 flex items-center gap-2 font-mono text-sm">
                            {saving ? <FaSpinner className="animate-spin" /> : <FaFloppyDisk />} SAVE
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="p-4 rounded-xl mb-6 flex items-center gap-3 border bg-red-500/10 text-red-400 border-red-500/20">
                    <FaTriangleExclamation /> <span className="font-mono text-sm tracking-wide">{error}</span>
                </div>
            )}
            {notice && (
                <div className="p-4 rounded-xl mb-6 flex items-center gap-3 border bg-emerald-500/10 text-emerald-300 border-emerald-500/20">
                    <FaCircleCheck /> <span className="font-mono text-sm tracking-wide">{notice}</span>
                </div>
            )}

            {loading || !config ? (
                <p className="text-slate-500 font-mono text-sm">Loading MCP configuration…</p>
            ) : (
                <>
                    {!config.enabled && (
                        <div className="p-3 rounded-xl mb-6 border bg-amber-500/10 text-amber-300 border-amber-500/20 font-mono text-xs">
                            MCP server is disabled. The server card is still served but advertises no active session — enable it on the Server tab.
                        </div>
                    )}
                    <div className="flex flex-wrap gap-2 mb-6">
                        {TABS.map((t) => (
                            <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 rounded-lg text-sm font-mono flex items-center gap-2 transition-all border ${tab === t.key ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/30' : 'bg-slate-900/60 text-slate-400 border-white/10 hover:text-slate-200'}`}>
                                {t.icon} {t.label}
                            </button>
                        ))}
                    </div>

                    <div className="grid lg:grid-cols-3 gap-6">
                        <div className={showPreview ? 'lg:col-span-2' : 'lg:col-span-3'}>
                            {tab === 'server' && <ServerTab config={config} patch={patch} />}
                            {tab === 'transports' && <TransportsTab config={config} patch={patch} />}
                            {tab === 'capabilities' && <CapabilitiesTab config={config} patch={patch} />}
                            {tab === 'tools' && <ToolsTab config={config} patch={patch} />}
                            {tab === 'resources' && <ResourcesTab config={config} patch={patch} />}
                            {tab === 'prompts' && <PromptsTab config={config} patch={patch} />}
                            {tab === 'links' && <LinksTab config={config} patch={patch} />}
                            {tab === 'security' && <SecurityTab config={config} patch={patch} flash={flash} setError={setError} />}
                        </div>

                        {showPreview && (
                            <Panel className="p-5 h-fit lg:sticky lg:top-6">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-mono uppercase tracking-widest text-cyan-400">Published card</h3>
                                    <button onClick={() => setShowPreview(false)} className="text-slate-500 hover:text-slate-300" title="Hide preview"><FaEyeSlash size={14} /></button>
                                </div>
                                <p className="text-[11px] text-slate-500 font-mono mb-3">Reflects the last save. Press SAVE to update.</p>
                                <pre className="text-[11px] leading-relaxed font-mono text-slate-300 whitespace-pre-wrap bg-slate-950/60 border border-white/10 rounded-lg p-4 overflow-x-auto max-h-[70vh]">{JSON.stringify(card, null, 2)}</pre>
                            </Panel>
                        )}
                    </div>

                    {!showPreview && (
                        <button onClick={() => setShowPreview(true)} className="mt-4 text-xs font-mono text-slate-500 hover:text-cyan-300 flex items-center gap-2">
                            <FaEye size={12} /> Show published card
                        </button>
                    )}
                </>
            )}
        </div>
    );
}
