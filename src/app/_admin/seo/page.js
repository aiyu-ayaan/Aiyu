"use client";
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import { useAdminFeedback } from '@/app/components/admin/feedback/AdminFeedbackProvider';
import {
    FaMagnifyingGlass, FaArrowsRotate, FaTriangleExclamation, FaCircleCheck,
    FaCircleExclamation, FaRobot, FaSitemap, FaGoogle, FaListCheck,
    FaFloppyDisk, FaPlus, FaTrash, FaPaperPlane, FaSpinner, FaUpRightFromSquare,
} from 'react-icons/fa6';

const TABS = [
    { key: 'audit', label: 'Meta Checker', icon: <FaListCheck /> },
    { key: 'crawl', label: 'Crawl Audit', icon: <FaMagnifyingGlass /> },
    { key: 'robots', label: 'Robots & Sitemap', icon: <FaSitemap /> },
    { key: 'indexing', label: 'Indexing', icon: <FaGoogle /> },
];

const CHANGE_FREQS = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'];

function severityColor(severity) {
    if (severity === 'error') return 'text-red-400 bg-red-500/10 border-red-500/20';
    if (severity === 'warning') return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
}

function Panel({ children, className = '' }) {
    return <div className={`bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 ${className}`}>{children}</div>;
}

function StatPill({ label, value, accent }) {
    return (
        <div className="bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 flex-1 min-w-[110px]">
            <div className={`text-2xl font-bold tabular-nums ${accent}`}>{value ?? 0}</div>
            <div className="text-xs font-mono uppercase tracking-widest text-slate-500">{label}</div>
        </div>
    );
}

// ─────────────────────────── Meta Checker tab ───────────────────────────

