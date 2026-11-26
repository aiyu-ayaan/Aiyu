"use client";

import { useState, useEffect } from "react";
import {
    FaSpinner, FaCircleCheck, FaCircleXmark, FaChartColumn, FaBook, FaCode,
    FaGlobe, FaUser, FaEyeSlash, FaLock, FaLockOpen, FaMagnifyingGlass,
    FaCodeCommit, FaChartLine, FaTableCellsLarge, FaTags, FaLink,
    FaCopy, FaArrowsRotate, FaFloppyDisk, FaUpRightFromSquare,
} from "react-icons/fa6";
import RepoSyncPanel from "@/app/components/admin/github/RepoSyncPanel";
import { useAdminFeedback } from "@/app/components/admin/feedback/AdminFeedbackProvider";
import { PageHeader, Panel, Badge, EmptyState, Loading, Field } from "@/app/components/admin/ui";
import "../../styles/admin-insights.css";

const SECTION_LABELS = {
    showProfile: "Profile card",
    showStats: "Summary statistics",
    showMetrics: "Activity metrics",
    showContributions: "Contribution calendar",
    showActivity: "Recent activity feed",
    showRepositories: "Featured repositories",
    showTopics: "Repository topics",
    showRepoDistribution: "Repository distribution",
    showLanguages: "Language breakdown",
    showLiveCommit: "Latest commit banner",
    showRadarChart: "Activity radar chart",
    showConnect: "Connect & profile links",
};

const SECTION_ICONS = {
    showProfile: FaUser,
    showStats: FaChartColumn,
    showMetrics: FaTableCellsLarge,
    showContributions: FaGlobe,
    showActivity: FaCircleCheck,
    showRepositories: FaBook,
    showTopics: FaTags,
    showRepoDistribution: FaChartColumn,
    showLanguages: FaCode,
    showLiveCommit: FaCodeCommit,
    showRadarChart: FaChartLine,
    showConnect: FaLink,
};

