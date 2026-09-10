'use client';

/**
 * Repository → Project sync panel for the GitHub admin dashboard.
 *
 * Deliberately a manual, two-step control: preview what a sync would change,
 * then commit it. The preview exists because sync writes to live public pages,
 * and "which of my edits will this overwrite?" is the question that decides
 * whether the admin presses the button. Pinned fields are surfaced explicitly
 * so protection is visible rather than implied.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle, CheckCircle, GitBranch, Loader2, Lock, RefreshCw,
    Search, Star, XCircle,
} from 'lucide-react';

const relativeTime = (value) => {
    if (!value) return 'never';
    const deltaDays = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000);
    if (!Number.isFinite(deltaDays)) return 'never';
    if (deltaDays <= 0) return 'today';
    if (deltaDays === 1) return 'yesterday';
    if (deltaDays < 30) return `${deltaDays}d ago`;
    if (deltaDays < 365) return `${Math.floor(deltaDays / 30)}mo ago`;
    return `${Math.floor(deltaDays / 365)}y ago`;
};

const formatValue = (value) => {
    if (Array.isArray(value)) return value.join(', ') || '—';
    if (value === null || value === undefined || value === '') return '—';
    return String(value);
};

export default function RepoSyncPanel({ username, hiddenRepos = [] }) {
    const [repos, setRepos] = useState([]);
    const [projects, setProjects] = useState([]);
    const [selected, setSelected] = useState(() => new Set());
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState(null);
    const [previewing, setPreviewing] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    const hidden = useMemo(
        () => new Set(hiddenRepos.map((name) => String(name).toLowerCase())),
        [hiddenRepos]
    );

    // Linked state comes from the projects table, not from GitHub, so the panel
    // shows what THIS site knows about each repo.
    const linkedByRepo = useMemo(() => {
        const map = new Map();
        for (const project of projects) {
            if (project?.repoFullName) map.set(project.repoFullName.toLowerCase(), project);
        }
        return map;
    }, [projects]);

    const loadRepos = useCallback(async () => {
        if (!username) return;
        setLoading(true);
        setError('');
        try {
            const [repoRes, projectRes] = await Promise.all([
                fetch('/api/github/config?mode=repos'),
                fetch('/api/projects'),
            ]);
            const repoJson = await repoRes.json();
            const projectJson = await projectRes.json();

            if (!repoJson?.success || !Array.isArray(repoJson.repos)) {
                throw new Error(repoJson?.error || 'Could not list repositories');
            }
            setRepos(repoJson.repos);
            setProjects(Array.isArray(projectJson) ? projectJson : []);
        } catch (loadError) {
            setError(loadError.message || 'Failed to load repositories');
        } finally {
            setLoading(false);
        }
    }, [username]);

    useEffect(() => { loadRepos(); }, [loadRepos]);

    const visibleRepos = useMemo(() => {
        const needle = query.trim().toLowerCase();
        return repos
            .filter((repo) => !hidden.has(String(repo.name).toLowerCase()))
            .filter((repo) => !needle
                || repo.name.toLowerCase().includes(needle)
                || (repo.description || '').toLowerCase().includes(needle)
                || (repo.language || '').toLowerCase().includes(needle));
    }, [repos, hidden, query]);

    const toggle = (fullName) => {
        setSelected((current) => {
            const next = new Set(current);
            if (next.has(fullName)) next.delete(fullName);
            else next.add(fullName);
            return next;
        });
        setPreview(null);
        setResult(null);
    };

    const runPreview = async () => {
        setPreviewing(true);
        setError('');
        setResult(null);
        try {
            const params = new URLSearchParams();
            for (const fullName of selected) params.append('repo', fullName);
            const res = await fetch(`/api/github/sync?${params.toString()}`);
            const json = await res.json();
            if (!json?.success) throw new Error(json?.error || 'Preview failed');
            setPreview(json.data);
        } catch (previewError) {
            setError(previewError.message || 'Preview failed');
        } finally {
            setPreviewing(false);
        }
    };

    const runSync = async () => {
        setSyncing(true);
        setError('');
        try {
            const res = await fetch('/api/github/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repos: [...selected] }),
            });
            const json = await res.json();
            if (!json?.success) throw new Error(json?.error || 'Sync failed');
            setResult(json.data);
            setPreview(null);
            setSelected(new Set());
            await loadRepos();
        } catch (syncError) {
            setError(syncError.message || 'Sync failed');
        } finally {
            setSyncing(false);
        }
    };

    if (!username) {
        return (
            <div id="repository-sync" className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 scroll-mt-8">
                <p className="font-mono text-xs uppercase tracking-widest text-slate-500">Repository Sync</p>
                <p className="mt-3 text-sm text-slate-400">
                    Set a target username above and save before syncing repositories.
                </p>
            </div>
        );
    }

    return (
        <div
            id="repository-sync"
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 p-4 backdrop-blur-xl scroll-mt-8 md:p-8"
        >
            <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-cyan-500/5 blur-[100px]" />

            <div className="relative z-10 mb-6 flex flex-wrap items-center justify-between gap-4">
                <h2 className="flex items-center gap-4 font-mono text-sm uppercase tracking-widest text-cyan-500/70">
                    <GitBranch className="h-4 w-4" aria-hidden="true" />
                    Repository Sync
                    <span className="h-px w-20 bg-cyan-500/10" />
                </h2>
                <button
                    type="button"
                    onClick={loadRepos}
                    disabled={loading}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 px-3 py-2 font-mono text-xs uppercase tracking-wide text-slate-300 transition-colors hover:bg-white/5 disabled:opacity-50"
                >
                    {loading
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                        : <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
                    Reload
                </button>
            </div>

            <p className="relative z-10 mb-5 max-w-2xl text-sm leading-relaxed text-slate-400">
                Pick repositories to publish as projects. Syncing refreshes name, description,
                stack, year, status and link — but never a field you have edited by hand.
                Those stay pinned.
            </p>

            {error && (
                <div className="relative z-10 mb-5 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-red-300">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <p className="font-mono text-xs">{error}</p>
                </div>
            )}

            <label htmlFor="repo-sync-search" className="relative z-10 mb-4 flex items-center gap-3 rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2">
                <Search className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                <span className="sr-only">Filter repositories</span>
                <input
                    id="repo-sync-search"
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="filter by name, language, description…"
                    className="w-full min-w-0 bg-transparent font-mono text-sm text-slate-200 outline-none placeholder:text-slate-600"
                />
            </label>

            <div className="relative z-10 max-h-96 space-y-2 overflow-y-auto pr-1">
                {loading && repos.length === 0 && (
                    <p className="py-8 text-center font-mono text-xs text-slate-500">LOADING_REPOSITORIES…</p>
                )}

                {!loading && visibleRepos.length === 0 && (
                    <p className="py-8 text-center font-mono text-xs text-slate-500">
                        {repos.length === 0 ? 'No repositories returned.' : 'No repositories match that filter.'}
                    </p>
                )}

                {visibleRepos.map((repo) => {
                    const linked = linkedByRepo.get(String(repo.fullName).toLowerCase());
                    const isSelected = selected.has(repo.fullName);

                    return (
                        <label
                            key={repo.fullName}
                            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                                isSelected
                                    ? 'border-cyan-500/40 bg-cyan-500/5'
                                    : 'border-white/5 bg-slate-950/40 hover:bg-slate-950/70'
                            }`}
                        >
                            <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggle(repo.fullName)}
                                className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-cyan-500"
                            />
                            <span className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-center gap-2">
                                    <span className="font-mono text-sm text-slate-200">{repo.name}</span>
                                    {linked ? (
                                        <span className="rounded border border-green-500/30 bg-green-500/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-green-400">
                                            linked
                                        </span>
                                    ) : (
                                        <span className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-slate-500">
                                            new
                                        </span>
                                    )}
                                    {repo.isPrivate && (
                                        <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-amber-400">
                                            private
                                        </span>
                                    )}
                                    {linked?.pinnedFields?.length > 0 && (
                                        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-cyan-400">
                                            <Lock className="h-3 w-3" aria-hidden="true" />
                                            {linked.pinnedFields.length} pinned
                                        </span>
                                    )}
                                </span>

                                {repo.description && (
                                    <span className="mt-1 block truncate text-xs text-slate-500">{repo.description}</span>
                                )}

                                <span className="mt-1.5 flex flex-wrap items-center gap-3 font-mono text-[11px] text-slate-600">
                                    {repo.language && <span>{repo.language}</span>}
                                    <span className="inline-flex items-center gap-1">
                                        <Star className="h-3 w-3" aria-hidden="true" />{repo.stars}
                                    </span>
                                    <span>pushed {relativeTime(repo.pushedAt)}</span>
                                    {linked?.syncedAt && <span>synced {relativeTime(linked.syncedAt)}</span>}
                                </span>
                            </span>
                        </label>
                    );
                })}
            </div>

            <div className="relative z-10 mt-6 flex flex-wrap items-center gap-3 border-t border-white/5 pt-5">
                <span className="font-mono text-xs text-slate-500">{selected.size} selected</span>
                <button
                    type="button"
                    onClick={runPreview}
                    disabled={selected.size === 0 || previewing || syncing}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 px-4 py-2 font-mono text-xs uppercase tracking-wide text-slate-200 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {previewing && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                    Preview changes
                </button>
                <button
                    type="button"
                    onClick={runSync}
                    disabled={selected.size === 0 || syncing || previewing}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 font-mono text-xs uppercase tracking-wide text-cyan-300 transition-colors hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {syncing && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                    Sync selected
                </button>
            </div>

            {preview && (
                <div className="relative z-10 mt-5 space-y-3">
                    <p className="font-mono text-xs uppercase tracking-widest text-slate-500">Dry run</p>
                    {preview.map((entry) => (
                        <div key={entry.repo} className="rounded-lg border border-white/10 bg-slate-950/40 p-3">
                            <p className="flex items-center gap-2 font-mono text-xs text-slate-300">
                                {entry.status === 'error'
                                    ? <AlertTriangle className="h-3.5 w-3.5 text-red-400" aria-hidden="true" />
                                    : <GitBranch className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />}
                                {entry.repo}
                                <span className="text-slate-600">· {entry.status}</span>
                            </p>

                            {entry.error && <p className="mt-2 font-mono text-xs text-red-300">{entry.error}</p>}

                            {entry.changes?.length > 0 && (
                                <ul className="mt-2 space-y-1">
                                    {entry.changes.map((change) => (
                                        <li key={change.field} className="font-mono text-[11px] text-slate-400">
                                            <span className="text-slate-500">{change.field}:</span>{' '}
                                            <span className="text-red-300/70 line-through">{formatValue(change.from)}</span>{' '}
                                            <span className="text-slate-600">→</span>{' '}
                                            <span className="text-green-300">{formatValue(change.to)}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {entry.status !== 'error' && entry.changes?.length === 0 && (
                                <p className="mt-2 font-mono text-[11px] text-slate-500">No changes.</p>
                            )}

                            {entry.pinned?.length > 0 && (
                                <p className="mt-2 inline-flex items-center gap-1.5 font-mono text-[11px] text-cyan-400">
                                    <Lock className="h-3 w-3" aria-hidden="true" />
                                    protected: {entry.pinned.join(', ')}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {result && (
                <div className="relative z-10 mt-5 rounded-lg border border-green-500/20 bg-green-500/10 p-4">
                    <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-wide text-green-300">
                        <CheckCircle className="h-4 w-4" aria-hidden="true" />
                        {result.summary.created} created · {result.summary.updated} updated
                        {result.summary.failed > 0 && ` · ${result.summary.failed} failed`}
                    </p>
                    <ul className="mt-3 space-y-1">
                        {result.results.map((entry) => (
                            <li key={entry.repo} className="font-mono text-[11px] text-slate-300">
                                {entry.repo} — {entry.status}
                                {entry.status !== 'error' && (
                                    <>
                                        {entry.readme ? ' · readme' : ' · no readme'}
                                        {entry.pinnedSkipped?.length > 0 && ` · kept ${entry.pinnedSkipped.join(', ')}`}
                                    </>
                                )}
                                {entry.error && <span className="text-red-300"> — {entry.error}</span>}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
