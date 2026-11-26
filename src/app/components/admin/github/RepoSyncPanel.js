"use client";

/**
 * Repository → Project sync panel for the GitHub admin dashboard.
 *
 * Manual two-step control: preview what a sync would change, then commit it.
 * Pinned fields are surfaced explicitly so hand-edited project fields stay protected.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    FaTriangleExclamation, FaCircleCheck, FaCodeBranch, FaSpinner, FaLock,
    FaArrowsRotate, FaMagnifyingGlass, FaStar, FaCircleXmark,
} from "react-icons/fa6";
import { Panel, Badge, EmptyState, Loading } from "@/app/components/admin/ui";
import "@/app/styles/admin-insights.css";

const relativeTime = (value) => {
    if (!value) return "never";
    const deltaDays = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000);
    if (!Number.isFinite(deltaDays)) return "never";
    if (deltaDays <= 0) return "today";
    if (deltaDays === 1) return "yesterday";
    if (deltaDays < 30) return `${deltaDays}d ago`;
    if (deltaDays < 365) return `${Math.floor(deltaDays / 30)}mo ago`;
    return `${Math.floor(deltaDays / 365)}y ago`;
};

const formatValue = (value) => {
    if (Array.isArray(value)) return value.join(", ") || "—";
    if (value === null || value === undefined || value === "") return "—";
    return String(value);
};

export default function RepoSyncPanel({ username, hiddenRepos = [] }) {
    const [repos, setRepos] = useState([]);
    const [projects, setProjects] = useState([]);
    const [selected, setSelected] = useState(() => new Set());
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState(null);
    const [previewing, setPreviewing] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");

    const hidden = useMemo(
        () => new Set(hiddenRepos.map((name) => String(name).toLowerCase())),
        [hiddenRepos]
    );

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
        setError("");
        try {
            const [repoRes, projectRes] = await Promise.all([
                fetch("/api/github/config?mode=repos"),
                fetch("/api/projects"),
            ]);
            const repoJson = await repoRes.json();
            const projectJson = await projectRes.json();

            if (!repoJson?.success || !Array.isArray(repoJson.repos)) {
                throw new Error(repoJson?.error || "Could not list repositories");
            }
            setRepos(repoJson.repos);
            setProjects(Array.isArray(projectJson) ? projectJson : []);
        } catch (loadError) {
            setError(loadError.message || "Failed to load repositories");
        } finally {
            setLoading(false);
        }
    }, [username]);

    useEffect(() => {
        loadRepos();
    }, [loadRepos]);

    const visibleRepos = useMemo(() => {
        const needle = query.trim().toLowerCase();
        return repos
            .filter((repo) => !hidden.has(String(repo.name).toLowerCase()))
            .filter(
                (repo) =>
                    !needle ||
                    repo.name.toLowerCase().includes(needle) ||
                    (repo.description || "").toLowerCase().includes(needle) ||
                    (repo.language || "").toLowerCase().includes(needle)
            );
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
        setError("");
        setResult(null);
        try {
            const params = new URLSearchParams();
            for (const fullName of selected) params.append("repo", fullName);
            const res = await fetch(`/api/github/sync?${params.toString()}`);
            const json = await res.json();
            if (!json?.success) throw new Error(json?.error || "Preview failed");
            setPreview(json.data);
        } catch (previewError) {
            setError(previewError.message || "Preview failed");
        } finally {
            setPreviewing(false);
        }
    };

    const runSync = async () => {
        setSyncing(true);
        setError("");
        try {
            const res = await fetch("/api/github/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ repos: [...selected] }),
            });
            const json = await res.json();
            if (!json?.success) throw new Error(json?.error || "Sync failed");
            setResult(json.data);
            setPreview(null);
            setSelected(new Set());
            await loadRepos();
        } catch (syncError) {
            setError(syncError.message || "Sync failed");
        } finally {
            setSyncing(false);
        }
    };

    if (!username) {
        return (
            <Panel id="repository-sync" title="Repository to project sync" className="scroll-mt-20">
                <EmptyState
                    title="GitHub username required"
                    description="Enter a GitHub username above and save before syncing repositories into portfolio projects."
                />
            </Panel>
        );
    }

    return (
        <Panel
            id="repository-sync"
            title="Repository to project sync"
            actions={
                <button
                    type="button"
                    onClick={loadRepos}
                    disabled={loading}
                    className="adm-btn"
                >
                    {loading ? (
                        <FaSpinner className="animate-spin" aria-hidden="true" />
                    ) : (
                        <FaArrowsRotate aria-hidden="true" />
                    )}
                    Reload
                </button>
            }
            className="scroll-mt-20"
        >
            <div className="space-y-4">
                <p className="adm-help">
                    Pick repositories to publish as portfolio projects. Syncing refreshes name, description, stack, year, status, and link — while preserving any fields you have edited by hand.
                </p>

                {error && (
                    <div role="alert" className="adm-notice adm-notice-error flex items-start gap-2.5">
                        <FaCircleXmark className="mt-0.5 shrink-0" aria-hidden="true" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="relative">
                    <FaMagnifyingGlass
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-secondary)]"
                        aria-hidden="true"
                    />
                    <label htmlFor="repo-sync-search" className="sr-only">
                        Filter repositories
                    </label>
                    <input
                        id="repo-sync-search"
                        type="text"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Filter by name, language, or description…"
                        className="adm-input !pl-8 font-mono"
                    />
                </div>

                <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
                    {loading && repos.length === 0 && (
                        <Loading label="Loading repositories" rows={3} />
                    )}

                    {!loading && visibleRepos.length === 0 && (
                        <EmptyState
                            title={repos.length === 0 ? "No repositories returned" : "No repositories match that filter"}
                        />
                    )}

                    {visibleRepos.map((repo) => {
                        const linked = linkedByRepo.get(String(repo.fullName).toLowerCase());
                        const isSelected = selected.has(repo.fullName);

                        return (
                            <label
                                key={repo.fullName}
                                data-selected={isSelected || undefined}
                                className="adm-pick !items-start"
                            >
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggle(repo.fullName)}
                                    className="adm-check mt-1"
                                />
                                <span className="min-w-0 flex-1">
                                    <span className="flex flex-wrap items-center gap-2">
                                        <span className="font-mono text-sm font-medium text-[var(--text-bright)]">
                                            {repo.name}
                                        </span>
                                        {linked ? (
                                            <Badge tone="ok">Linked</Badge>
                                        ) : (
                                            <Badge>New</Badge>
                                        )}
                                        {repo.isPrivate && (
                                            <Badge tone="warn">Private</Badge>
                                        )}
                                        {linked?.pinnedFields?.length > 0 && (
                                            <Badge tone="info">
                                                <FaLock className="text-[10px]" aria-hidden="true" />
                                                {linked.pinnedFields.length} pinned
                                            </Badge>
                                        )}
                                    </span>

                                    {repo.description && (
                                        <span className="adm-help mt-1 block truncate">{repo.description}</span>
                                    )}

                                    <span className="adm-help mt-1.5 flex flex-wrap items-center gap-3 font-mono">
                                        {repo.language && <span>{repo.language}</span>}
                                        <span className="inline-flex items-center gap-1">
                                            <FaStar className="text-[10px]" aria-hidden="true" />
                                            {repo.stars}
                                        </span>
                                        <span>Pushed {relativeTime(repo.pushedAt)}</span>
                                        {linked?.syncedAt && <span>Synced {relativeTime(linked.syncedAt)}</span>}
                                    </span>
                                </span>
                            </label>
                        );
                    })}
                </div>

                <div className="flex flex-wrap items-center gap-3 border-t border-[var(--hairline)] pt-4">
                    <span className="adm-help font-mono">{selected.size} selected</span>
                    <button
                        type="button"
                        onClick={runPreview}
                        disabled={selected.size === 0 || previewing || syncing}
                        className="adm-btn"
                    >
                        {previewing && <FaSpinner className="animate-spin" aria-hidden="true" />}
                        Preview changes
                    </button>
                    <button
                        type="button"
                        onClick={runSync}
                        disabled={selected.size === 0 || syncing || previewing}
                        className="adm-btn adm-btn-primary"
                    >
                        {syncing && <FaSpinner className="animate-spin" aria-hidden="true" />}
                        Sync selected
                    </button>
                </div>

                {preview && (
                    <div className="space-y-3 border-t border-[var(--hairline)] pt-4">
                        <p className="adm-label">Dry run preview</p>
                        {preview.map((entry) => (
                            <div
                                key={entry.repo}
                                className="rounded-xl border border-[var(--hairline)] bg-[var(--bg-secondary)] p-3.5 space-y-2"
                            >
                                <p className="flex items-center gap-2 font-mono text-xs text-[var(--text-bright)]">
                                    {entry.status === "error" ? (
                                        <FaTriangleExclamation className="text-[var(--adm-error-ink)]" aria-hidden="true" />
                                    ) : (
                                        <FaCodeBranch className="text-[var(--accent-cyan)]" aria-hidden="true" />
                                    )}
                                    <span>{entry.repo}</span>
                                    <Badge tone={entry.status === "error" ? "error" : "info"}>{entry.status}</Badge>
                                </p>

                                {entry.error && <p className="adm-field-error font-mono">{entry.error}</p>}

                                {entry.changes?.length > 0 && (
                                    <ul className="space-y-1">
                                        {entry.changes.map((change) => (
                                            <li key={change.field} className="font-mono text-xs text-[var(--text-secondary)]">
                                                <span>{change.field}:</span>{" "}
                                                <span className="line-through text-[var(--adm-error-ink)]">
                                                    {formatValue(change.from)}
                                                </span>{" "}
                                                <span>→</span>{" "}
                                                <span className="text-[var(--adm-ok-ink)]">{formatValue(change.to)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                {entry.status !== "error" && entry.changes?.length === 0 && (
                                    <p className="adm-help font-mono">No changes.</p>
                                )}

                                {entry.pinned?.length > 0 && (
                                    <p className="adm-help inline-flex items-center gap-1.5 font-mono">
                                        <FaLock className="text-[10px]" aria-hidden="true" />
                                        Protected: {entry.pinned.join(", ")}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {result && (
                    <div role="status" className="adm-notice adm-notice-ok space-y-2">
                        <p className="flex items-center gap-2 font-mono text-xs font-semibold">
                            <FaCircleCheck aria-hidden="true" />
                            {result.summary.created} created · {result.summary.updated} updated
                            {result.summary.failed > 0 && ` · ${result.summary.failed} failed`}
                        </p>
                        <ul className="space-y-1">
                            {result.results.map((entry) => (
                                <li key={entry.repo} className="font-mono text-xs text-[var(--text-primary)]">
                                    {entry.repo} — {entry.status}
                                    {entry.status !== "error" && (
                                        <>
                                            {entry.readme ? " · readme" : " · no readme"}
                                            {entry.pinnedSkipped?.length > 0 &&
                                                ` · kept ${entry.pinnedSkipped.join(", ")}`}
                                        </>
                                    )}
                                    {entry.error && (
                                        <span className="text-[var(--adm-error-ink)]"> — {entry.error}</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </Panel>
    );
}