function AuditGroup({ title, records }) {
    if (!records?.length) return null;
    return (
        <Panel className="p-5 mb-6">
            <h3 className="text-sm font-mono uppercase tracking-widest text-cyan-400 mb-4">{title} ({records.length})</h3>
            <div className="space-y-2">
                {records.map((r) => {
                    const worst = r.issues.some((i) => i.severity === 'error') ? 'error'
                        : r.issues.length ? 'warning' : 'ok';
                    return (
                        <div key={r.id} className="rounded-xl border border-white/5 bg-slate-950/40 p-3">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className={`shrink-0 ${worst === 'error' ? 'text-red-400' : worst === 'warning' ? 'text-amber-400' : 'text-emerald-400'}`}>
                                        {worst === 'ok' ? <FaCircleCheck /> : <FaCircleExclamation />}
                                    </span>
                                    <span className="text-slate-200 text-sm truncate">{r.title}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <a href={r.url} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-cyan-300" title="View live"><FaUpRightFromSquare size={12} /></a>
                                    <Link href={r.editUrl} className="text-xs font-mono px-2 py-1 rounded bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20">EDIT</Link>
                                </div>
                            </div>
                            {r.issues.length > 0 && (
                                <ul className="mt-2 space-y-1 pl-6">
                                    {r.issues.map((i, idx) => (
                                        <li key={idx} className={`text-xs px-2 py-1 rounded border inline-block mr-2 ${severityColor(i.severity)}`}>{i.message}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    );
                })}
            </div>
        </Panel>
    );
}

function MetaCheckerTab({ audit, loading, onRefresh, onFixAll, fixingState }) {
    const s = audit?.summary || {};
    const hasFixableIssues = (s.warnings || 0) + (s.errors || 0) > 0;

    return (
        <div>
            <div className="flex flex-wrap gap-3 mb-6">
                <StatPill label="Records" value={s.total} accent="text-cyan-300" />
                <StatPill label="Clean" value={s.ok} accent="text-emerald-400" />
                <StatPill label="Warnings" value={s.warnings} accent="text-amber-400" />
                <StatPill label="Errors" value={s.errors} accent="text-red-400" />
                <button 
                    onClick={onRefresh} 
                    disabled={loading || fixingState === 'running'}
                    className="px-4 rounded-xl bg-slate-900/60 border border-white/10 text-slate-300 hover:text-cyan-300 disabled:opacity-50 flex items-center gap-2 font-mono text-sm"
                >
                    <FaArrowsRotate className={loading ? 'animate-spin' : ''} /> RESCAN
                </button>
                {hasFixableIssues && (
                    <button
                        onClick={onFixAll}
                        disabled={loading || fixingState === 'running'}
                        className="px-4 py-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 disabled:opacity-50 flex items-center gap-2 font-mono text-sm transition-colors"
                    >
                        <FaRobot className={fixingState === 'running' ? 'animate-spin' : ''} /> FIX WARNINGS WITH AI
                    </button>
                )}
            </div>
            {loading && !audit ? <p className="text-slate-500 font-mono text-sm">Scanning…</p> : (
                <>
                    <AuditGroup title="Blogs" records={audit?.groups?.blogs} />
                    <AuditGroup title="Projects" records={audit?.groups?.projects} />
                    <AuditGroup title="Apps" records={audit?.groups?.apps} />
                    <AuditGroup title="Static Pages" records={audit?.groups?.static} />
                </>
            )}
        </div>
    );
}

// ─────────────────────────── Crawl Audit tab ───────────────────────────

function CrawlTab({ crawl, crawling, onRun }) {
    const s = crawl?.summary || {};
    return (
        <div>
            <div className="flex flex-wrap gap-3 mb-6 items-stretch">
                <StatPill label="URLs" value={s.total} accent="text-cyan-300" />
                <StatPill label="OK" value={s.ok} accent="text-emerald-400" />
                <StatPill label="Warnings" value={s.warnings} accent="text-amber-400" />
                <StatPill label="Errors" value={s.errors} accent="text-red-400" />
                <StatPill label="Avg TTFB" value={s.avgMs ? `${s.avgMs}ms` : '—'} accent="text-violet-300" />
                <button onClick={onRun} disabled={crawling} className="px-4 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/25 disabled:opacity-50 flex items-center gap-2 font-mono text-sm">
                    {crawling ? <FaSpinner className="animate-spin" /> : <FaMagnifyingGlass />} RUN AUDIT
                </button>
            </div>
            {crawl?.base && <p className="text-xs font-mono text-slate-500 mb-3">Crawled as Googlebot · {crawl.base}</p>}
            <Panel className="p-2 divide-y divide-white/5">
                {!crawl ? <p className="text-slate-500 font-mono text-sm p-4">Run an audit to crawl every sitemap URL live.</p>
                    : crawl.results.map((r) => (
                        <div key={r.url} className="p-3">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-slate-300 text-sm truncate">{r.url}</span>
                                <span className={`shrink-0 text-xs font-mono px-2 py-0.5 rounded border ${r.status === 200 ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' : 'text-red-400 border-red-500/20 bg-red-500/10'}`}>
                                    {r.status}{typeof r.ms === 'number' ? ` · ${r.ms}ms` : ''}
                                </span>
                            </div>
                            {r.issues?.length > 0 && (
                                <ul className="mt-1 pl-2">
                                    {r.issues.map((i, idx) => (
                                        <li key={idx} className={`text-xs inline-block mr-2 mt-1 px-2 py-0.5 rounded border ${severityColor(i.severity)}`}>{i.message}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ))}
            </Panel>
        </div>
    );
}

// ─────────────────────── Robots & Sitemap tab ───────────────────────

function linesToArray(text) {
    return String(text || '').split('\n').map((l) => l.trim()).filter(Boolean);
}

function buildRobotsPreview(rules, extraSitemaps, sitemapUrl) {
    const out = [];
    for (const rule of rules) {
        out.push(`User-agent: ${rule.userAgent || '*'}`);
        for (const a of linesToArray(rule.allowText)) out.push(`Allow: ${a}`);
        for (const d of linesToArray(rule.disallowText)) out.push(`Disallow: ${d}`);
        if (Number.isFinite(Number(rule.crawlDelay)) && String(rule.crawlDelay) !== '') out.push(`Crawl-delay: ${rule.crawlDelay}`);
        out.push('');
    }
    out.push(`Sitemap: ${sitemapUrl}`);
    for (const sm of linesToArray(extraSitemaps)) out.push(`Sitemap: ${sm}`);
    return out.join('\n');
}

function RobotsSitemapTab({ form, setForm, onSave, saving, siteSitemapUrl }) {
    const updateRule = (idx, patch) => {
        setForm((f) => ({ ...f, robotsRules: f.robotsRules.map((r, i) => (i === idx ? { ...r, ...patch } : r)) }));
    };
    const addRule = () => setForm((f) => ({ ...f, robotsRules: [...f.robotsRules, { userAgent: '', allowText: '/', disallowText: '', crawlDelay: '' }] }));
    const removeRule = (idx) => setForm((f) => ({ ...f, robotsRules: f.robotsRules.filter((_, i) => i !== idx) }));

    const addUrl = () => setForm((f) => ({ ...f, extraUrls: [...f.extraUrls, { url: '', changeFrequency: 'monthly', priority: 0.5 }] }));
    const updateUrl = (idx, patch) => setForm((f) => ({ ...f, extraUrls: f.extraUrls.map((u, i) => (i === idx ? { ...u, ...patch } : u)) }));
    const removeUrl = (idx) => setForm((f) => ({ ...f, extraUrls: f.extraUrls.filter((_, i) => i !== idx) }));

    const preview = useMemo(
        () => buildRobotsPreview(form.robotsRules, form.extraSitemapsText, siteSitemapUrl),
        [form.robotsRules, form.extraSitemapsText, siteSitemapUrl],
    );

    const inputClass = "w-full bg-slate-950/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-cyan-500/40 outline-none";

    return (
        <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-6">
                <Panel className="p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-mono uppercase tracking-widest text-cyan-400">Robots Rules</h3>
                        <button onClick={addRule} className="text-xs font-mono px-2 py-1 rounded bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 flex items-center gap-1"><FaPlus size={10} /> RULE</button>
                    </div>
                    <div className="space-y-4">
                        {form.robotsRules.map((rule, idx) => (
                            <div key={idx} className="rounded-xl border border-white/5 bg-slate-950/40 p-3 space-y-2">
                                <div className="flex items-center gap-2">
                                    <input value={rule.userAgent} onChange={(e) => updateRule(idx, { userAgent: e.target.value })} placeholder="User-agent (e.g. *)" className={inputClass} />
                                    <button onClick={() => removeRule(idx)} className="text-slate-500 hover:text-red-400 p-2"><FaTrash size={12} /></button>
                                </div>
                                <label className="block text-xs font-mono text-slate-500">Allow (one per line)</label>
                                <textarea value={rule.allowText} onChange={(e) => updateRule(idx, { allowText: e.target.value })} rows={1} className={inputClass} />
                                <label className="block text-xs font-mono text-slate-500">Disallow (one per line)</label>
                                <textarea value={rule.disallowText} onChange={(e) => updateRule(idx, { disallowText: e.target.value })} rows={4} className={`${inputClass} font-mono`} />
                                <div className="flex items-center gap-2">
                                    <label className="text-xs font-mono text-slate-500">Crawl-delay</label>
                                    <input value={rule.crawlDelay} onChange={(e) => updateRule(idx, { crawlDelay: e.target.value })} type="number" className={`${inputClass} w-24`} />
                                </div>
                            </div>
                        ))}
                    </div>
                    <label className="block text-xs font-mono text-slate-500 mt-4 mb-1">Extra sitemaps (one URL per line)</label>
                    <textarea value={form.extraSitemapsText} onChange={(e) => setForm((f) => ({ ...f, extraSitemapsText: e.target.value }))} rows={2} className={`${inputClass} font-mono`} />
                </Panel>

                <Panel className="p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-mono uppercase tracking-widest text-cyan-400">Sitemap Overrides</h3>
                        <button onClick={addUrl} className="text-xs font-mono px-2 py-1 rounded bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 flex items-center gap-1"><FaPlus size={10} /> URL</button>
                    </div>
                    <label className="block text-xs font-mono text-slate-500 mb-1">Exclude paths (one per line)</label>
                    <textarea value={form.excludePathsText} onChange={(e) => setForm((f) => ({ ...f, excludePathsText: e.target.value }))} rows={3} className={`${inputClass} font-mono mb-4`} />
                    <label className="block text-xs font-mono text-slate-500 mb-2">Extra URLs</label>
                    <div className="space-y-2">
                        {form.extraUrls.map((u, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                                <input value={u.url} onChange={(e) => updateUrl(idx, { url: e.target.value })} placeholder="/path or full URL" className={inputClass} />
                                <select value={u.changeFrequency} onChange={(e) => updateUrl(idx, { changeFrequency: e.target.value })} className={`${inputClass} w-32`}>
                                    {CHANGE_FREQS.map((f) => <option key={f} value={f}>{f}</option>)}
                                </select>
                                <input value={u.priority} onChange={(e) => updateUrl(idx, { priority: parseFloat(e.target.value) })} type="number" step="0.1" min="0" max="1" className={`${inputClass} w-20`} />
                                <button onClick={() => removeUrl(idx)} className="text-slate-500 hover:text-red-400 p-2"><FaTrash size={12} /></button>
                            </div>
                        ))}
                        {!form.extraUrls.length && <p className="text-xs text-slate-600 font-mono">No extra URLs.</p>}
                    </div>
                </Panel>

                <button onClick={onSave} disabled={saving} className="w-full px-4 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-50 flex items-center justify-center gap-2 font-mono text-sm">
                    {saving ? <FaSpinner className="animate-spin" /> : <FaFloppyDisk />} SAVE ROBOTS & SITEMAP
                </button>
            </div>

            <Panel className="p-5 h-fit lg:sticky lg:top-6">
                <h3 className="text-sm font-mono uppercase tracking-widest text-cyan-400 mb-4">robots.txt preview</h3>
                <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap bg-slate-950/60 border border-white/10 rounded-lg p-4 overflow-x-auto">{preview}</pre>
            </Panel>
        </div>
    );
}

// ─────────────────────────── Indexing tab ───────────────────────────

function IndexingTab({ status, logs, urls, indexing, onToggleAutoPing, onSaveKey, onClearKey, onPing, savingKey, pinging }) {
    const [keyInput, setKeyInput] = useState('');
    const [urlText, setUrlText] = useState('');
    const [type, setType] = useState('URL_UPDATED');

    useEffect(() => { setUrlText((urls || []).join('\n')); }, [urls]);

    const inputClass = "w-full bg-slate-950/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-cyan-500/40 outline-none";

    return (
        <div className="grid lg:grid-cols-2 gap-6">
            <Panel className="p-5 space-y-4">
                <h3 className="text-sm font-mono uppercase tracking-widest text-cyan-400">Service Account</h3>
                <div className={`text-sm px-3 py-2 rounded-lg border ${status?.hasServiceAccount ? (status.invalid ? 'text-red-400 border-red-500/20 bg-red-500/10' : 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10') : 'text-slate-400 border-white/10 bg-slate-950/40'}`}>
                    {status?.hasServiceAccount
                        ? (status.invalid ? 'Stored key is invalid / could not be parsed.' : `Configured: ${status.email}`)
                        : 'No service account configured.'}
                </div>
                <textarea value={keyInput} onChange={(e) => setKeyInput(e.target.value)} rows={6} placeholder='Paste service-account JSON here…' className={`${inputClass} font-mono`} />
                <div className="flex gap-2">
                    <button onClick={() => { onSaveKey(keyInput); setKeyInput(''); }} disabled={savingKey || !keyInput.trim()} className="flex-1 px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-50 flex items-center justify-center gap-2 font-mono text-sm">
                        {savingKey ? <FaSpinner className="animate-spin" /> : <FaFloppyDisk />} SAVE KEY
                    </button>
                    {status?.hasServiceAccount && (
                        <button onClick={onClearKey} disabled={savingKey} className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/20 disabled:opacity-50 font-mono text-sm flex items-center gap-2"><FaTrash size={12} /> CLEAR</button>
                    )}
                </div>
                <label className="flex items-start gap-3 pt-2 border-t border-white/5 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={indexing?.autoPing === true}
                        onChange={(e) => onToggleAutoPing(e.target.checked)}
                        disabled={savingKey || !status?.hasServiceAccount}
                        className="mt-0.5 accent-cyan-500"
                    />
                    <span>
                        <span className="block text-sm text-slate-200 font-mono">Auto-ping on content changes</span>
                        <span className="block text-xs text-slate-500 mt-0.5">Notify Google automatically when blogs, projects, apps, or the header change.</span>
                    </span>
                </label>
            </Panel>

            <Panel className="p-5 space-y-4">
                <h3 className="text-sm font-mono uppercase tracking-widest text-cyan-400">Request Indexing</h3>
                <textarea value={urlText} onChange={(e) => setUrlText(e.target.value)} rows={6} placeholder="One URL per line" className={`${inputClass} font-mono`} />
                <div className="flex gap-2 items-center">
                    <select value={type} onChange={(e) => setType(e.target.value)} className={`${inputClass} w-44`}>
                        <option value="URL_UPDATED">URL_UPDATED</option>
                        <option value="URL_DELETED">URL_DELETED</option>
                    </select>
                    <button onClick={() => onPing(linesToArray(urlText), type)} disabled={pinging || !status?.hasServiceAccount} className="flex-1 px-4 py-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/25 disabled:opacity-50 flex items-center justify-center gap-2 font-mono text-sm">
                        {pinging ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />} PING GOOGLE
                    </button>
                </div>
                {!status?.hasServiceAccount && <p className="text-xs text-amber-400/80 font-mono">Configure a service account first.</p>}
            </Panel>

            <Panel className="p-5 lg:col-span-2">
                <h3 className="text-sm font-mono uppercase tracking-widest text-cyan-400 mb-4">Indexing Log</h3>
                {!logs?.length ? <p className="text-xs text-slate-600 font-mono">No indexing requests yet.</p> : (
                    <div className="space-y-1">
                        {logs.map((l) => (
                            <div key={l._id} className="text-xs font-mono border-b border-white/5 py-1.5">
                                <div className="flex items-center justify-between gap-3">
                                    <span className={l.status === 'success' ? 'text-emerald-400' : 'text-red-400'}>{l.status === 'success' ? '✓' : '✗'}</span>
                                    <span className="text-slate-300 truncate flex-1">{l.url}</span>
                                    <span className="text-slate-500 shrink-0">{l.type}</span>
                                    <span className="text-slate-600 shrink-0 hidden md:inline">{new Date(l.createdAt).toLocaleString()}</span>
                                </div>
                                {l.status !== 'success' && l.response && (
                                    <p className="mt-1 pl-5 text-red-400/70 break-words" title={l.response}>{l.response}</p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </Panel>
        </div>
    );
}

// ─────────────────────────────── Page ───────────────────────────────

function configToForm(config) {
    const rules = (config?.robots?.rules || []).map((r) => ({
        userAgent: r.userAgent || '',
        allowText: (Array.isArray(r.allow) ? r.allow : [r.allow].filter(Boolean)).join('\n'),
        disallowText: (r.disallow || []).join('\n'),
        crawlDelay: r.crawlDelay ?? '',
    }));
    return {
        robotsRules: rules.length ? rules : [{ userAgent: '*', allowText: '/', disallowText: '', crawlDelay: '' }],
        extraSitemapsText: (config?.robots?.extraSitemaps || []).join('\n'),
        excludePathsText: (config?.sitemap?.excludePaths || []).join('\n'),
        extraUrls: (config?.sitemap?.extraUrls || []).map((u) => ({ url: u.url || '', changeFrequency: u.changeFrequency || 'monthly', priority: typeof u.priority === 'number' ? u.priority : 0.5 })),
    };
}

function formToConfigBody(form) {
    return {
        robots: {
            rules: form.robotsRules.map((r) => ({
                userAgent: r.userAgent || '*',
                allow: linesToArray(r.allowText),
                disallow: linesToArray(r.disallowText),
                ...(String(r.crawlDelay) !== '' && Number.isFinite(Number(r.crawlDelay)) ? { crawlDelay: Number(r.crawlDelay) } : {}),
            })),
            extraSitemaps: linesToArray(form.extraSitemapsText),
        },
        sitemap: {
            excludePaths: linesToArray(form.excludePathsText),
            extraUrls: form.extraUrls.filter((u) => u.url?.trim()).map((u) => ({
                url: u.url.trim(),
                changeFrequency: u.changeFrequency,
                priority: typeof u.priority === 'number' && !Number.isNaN(u.priority) ? u.priority : 0.5,
            })),
        },
    };
}

export default function SeoDashboard() {
    const { confirm } = useAdminFeedback();
    const [tab, setTab] = useState('audit');
    const [audit, setAudit] = useState(null);
    const [configData, setConfigData] = useState(null);
    const [form, setForm] = useState(configToForm(null));
    const [crawl, setCrawl] = useState(null);

    const [loadingAudit, setLoadingAudit] = useState(true);
    const [crawling, setCrawling] = useState(false);
    const [saving, setSaving] = useState(false);
    const [savingKey, setSavingKey] = useState(false);
    const [pinging, setPinging] = useState(false);
    const [error, setError] = useState(null);
    const [notice, setNotice] = useState(null);

    const [fixingState, setFixingState] = useState(null); // 'running', 'paused', 'completed'
    const [fixingProgress, setFixingProgress] = useState({ current: 0, total: 0, currentName: '' });
    const stopFixingRef = useRef(false);

    const flash = (msg) => { setNotice(msg); setTimeout(() => setNotice(null), 4000); };

    const fixAllWithAi = async () => {
        if (!audit) return;
        setFixingState('running');
        stopFixingRef.current = false;
        setError(null);

        const itemsToFix = [];
        const groups = audit.groups || {};

        const isFixable = (issues) => {
            return (issues || []).some(i => ['seoDescription', 'description', 'imageAlt', 'siteTitle'].includes(i.field));
        };

        if (groups.blogs) {
            groups.blogs.forEach(b => {
                if (isFixable(b.issues)) {
                    itemsToFix.push({ type: 'blog', id: b.id, name: b.title });
                }
            });
        }
        if (groups.projects) {
            groups.projects.forEach(p => {
                if (isFixable(p.issues)) {
                    itemsToFix.push({ type: 'project', id: p.id, name: p.title });
                }
            });
        }
        if (groups.apps) {
            groups.apps.forEach(a => {
                if (isFixable(a.issues)) {
                    itemsToFix.push({ type: 'app', id: a.id, name: a.title });
                }
            });
        }
        if (groups.static) {
            groups.static.forEach(s => {
                if (isFixable(s.issues)) {
                    itemsToFix.push({ type: 'static', id: s.id, name: `Static Config: ${s.title}` });
                }
            });
        }

        if (itemsToFix.length === 0) {
            flash('No fixable SEO warnings found.');
            setFixingState(null);
            return;
        }

        let fixedCount = 0;
        setFixingProgress({ current: 0, total: itemsToFix.length, currentName: '' });

        for (let i = 0; i < itemsToFix.length; i++) {
            if (stopFixingRef.current) {
                setFixingState('paused');
                flash('AI fixing paused.');
                loadAudit();
                return;
            }

            const item = itemsToFix[i];
            setFixingProgress({ current: i + 1, total: itemsToFix.length, currentName: item.name });

            try {
                const res = await fetch('/api/admin/seo/fix', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: item.type, id: item.id })
                });

                const data = await res.json();
                if (!res.ok || !data.success) {
                    throw new Error(data.error || 'Failed to apply AI fix.');
                }
                fixedCount++;
            } catch (err) {
                console.error(`Error fixing ${item.name}:`, err);
                setError(`AI fixing interrupted at "${item.name}": ${err.message}`);
                setFixingState(null);
                loadAudit();
                return;
            }
        }

        setFixingState('completed');
        flash(`AI SEO Auto-Fix completed! Fixed ${fixedCount} item(s).`);
        loadAudit();
        setTimeout(() => setFixingState(null), 5000);
    };

    const handleStopFixing = () => {
        stopFixingRef.current = true;
    };

    const loadAudit = useCallback(async () => {
        setLoadingAudit(true);
        try {
            const res = await fetch('/api/admin/seo/audit', { cache: 'no-store' });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || 'AUDIT_FAILED');
            setAudit(json);
        } catch (e) { setError(e.message); } finally { setLoadingAudit(false); }
    }, []);

    const loadConfig = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/seo/config', { cache: 'no-store' });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || 'CONFIG_FAILED');
            setConfigData(json);
            setForm(configToForm(json.config));
        } catch (e) { setError(e.message); }
    }, []);

    useEffect(() => { loadAudit(); loadConfig(); }, [loadAudit, loadConfig]);

    const runCrawl = async () => {
        setCrawling(true); setError(null);
        try {
            const res = await fetch('/api/admin/seo/crawl', { method: 'POST' });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || 'CRAWL_FAILED');
            setCrawl(json);
        } catch (e) { setError(e.message); } finally { setCrawling(false); }
    };

    const saveConfig = async () => {
        setSaving(true); setError(null);
        try {
            const res = await fetch('/api/admin/seo/config', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formToConfigBody(form)),
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || 'SAVE_FAILED');
            setConfigData((d) => ({ ...d, config: json.config }));
            flash('Robots & sitemap saved.');
        } catch (e) { setError(e.message); } finally { setSaving(false); }
    };

    const saveKey = async (serviceAccount) => {
        setSavingKey(true); setError(null);
        try {
            const res = await fetch('/api/admin/seo/config', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ serviceAccount }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || 'KEY_SAVE_FAILED');
            setConfigData((d) => ({ ...d, serviceAccount: json.serviceAccount }));
            flash('Service account saved.');
        } catch (e) { setError(e.message); } finally { setSavingKey(false); }
    };

    const clearKey = async () => {
        if (!(await confirm({
            title: 'Remove service account?',
            message: 'Remove the stored Google service account?',
            confirmText: 'Remove',
            danger: true,
        }))) return;
        await saveKey('');
    };

    const toggleAutoPing = async (autoPing) => {
        setSavingKey(true); setError(null);
        try {
            const res = await fetch('/api/admin/seo/config', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ indexing: { ...(configData?.config?.indexing || {}), autoPing } }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || 'AUTO_PING_SAVE_FAILED');
            setConfigData((d) => ({ ...d, config: json.config }));
            flash(autoPing ? 'Auto-ping enabled.' : 'Auto-ping disabled.');
        } catch (e) { setError(e.message); } finally { setSavingKey(false); }
    };

    const ping = async (urls, type) => {
        if (!urls.length) { setError('No URLs to submit.'); return; }
        setPinging(true); setError(null);
        try {
            const res = await fetch('/api/admin/seo/index', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ urls, type }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || 'PING_FAILED');
            flash(`Submitted ${json.sent} URL(s); ${json.ok} accepted.`);
            loadConfig();
        } catch (e) { setError(e.message); } finally { setPinging(false); }
    };

    // URLs offered for indexing: every audited public URL.
    const indexableUrls = useMemo(() => {
        const g = audit?.groups || {};
        return [...(g.blogs || []), ...(g.projects || []), ...(g.apps || [])].map((r) => r.url);
    }, [audit]);

    const siteSitemapUrl = useMemo(() => (crawl?.base || configData?.config?.base || '') + '/sitemap.xml', [crawl, configData]);

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
            <div className="mb-8">
                <Link href="/admin" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors mb-4 text-sm font-mono opacity-60 hover:opacity-100">
                    ← BACK_TO_COMMAND_CENTER
                </Link>
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-lime-500/10 rounded-xl border border-lime-500/20 text-lime-400">
                        <FaMagnifyingGlass className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-1 tracking-tight">SEO & Crawl</h1>
                        <p className="text-slate-400">Meta audit, live crawl, robots/sitemap control & Google indexing.</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
                {TABS.map((t) => (
                    <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 rounded-lg text-sm font-mono flex items-center gap-2 transition-all border ${tab === t.key ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/30' : 'bg-slate-900/60 text-slate-400 border-white/10 hover:text-slate-200'}`}>
                        {t.icon} {t.label}
                    </button>
                ))}
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

            {fixingState && (
                <Panel className="p-5 mb-6 border-cyan-500/20 bg-slate-900/60">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <FaRobot className={`text-cyan-400 text-2xl ${fixingState === 'running' ? 'animate-pulse' : ''}`} />
                            <div>
                                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wide">
                                    {fixingState === 'running' ? 'AI SEO Auto-Fix Running...' : 'AI SEO Auto-Fix Paused'}
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {fixingState === 'running' 
                                        ? `Fixing "${fixingProgress.currentName}" (${fixingProgress.current} of ${fixingProgress.total})`
                                        : `Progress: ${fixingProgress.current} of ${fixingProgress.total} items processed.`
                                    }
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {fixingState === 'running' ? (
                                <button
                                    onClick={handleStopFixing}
                                    className="px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:bg-amber-500/20 font-mono text-xs uppercase font-bold tracking-wider"
                                >
                                    Pause Fixing
                                </button>
                            ) : (
                                <button
                                    onClick={fixAllWithAi}
                                    className="px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/30 font-mono text-xs uppercase font-bold tracking-wider"
                                >
                                    Resume Fixing
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-1.5 mt-4 overflow-hidden border border-white/5">
                        <div 
                            className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full transition-all duration-300"
                            style={{ width: `${(fixingProgress.current / fixingProgress.total) * 100}%` }}
                        />
                    </div>
                </Panel>
            )}

            {tab === 'audit' && (
                <MetaCheckerTab 
                    audit={audit} 
                    loading={loadingAudit} 
                    onRefresh={loadAudit} 
                    onFixAll={fixAllWithAi}
                    fixingState={fixingState}
                />
            )}
            {tab === 'crawl' && <CrawlTab crawl={crawl} crawling={crawling} onRun={runCrawl} />}
            {tab === 'robots' && <RobotsSitemapTab form={form} setForm={setForm} onSave={saveConfig} saving={saving} siteSitemapUrl={siteSitemapUrl} />}
            {tab === 'indexing' && (
                <IndexingTab
                    status={configData?.serviceAccount}
                    logs={configData?.logs}
                    urls={indexableUrls}
                    indexing={configData?.config?.indexing}
                    onToggleAutoPing={toggleAutoPing}
                    onSaveKey={saveKey}
                    onClearKey={clearKey}
                    onPing={ping}
                    savingKey={savingKey}
                    pinging={pinging}
                />
            )}
        </div>
    );
}