export default function GitHubConfigPage() {
    const { toast } = useAdminFeedback();
    const [config, setConfig] = useState({
        username: "",
        enabled: false,
        includePrivate: false,
        sections: {
            showProfile: true,
            showStats: true,
            showMetrics: true,
            showContributions: true,
            showActivity: true,
            showRepositories: true,
            showTopics: true,
            showRepoDistribution: true,
            showLanguages: true,
            showLiveCommit: true,
            showRadarChart: true,
            showConnect: true,
        },
        hiddenRepos: [],
        hasToken: false,
        hasWebhookSecret: false,
    });
    const [newToken, setNewToken] = useState("");
    const [showTokenInput, setShowTokenInput] = useState(false);
    const [newWebhookSecret, setNewWebhookSecret] = useState("");
    const [showWebhookInput, setShowWebhookInput] = useState(false);
    const [webhookUrl, setWebhookUrl] = useState("/api/github/webhook");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [tokenStatus, setTokenStatus] = useState(null);

    const [availableRepos, setAvailableRepos] = useState([]);
    const [loadingRepos, setLoadingRepos] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const showNotification = (success, message) => {
        toast(message, { success });
    };

    const fetchConfig = async () => {
        try {
            const res = await fetch("/api/github/config");
            const data = await res.json();
            if (data.success && data.data) {
                setConfig((prev) => ({
                    ...data.data,
                    sections: { ...prev.sections, ...(data.data.sections || {}) },
                    hiddenRepos: data.data.hiddenRepos || [],
                    includePrivate: data.data.includePrivate || false,
                    hasToken: data.data.hasToken || false,
                    hasWebhookSecret: data.data.hasWebhookSecret || false,
                }));
                setTokenStatus(data.data.tokenStatus);
            }
        } catch (error) {
            console.error("Failed to fetch config:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfig();
        setWebhookUrl(`${window.location.origin}/api/github/webhook`);
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const res = await fetch("/api/github/config", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...config,
                    githubToken: newToken || undefined,
                    webhookSecret: newWebhookSecret || undefined,
                }),
            });

            const data = await res.json();

            if (data.success) {
                if (newToken) {
                    setConfig((prev) => ({ ...prev, hasToken: true }));
                    setShowTokenInput(false);
                    setNewToken("");
                }
                if (newWebhookSecret) {
                    setConfig((prev) => ({ ...prev, hasWebhookSecret: true }));
                    setShowWebhookInput(false);
                    setNewWebhookSecret("");
                }
                showNotification(true, "Changes saved.");
            } else {
                showNotification(false, `Failed to save: ${data.message || "Unknown error"}`);
            }
        } catch (error) {
            console.error("Save error:", error);
            showNotification(false, "Failed to save configuration: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    const generateWebhookSecret = () => {
        const bytes = new Uint8Array(32);
        crypto.getRandomValues(bytes);
        setNewWebhookSecret(Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(""));
        setShowWebhookInput(true);
    };

    const copyToClipboard = async (value, label) => {
        try {
            await navigator.clipboard.writeText(value);
            showNotification(true, `${label} copied.`);
        } catch {
            showNotification(false, `Could not copy ${label.toLowerCase()}.`);
        }
    };

    const testConnection = async () => {
        if (!config.username) {
            showNotification(false, "Enter a GitHub username first.");
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
                    message: `Verified account: ${data.name || data.login}`,
                    avatar: data.avatar_url,
                });
            } else {
                setTestResult({
                    success: false,
                    message: "GitHub user not found.",
                });
            }
        } catch {
            setTestResult({
                success: false,
                message: "Could not reach GitHub API.",
            });
        } finally {
            setTesting(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (!config.username) return;
            setLoadingRepos(true);
            try {
                const res = await fetch(`/api/github/config?mode=repos&includePrivate=${config.includePrivate}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && Array.isArray(data.data)) {
                        setAvailableRepos(data.data);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch repos:", error);
            } finally {
                setLoadingRepos(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [config.username, config.includePrivate]);

    const toggleRepoVisibility = (repoName) => {
        setConfig((prev) => {
            const hidden = new Set(prev.hiddenRepos || []);
            if (hidden.has(repoName)) {
                hidden.delete(repoName);
            } else {
                hidden.add(repoName);
            }
            return {
                ...prev,
                hiddenRepos: Array.from(hidden),
            };
        });
    };

    const toggleSection = (section) => {
        setConfig((prev) => ({
            ...prev,
            sections: {
                ...prev.sections,
                [section]: !prev.sections[section],
            },
        }));
    };

    if (loading) {
        return (
            <div className="adm-page">
                <PageHeader
                    command="gh status"
                    title="GitHub integration"
                    description="Configure repositories, activity feeds, webhooks, and public page modules."
                />
                <Panel flush title="Loading GitHub configuration">
                    <Loading label="Loading GitHub configuration" rows={6} />
                </Panel>
            </div>
        );
    }

    const visibleSectionCount = Object.values(config.sections).filter(Boolean).length;
    const totalSectionCount = Object.keys(config.sections).length;
    const filteredRepos = availableRepos.filter((repo) =>
        repo.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="adm-page">
            <PageHeader
                command="gh status"
                title="GitHub integration"
                description="Configure your GitHub account, access token, push webhook, public modules, and repository sync."
                actions={
                    config.enabled && config.username ? (
                        <a href="/github" target="_blank" rel="noreferrer" className="adm-btn">
                            <FaUpRightFromSquare aria-hidden="true" className="text-xs" />
                            View public page
                        </a>
                    ) : null
                }
            />

            <div className="adm-split">
                <div className="adm-stack">
                    <form id="github-config-form" onSubmit={handleSave} className="space-y-6">
                        {/* Connection & authentication */}
                        <Panel title="Connection & authentication">
                            <div className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                    <div className="space-y-2">
                                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
                                            <Field
                                                label="GitHub username"
                                                help="Account used for repositories, commit activity, and stats."
                                                id="github-username"
                                            >
                                                <input
                                                    type="text"
                                                    value={config.username}
                                                    onChange={(e) => setConfig({ ...config, username: e.target.value })}
                                                    placeholder="e.g. octocat"
                                                    className="adm-input font-mono"
                                                />
                                            </Field>
                                            <button
                                                type="button"
                                                onClick={testConnection}
                                                disabled={testing || !config.username}
                                                className="adm-btn mb-5"
                                            >
                                                {testing ? <FaSpinner aria-hidden="true" className="animate-spin" /> : "Verify"}
                                            </button>
                                        </div>

                                        {testResult && (
                                            <div
                                                role="status"
                                                className={`adm-notice ${
                                                    testResult.success ? "adm-notice-ok" : "adm-notice-error"
                                                } flex items-center gap-2.5`}
                                            >
                                                {testResult.success ? (
                                                    <FaCircleCheck aria-hidden="true" className="shrink-0" />
                                                ) : (
                                                    <FaCircleXmark aria-hidden="true" className="shrink-0" />
                                                )}
                                                <span className="text-xs font-mono">{testResult.message}</span>
                                                {testResult.avatar && (
                                                    <img
                                                        src={testResult.avatar}
                                                        alt=""
                                                        className="ml-auto h-6 w-6 rounded-full border border-[var(--hairline)]"
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="adm-field">
                                        <label htmlFor="github-access-token" className="adm-label">
                                            Personal access token (optional)
                                        </label>
                                        {config.hasToken && !showTokenInput ? (
                                            <div className="adm-notice adm-notice-ok flex items-center justify-between gap-2">
                                                <span className="flex items-center gap-2 text-xs font-mono">
                                                    <FaLock aria-hidden="true" />
                                                    Encrypted token stored
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowTokenInput(true)}
                                                    className="adm-link text-xs font-semibold"
                                                >
                                                    Replace token
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    id="github-access-token"
                                                    type="password"
                                                    value={newToken}
                                                    onChange={(e) => setNewToken(e.target.value)}
                                                    placeholder={
                                                        config.hasToken
                                                            ? "Enter new token to overwrite…"
                                                            : "ghp_xxxxxxxxxxxx"
                                                    }
                                                    className="adm-input font-mono"
                                                />
                                                {showTokenInput && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setShowTokenInput(false);
                                                            setNewToken("");
                                                        }}
                                                        className="adm-btn"
                                                    >
                                                        Cancel
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        <p className="adm-help">
                                            Encrypted before storage. Unlocks higher API rate limits and private contribution data.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between gap-4 border-t border-[var(--hairline)] pt-4">
                                    <div className="min-w-0">
                                        <p className="adm-label flex items-center gap-2">
                                            Include private repositories
                                            {config.includePrivate ? (
                                                <FaLock aria-hidden="true" className="text-xs text-[var(--adm-warn-ink)]" />
                                            ) : (
                                                <FaLockOpen aria-hidden="true" className="text-xs text-[var(--text-secondary)]" />
                                            )}
                                        </p>
                                        <p className="adm-help">
                                            {config.hasToken
                                                ? "Include private repositories and contributions in public stats."
                                                : "Requires a valid personal access token."}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={Boolean(config.includePrivate)}
                                        aria-label="Include private repositories"
                                        disabled={!config.hasToken}
                                        onClick={() => setConfig({ ...config, includePrivate: !config.includePrivate })}
                                        className="adm-switch"
                                    />
                                </div>

                                {/* Push webhook */}
                                <div className="space-y-3 border-t border-[var(--hairline)] pt-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                        <div className="adm-field">
                                            <span className="adm-label">Push webhook payload URL</span>
                                            <div className="flex items-center gap-2">
                                                <code className="adm-code flex-1 truncate py-2">{webhookUrl}</code>
                                                <button
                                                    type="button"
                                                    onClick={() => copyToClipboard(webhookUrl, "Payload URL")}
                                                    className="adm-btn"
                                                >
                                                    <FaCopy aria-hidden="true" /> Copy URL
                                                </button>
                                            </div>
                                        </div>

                                        <div className="adm-field">
                                            <label htmlFor="github-webhook-secret" className="adm-label">
                                                Webhook secret (optional)
                                            </label>
                                            {config.hasWebhookSecret && !showWebhookInput ? (
                                                <div className="adm-notice adm-notice-ok flex items-center justify-between gap-2">
                                                    <span className="flex items-center gap-2 text-xs font-mono">
                                                        <FaLock aria-hidden="true" />
                                                        Webhook secret stored
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowWebhookInput(true)}
                                                        className="adm-link text-xs font-semibold"
                                                    >
                                                        Replace
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <input
                                                        id="github-webhook-secret"
                                                        type="text"
                                                        value={newWebhookSecret}
                                                        onChange={(e) => setNewWebhookSecret(e.target.value)}
                                                        placeholder={
                                                            config.hasWebhookSecret
                                                                ? "Enter new secret to overwrite…"
                                                                : "Generate or paste a secret"
                                                        }
                                                        autoComplete="off"
                                                        spellCheck={false}
                                                        className="adm-input flex-1 font-mono"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={generateWebhookSecret}
                                                        className="adm-btn"
                                                    >
                                                        <FaArrowsRotate aria-hidden="true" /> Generate
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => copyToClipboard(newWebhookSecret, "Secret")}
                                                        disabled={!newWebhookSecret}
                                                        className="adm-btn"
                                                    >
                                                        <FaCopy aria-hidden="true" /> Copy
                                                    </button>
                                                    {showWebhookInput && config.hasWebhookSecret && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setShowWebhookInput(false);
                                                                setNewWebhookSecret("");
                                                            }}
                                                            className="adm-btn"
                                                        >
                                                            Cancel
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <p className="adm-help">
                                        Synced projects refresh every 10 minutes automatically. For instant updates, add a webhook on each repository (Settings → Webhooks) with this payload URL, content type <code className="adm-code">application/json</code>, and the secret above. Copy the secret before saving.
                                    </p>
                                </div>
                            </div>
                        </Panel>

                        {/* Module visibility */}
                        <Panel
                            title="Public page modules"
                            actions={
                                <Badge>
                                    {visibleSectionCount} of {totalSectionCount} visible
                                </Badge>
                            }
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {Object.entries(config.sections).map(([key, value]) => {
                                    const Icon = SECTION_ICONS[key] || FaCircleCheck;
                                    const label =
                                        SECTION_LABELS[key] ||
                                        key
                                            .replace(/^show/, "")
                                            .replace(/([A-Z])/g, " $1")
                                            .trim();
                                    return (
                                        <label key={key} className="adm-pick justify-between">
                                            <span className="flex items-center gap-2.5 min-w-0">
                                                <Icon aria-hidden="true" className="shrink-0 text-[var(--text-secondary)]" />
                                                <span className="truncate font-medium">{label}</span>
                                            </span>
                                            <input
                                                type="checkbox"
                                                checked={Boolean(value)}
                                                onChange={() => toggleSection(key)}
                                                className="adm-check"
                                            />
                                        </label>
                                    );
                                })}
                            </div>
                        </Panel>

                        {/* Repository visibility filters */}
                        <Panel
                            title="Repository visibility filters"
                            actions={
                                <Badge tone={config.hiddenRepos?.length ? "warn" : undefined}>
                                    {config.hiddenRepos?.length || 0} hidden
                                </Badge>
                            }
                        >
                            <div className="space-y-4">
                                <div className="relative">
                                    <FaMagnifyingGlass
                                        aria-hidden="true"
                                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-secondary)]"
                                    />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Filter repositories by name…"
                                        aria-label="Filter repositories by name"
                                        className="adm-input !pl-8 font-mono"
                                    />
                                </div>

                                {loadingRepos ? (
                                    <Loading label="Loading repositories" rows={3} />
                                ) : availableRepos.length === 0 ? (
                                    <EmptyState
                                        title="No repositories found"
                                        description="Enter a valid GitHub username above to load repositories."
                                    />
                                ) : filteredRepos.length === 0 ? (
                                    <EmptyState
                                        title={`No repositories matching "${searchQuery}"`}
                                        description="Clear the search filter to see all repositories."
                                    />
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto pr-1">
                                        {filteredRepos.map((repo) => {
                                            const isHidden = config.hiddenRepos?.includes(repo);
                                            return (
                                                <label
                                                    key={repo}
                                                    data-muted={isHidden || undefined}
                                                    className="adm-pick justify-between"
                                                >
                                                    <span className="flex items-center gap-2 min-w-0">
                                                        {isHidden ? (
                                                            <FaEyeSlash
                                                                aria-hidden="true"
                                                                className="shrink-0 text-[var(--adm-error-ink)]"
                                                            />
                                                        ) : (
                                                            <FaBook
                                                                aria-hidden="true"
                                                                className="shrink-0 text-[var(--text-secondary)]"
                                                            />
                                                        )}
                                                        <span
                                                            className={`truncate font-mono text-sm ${
                                                                isHidden ? "line-through text-[var(--text-secondary)]" : ""
                                                            }`}
                                                        >
                                                            {repo}
                                                        </span>
                                                    </span>
                                                    <span className="flex items-center gap-2 shrink-0">
                                                        {isHidden && <Badge tone="error">Hidden</Badge>}
                                                        <input
                                                            type="checkbox"
                                                            checked={Boolean(isHidden)}
                                                            onChange={() => toggleRepoVisibility(repo)}
                                                            aria-label={`Hide ${repo}`}
                                                            className="adm-check"
                                                        />
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                                <p className="adm-help">
                                    Checked repositories are hidden from your public GitHub page and excluded from repository sync below.
                                </p>
                            </div>
                        </Panel>
                    </form>

                    {/* Repo -> Project sync (outside the config form so Enter does not submit config) */}
                    <RepoSyncPanel username={config.username} hiddenRepos={config.hiddenRepos} />
                </div>

                {/* Sticky side column */}
                <aside className="adm-side space-y-6">
                    <Panel title="Save configuration">
                        <div className="space-y-4">
                            {tokenStatus && (
                                <div
                                    className={`adm-notice ${
                                        tokenStatus === "valid"
                                            ? "adm-notice-ok"
                                            : tokenStatus === "invalid"
                                              ? "adm-notice-error"
                                              : "adm-notice-warn"
                                    }`}
                                >
                                    <p className="font-semibold">
                                        {tokenStatus === "valid"
                                            ? "Access token active"
                                            : tokenStatus === "invalid"
                                              ? "Token error"
                                              : "Public rate limits"}
                                    </p>
                                    <p className="adm-help mt-1">
                                        {tokenStatus === "valid"
                                            ? "Full API rate limits and private data access enabled."
                                            : tokenStatus === "invalid"
                                              ? "The stored personal access token is invalid."
                                              : "Add a personal access token for higher rate limits and private stats."}
                                    </p>
                                </div>
                            )}

                            <dl className="space-y-2 text-sm">
                                <div className="flex items-center justify-between gap-2">
                                    <dt className="text-[var(--text-secondary)]">Username</dt>
                                    <dd className="truncate font-mono text-[var(--text-bright)]">
                                        {config.username || "Not set"}
                                    </dd>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    <dt className="text-[var(--text-secondary)]">Access token</dt>
                                    <dd>
                                        <Badge tone={config.hasToken ? "ok" : undefined}>
                                            {config.hasToken ? "Stored" : "None"}
                                        </Badge>
                                    </dd>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    <dt className="text-[var(--text-secondary)]">Webhook secret</dt>
                                    <dd>
                                        <Badge tone={config.hasWebhookSecret ? "ok" : undefined}>
                                            {config.hasWebhookSecret ? "Stored" : "None"}
                                        </Badge>
                                    </dd>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    <dt className="text-[var(--text-secondary)]">Visible modules</dt>
                                    <dd className="adm-num font-semibold text-[var(--text-bright)]">
                                        {visibleSectionCount} / {totalSectionCount}
                                    </dd>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    <dt className="text-[var(--text-secondary)]">Hidden repositories</dt>
                                    <dd className="adm-num font-semibold text-[var(--text-bright)]">
                                        {config.hiddenRepos?.length || 0}
                                    </dd>
                                </div>
                            </dl>

                            <div className="flex flex-col gap-2 border-t border-[var(--hairline)] pt-3">
                                <button
                                    type="submit"
                                    form="github-config-form"
                                    disabled={saving}
                                    className="adm-btn adm-btn-primary w-full"
                                >
                                    {saving ? (
                                        <FaSpinner aria-hidden="true" className="animate-spin" />
                                    ) : (
                                        <FaFloppyDisk aria-hidden="true" />
                                    )}
                                    {saving ? "Saving changes…" : "Save changes"}
                                </button>
                                {config.enabled && config.username && (
                                    <a
                                        href="/github"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="adm-btn w-full"
                                    >
                                        <FaGlobe aria-hidden="true" />
                                        Open public GitHub page
                                    </a>
                                )}
                            </div>
                        </div>
                    </Panel>
                </aside>
            </div>

        </div>
    );
}
