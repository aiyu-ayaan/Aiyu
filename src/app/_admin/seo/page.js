"use client";
import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { useAdminFeedback } from "@/app/components/admin/feedback/AdminFeedbackProvider";
import {
    FaMagnifyingGlass, FaArrowsRotate, FaTriangleExclamation, FaCircleCheck,
    FaCircleExclamation, FaRobot, FaSitemap, FaGoogle, FaListCheck,
    FaFloppyDisk, FaPlus, FaTrash, FaPaperPlane, FaSpinner, FaUpRightFromSquare,
} from "react-icons/fa6";
import { PageHeader, Panel, Stat, Badge, EmptyState, Loading, Field } from "@/app/components/admin/ui";
import "../../styles/admin-insights.css";

const TABS = [
    { key: "audit", label: "Meta checker", icon: <FaListCheck aria-hidden="true" /> },
    { key: "crawl", label: "Crawl audit", icon: <FaMagnifyingGlass aria-hidden="true" /> },
    { key: "robots", label: "Robots & sitemap", icon: <FaSitemap aria-hidden="true" /> },
    { key: "indexing", label: "Google indexing", icon: <FaGoogle aria-hidden="true" /> },
];

const CHANGE_FREQS = ["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"];

function severityTone(severity) {
    if (severity === "error") return "error";
    if (severity === "warning") return "warn";
    return "ok";
}

// ─────────────────────────── Meta checker tab ───────────────────────────

function AuditGroup({ title, records, className = "md:col-span-6" }) {
    const count = records?.length || 0;
    const issueCount = (records || []).filter((r) => r.issues?.length > 0).length;
    return (
        <Panel
            flush
            title={title}
            actions={
                <>
                    {issueCount > 0 && <Badge tone="warn">{issueCount} with issues</Badge>}
                    <Badge>{count} {count === 1 ? "item" : "items"}</Badge>
                </>
            }
            className={`flex flex-col ${className}`}
        >
            {!count ? (
                <EmptyState title={`No ${title.toLowerCase()} audited yet.`} />
            ) : (
                <ul className="adm-list flex flex-1 flex-col">
                    {records.map((r) => {
                        const worst = r.issues.some((i) => i.severity === "error")
                            ? "error"
                            : r.issues.length
                              ? "warn"
                              : "ok";
                        return (
                            <li key={r.id} className="adm-row !items-start flex-col sm:flex-row sm:!items-center justify-between gap-3">
                                <div className="min-w-0 flex-1 space-y-1.5">
                                    <div className="flex items-center gap-2 min-w-0">
                                        {worst === "ok" ? (
                                            <FaCircleCheck aria-label="Clean" className="shrink-0 text-[var(--adm-ok-ink)]" />
                                        ) : (
                                            <FaCircleExclamation
                                                aria-label={worst === "error" ? "Error" : "Warning"}
                                                className={`shrink-0 ${worst === "error" ? "text-[var(--adm-error-ink)]" : "text-[var(--adm-warn-ink)]"}`}
                                            />
                                        )}
                                        <span className="truncate font-medium text-[var(--text-bright)]">{r.title}</span>
                                        <span className="adm-help truncate font-mono">{r.url}</span>
                                    </div>
                                    {r.issues.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 pl-6">
                                            {r.issues.map((i, idx) => (
                                                <Badge key={idx} tone={severityTone(i.severity)}>
                                                    {i.message}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                    <a
                                        href={r.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="adm-icon-btn"
                                        aria-label={`View live page for ${r.title}`}
                                        title="View live page"
                                    >
                                        <FaUpRightFromSquare aria-hidden="true" className="text-xs" />
                                    </a>
                                    <Link href={r.editUrl} className="adm-btn">
                                        Edit
                                    </Link>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </Panel>
    );
}

function MetaCheckerTab({ audit, loading, onRefresh, onFixAll, fixingState }) {
    const s = audit?.summary || {};
    const hasFixableIssues = (s.warnings || 0) + (s.errors || 0) > 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="adm-stats flex-1">
                    <Stat label="Audited records" value={s.total ?? 0} />
                    <Stat label="Clean" value={s.ok ?? 0} hint="All meta tags present" />
                    <Stat label="Warnings" value={s.warnings ?? 0} hint="Recommended fixes" />
                    <Stat label="Errors" value={s.errors ?? 0} hint="Missing required fields" />
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={onRefresh}
                    disabled={loading || fixingState === "running"}
                    className="adm-btn"
                >
                    <FaArrowsRotate aria-hidden="true" className={loading ? "animate-spin" : ""} />
                    Rescan metadata
                </button>
                {hasFixableIssues && (
                    <button
                        type="button"
                        onClick={onFixAll}
                        disabled={loading || fixingState === "running"}
                        className="adm-btn adm-btn-primary"
                    >
                        <FaRobot aria-hidden="true" className={fixingState === "running" ? "animate-spin" : ""} />
                        Fix warnings with AI
                    </button>
                )}
            </div>

            {loading && !audit ? (
                <Panel flush title="Scanning records">
                    <Loading label="Scanning metadata" rows={6} />
                </Panel>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <AuditGroup title="Blogs" records={audit?.groups?.blogs} className="md:col-span-6" />
                    <AuditGroup title="Projects" records={audit?.groups?.projects} className="md:col-span-6" />
                    <AuditGroup title="Apps" records={audit?.groups?.apps} className="md:col-span-6" />
                    <AuditGroup title="Static pages" records={audit?.groups?.static} className="md:col-span-6" />
                </div>
            )}
        </div>
    );
}

// ─────────────────────────── Crawl audit tab ───────────────────────────

function CrawlTab({ crawl, crawling, onRun }) {
    const s = crawl?.summary || {};
    return (
        <div className="space-y-6">
            <div className="adm-stats">
                <Stat label="Sitemap URLs" value={s.total ?? 0} />
                <Stat label="Healthy (200)" value={s.ok ?? 0} />
                <Stat label="Warnings" value={s.warnings ?? 0} />
                <Stat label="Errors" value={s.errors ?? 0} />
                <Stat label="Average TTFB" value={s.avgMs ? `${s.avgMs}ms` : "—"} />
            </div>

            <Panel
                flush
                title="Live sitemap crawl"
                actions={
                    <>
                        {crawl?.base && <Badge>Googlebot · {crawl.base}</Badge>}
                        <button type="button" onClick={onRun} disabled={crawling} className="adm-btn adm-btn-primary">
                            {crawling ? <FaSpinner aria-hidden="true" className="animate-spin" /> : <FaMagnifyingGlass aria-hidden="true" />}
                            {crawling ? "Crawling…" : "Run crawl audit"}
                        </button>
                    </>
                }
            >
                {!crawl ? (
                    <EmptyState
                        title="No crawl audit run in this session"
                        description="Crawl every sitemap URL live as Googlebot to verify HTTP status codes, response latency, canonical links, and meta tags."
                        action={
                            <button type="button" onClick={onRun} disabled={crawling} className="adm-btn adm-btn-primary mt-1">
                                {crawling ? <FaSpinner aria-hidden="true" className="animate-spin" /> : <FaMagnifyingGlass aria-hidden="true" />}
                                Run crawl audit
                            </button>
                        }
                    />
                ) : (
                    <ul className="adm-list">
                        {crawl.results.map((r) => (
                            <li key={r.url} className="adm-row !items-start flex-col gap-2">
                                <div className="flex w-full flex-wrap items-center justify-between gap-3">
                                    <span className="min-w-0 flex-1 truncate font-mono text-sm text-[var(--text-bright)]">
                                        {r.url}
                                    </span>
                                    <Badge tone={r.status === 200 ? "ok" : "error"}>
                                        {r.status}{typeof r.ms === "number" ? ` · ${r.ms}ms` : ""}
                                    </Badge>
                                </div>
                                {r.issues?.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {r.issues.map((i, idx) => (
                                            <Badge key={idx} tone={severityTone(i.severity)}>
                                                {i.message}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </Panel>
        </div>
    );
}

// ─────────────────────── Robots & sitemap tab ───────────────────────

function linesToArray(text) {
    return String(text || "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
}

function buildRobotsPreview(rules, extraSitemaps, sitemapUrl) {
    const out = [];
    for (const rule of rules) {
        out.push(`User-agent: ${rule.userAgent || "*"}`);
        for (const a of linesToArray(rule.allowText)) out.push(`Allow: ${a}`);
        for (const d of linesToArray(rule.disallowText)) out.push(`Disallow: ${d}`);
        if (Number.isFinite(Number(rule.crawlDelay)) && String(rule.crawlDelay) !== "")
            out.push(`Crawl-delay: ${rule.crawlDelay}`);
        out.push("");
    }
    out.push(`Sitemap: ${sitemapUrl}`);
    for (const sm of linesToArray(extraSitemaps)) out.push(`Sitemap: ${sm}`);
    return out.join("\n");
}

function RobotsSitemapTab({ form, setForm, onSave, saving, siteSitemapUrl }) {
    const updateRule = (idx, patch) => {
        setForm((f) => ({
            ...f,
            robotsRules: f.robotsRules.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
        }));
    };
    const addRule = () =>
        setForm((f) => ({
            ...f,
            robotsRules: [...f.robotsRules, { userAgent: "", allowText: "/", disallowText: "", crawlDelay: "" }],
        }));
    const removeRule = (idx) =>
        setForm((f) => ({
            ...f,
            robotsRules: f.robotsRules.filter((_, i) => i !== idx),
        }));

    const addUrl = () =>
        setForm((f) => ({
            ...f,
            extraUrls: [...f.extraUrls, { url: "", changeFrequency: "monthly", priority: 0.5 }],
        }));
    const updateUrl = (idx, patch) =>
        setForm((f) => ({
            ...f,
            extraUrls: f.extraUrls.map((u, i) => (i === idx ? { ...u, ...patch } : u)),
        }));
    const removeUrl = (idx) =>
        setForm((f) => ({
            ...f,
            extraUrls: f.extraUrls.filter((_, i) => i !== idx),
        }));

    const preview = useMemo(
        () => buildRobotsPreview(form.robotsRules, form.extraSitemapsText, siteSitemapUrl),
        [form.robotsRules, form.extraSitemapsText, siteSitemapUrl]
    );

    return (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_24rem] gap-6 items-start">
            <div className="space-y-6 min-w-0">
                <Panel
                    title="Robots.txt rules"
                    actions={
                        <button type="button" onClick={addRule} className="adm-btn">
                            <FaPlus aria-hidden="true" /> Add rule
                        </button>
                    }
                >
                    <div className="space-y-4">
                        {form.robotsRules.map((rule, idx) => (
                            <div
                                key={idx}
                                className="rounded-xl border border-[var(--hairline)] bg-[var(--bg-secondary)] p-4 space-y-4"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="grid flex-1 grid-cols-1 sm:grid-cols-2 gap-4">
                                        <Field label="User-agent" id={`rule-ua-${idx}`}>
                                            <input
                                                value={rule.userAgent}
                                                onChange={(e) => updateRule(idx, { userAgent: e.target.value })}
                                                placeholder="e.g. * or Googlebot"
                                                className="adm-input font-mono"
                                            />
                                        </Field>
                                        <Field label="Crawl delay (seconds)" id={`rule-delay-${idx}`}>
                                            <input
                                                value={rule.crawlDelay}
                                                onChange={(e) => updateRule(idx, { crawlDelay: e.target.value })}
                                                type="number"
                                                placeholder="Optional"
                                                className="adm-input font-mono"
                                            />
                                        </Field>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeRule(idx)}
                                        className="adm-icon-btn mt-6"
                                        aria-label={`Remove rule ${idx + 1}`}
                                        title="Remove rule"
                                    >
                                        <FaTrash aria-hidden="true" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field label="Allow paths (one per line)" id={`rule-allow-${idx}`}>
                                        <textarea
                                            value={rule.allowText}
                                            onChange={(e) => updateRule(idx, { allowText: e.target.value })}
                                            rows={3}
                                            className="adm-input font-mono"
                                        />
                                    </Field>
                                    <Field label="Disallow paths (one per line)" id={`rule-disallow-${idx}`}>
                                        <textarea
                                            value={rule.disallowText}
                                            onChange={(e) => updateRule(idx, { disallowText: e.target.value })}
                                            rows={3}
                                            className="adm-input font-mono"
                                        />
                                    </Field>
                                </div>
                            </div>
                        ))}

                        <Field
                            label="Additional sitemaps (one URL per line)"
                            help="Appended after the primary /sitemap.xml line."
                            id="robots-extra-sitemaps"
                        >
                            <textarea
                                value={form.extraSitemapsText}
                                onChange={(e) => setForm((f) => ({ ...f, extraSitemapsText: e.target.value }))}
                                rows={2}
                                className="adm-input font-mono"
                            />
                        </Field>
                    </div>
                </Panel>

                <Panel
                    title="Sitemap overrides"
                    actions={
                        <button type="button" onClick={addUrl} className="adm-btn">
                            <FaPlus aria-hidden="true" /> Add URL
                        </button>
                    }
                >
                    <div className="space-y-4">
                        <Field
                            label="Excluded paths (one per line)"
                            help="Any public route matching an excluded path is omitted from /sitemap.xml."
                            id="sitemap-exclude-paths"
                        >
                            <textarea
                                value={form.excludePathsText}
                                onChange={(e) => setForm((f) => ({ ...f, excludePathsText: e.target.value }))}
                                rows={3}
                                className="adm-input font-mono"
                            />
                        </Field>

                        <div className="space-y-3">
                            <p className="adm-label">Extra sitemap URLs</p>
                            {form.extraUrls.length === 0 ? (
                                <p className="adm-help">No extra URLs configured.</p>
                            ) : (
                                form.extraUrls.map((u, idx) => (
                                    <div
                                        key={idx}
                                        className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_9rem_6rem_auto] items-end gap-3 rounded-xl border border-[var(--hairline)] bg-[var(--bg-secondary)] p-3"
                                    >
                                        <Field label="Path or full URL" id={`extra-url-${idx}`}>
                                            <input
                                                value={u.url}
                                                onChange={(e) => updateUrl(idx, { url: e.target.value })}
                                                placeholder="/custom-path or https://…"
                                                className="adm-input font-mono"
                                            />
                                        </Field>
                                        <Field label="Frequency" id={`extra-freq-${idx}`}>
                                            <select
                                                value={u.changeFrequency}
                                                onChange={(e) => updateUrl(idx, { changeFrequency: e.target.value })}
                                                className="adm-input"
                                            >
                                                {CHANGE_FREQS.map((f) => (
                                                    <option key={f} value={f}>
                                                        {f}
                                                    </option>
                                                ))}
                                            </select>
                                        </Field>
                                        <Field label="Priority" id={`extra-prio-${idx}`}>
                                            <input
                                                value={u.priority}
                                                onChange={(e) => updateUrl(idx, { priority: parseFloat(e.target.value) })}
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                max="1"
                                                className="adm-input adm-num"
                                            />
                                        </Field>
                                        <button
                                            type="button"
                                            onClick={() => removeUrl(idx)}
                                            className="adm-icon-btn"
                                            aria-label={`Remove URL ${idx + 1}`}
                                            title="Remove URL"
                                        >
                                            <FaTrash aria-hidden="true" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </Panel>
            </div>

            <aside className="adm-side space-y-6">
                <Panel title="Publish rules">
                    <div className="space-y-3">
                        <p className="adm-help">
                            Changes take effect immediately on live <code className="adm-code">/robots.txt</code> and <code className="adm-code">/sitemap.xml</code> requests.
                        </p>
                        <button
                            type="button"
                            onClick={onSave}
                            disabled={saving}
                            className="adm-btn adm-btn-primary w-full"
                        >
                            {saving ? <FaSpinner aria-hidden="true" className="animate-spin" /> : <FaFloppyDisk aria-hidden="true" />}
                            {saving ? "Saving…" : "Save robots & sitemap"}
                        </button>
                    </div>
                </Panel>

                <Panel title="robots.txt preview">
                    <pre className="adm-code whitespace-pre-wrap">{preview}</pre>
                </Panel>
            </aside>
        </div>
    );
}

// ─────────────────────────── Google indexing tab ───────────────────────────

function IndexingTab({ status, logs, urls, indexing, onToggleAutoPing, onSaveKey, onClearKey, onPing, savingKey, pinging }) {
    const [keyInput, setKeyInput] = useState("");
    const [urlText, setUrlText] = useState("");
    const [type, setType] = useState("URL_UPDATED");

    useEffect(() => {
        setUrlText((urls || []).join("\n"));
    }, [urls]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <Panel
                title="Google service account"
                actions={
                    status?.hasServiceAccount ? (
                        <Badge tone={status.invalid ? "error" : "ok"}>
                            {status.invalid ? "Invalid key" : "Connected"}
                        </Badge>
                    ) : (
                        <Badge>Not configured</Badge>
                    )
                }
                className="md:col-span-6"
            >
                <div className="space-y-4">
                    <div
                        className={`adm-notice ${
                            status?.hasServiceAccount
                                ? status.invalid
                                    ? "adm-notice-error"
                                    : "adm-notice-ok"
                                : ""
                        }`}
                    >
                        {status?.hasServiceAccount
                            ? status.invalid
                                ? "Stored service account key is invalid or could not be parsed."
                                : `Configured service account: ${status.email}`
                            : "No Google Indexing API service account configured yet."}
                    </div>

                    <Field
                        label="Service account JSON key"
                        help="Paste the JSON credentials for a service account granted Owner access in Google Search Console."
                        id="google-sa-json"
                    >
                        <textarea
                            value={keyInput}
                            onChange={(e) => setKeyInput(e.target.value)}
                            rows={6}
                            placeholder='{"type": "service_account", "client_email": "…"}'
                            className="adm-input font-mono"
                        />
                    </Field>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                onSaveKey(keyInput);
                                setKeyInput("");
                            }}
                            disabled={savingKey || !keyInput.trim()}
                            className="adm-btn adm-btn-primary"
                        >
                            {savingKey ? <FaSpinner aria-hidden="true" className="animate-spin" /> : <FaFloppyDisk aria-hidden="true" />}
                            Save key
                        </button>
                        {status?.hasServiceAccount && (
                            <button
                                type="button"
                                onClick={onClearKey}
                                disabled={savingKey}
                                className="adm-btn adm-btn-danger"
                            >
                                <FaTrash aria-hidden="true" /> Remove key
                            </button>
                        )}
                    </div>

                    <div className="flex items-center justify-between gap-4 border-t border-[var(--hairline)] pt-4">
                        <div className="min-w-0">
                            <p className="adm-label">Auto-ping on content changes</p>
                            <p className="adm-help">
                                Notify Google automatically when blogs, projects, apps, or site navigation change.
                            </p>
                        </div>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={indexing?.autoPing === true}
                            aria-label="Auto-ping on content changes"
                            disabled={savingKey || !status?.hasServiceAccount}
                            onClick={() => onToggleAutoPing(!(indexing?.autoPing === true))}
                            className="adm-switch"
                        />
                    </div>
                </div>
            </Panel>

            <Panel title="Request indexing" className="md:col-span-6">
                <div className="space-y-4">
                    <Field
                        label="URLs to submit (one per line)"
                        help="Pre-filled with your audited public URLs. Edit or replace before submitting."
                        id="indexing-urls"
                    >
                        <textarea
                            value={urlText}
                            onChange={(e) => setUrlText(e.target.value)}
                            rows={6}
                            placeholder="https://example.com/blogs/my-post"
                            className="adm-input font-mono"
                        />
                    </Field>

                    <div className="grid grid-cols-1 sm:grid-cols-[12rem_minmax(0,1fr)] items-end gap-3">
                        <Field label="Notification type" id="indexing-type">
                            <select value={type} onChange={(e) => setType(e.target.value)} className="adm-input">
                                <option value="URL_UPDATED">URL updated</option>
                                <option value="URL_DELETED">URL deleted</option>
                            </select>
                        </Field>
                        <button
                            type="button"
                            onClick={() => onPing(linesToArray(urlText), type)}
                            disabled={pinging || !status?.hasServiceAccount}
                            className="adm-btn adm-btn-primary"
                        >
                            {pinging ? <FaSpinner aria-hidden="true" className="animate-spin" /> : <FaPaperPlane aria-hidden="true" />}
                            {pinging ? "Submitting…" : "Ping Google"}
                        </button>
                    </div>

                    {!status?.hasServiceAccount && (
                        <p className="adm-help">Configure a Google service account on the left before submitting URLs.</p>
                    )}
                </div>
            </Panel>

            <Panel
                flush
                title="Indexing request log"
                actions={<Badge>{logs?.length || 0} requests</Badge>}
                className="md:col-span-12"
            >
                {!logs?.length ? (
                    <EmptyState title="No indexing requests logged yet." />
                ) : (
                    <div className="adm-table-wrap">
                        <table className="adm-table">
                            <thead>
                                <tr>
                                    <th>Status</th>
                                    <th>URL</th>
                                    <th>Type</th>
                                    <th>Timestamp</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((l) => (
                                    <tr key={l._id}>
                                        <td>
                                            <Badge tone={l.status === "success" ? "ok" : "error"}>
                                                {l.status === "success" ? "Accepted" : "Failed"}
                                            </Badge>
                                        </td>
                                        <td>
                                            <span className="block font-mono text-sm text-[var(--text-bright)]">{l.url}</span>
                                            {l.status !== "success" && l.response && (
                                                <span className="adm-field-error mt-1 block">{l.response}</span>
                                            )}
                                        </td>
                                        <td className="font-mono text-xs text-[var(--text-secondary)]">{l.type}</td>
                                        <td className="adm-num text-xs text-[var(--text-secondary)] whitespace-nowrap">
                                            {new Date(l.createdAt).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Panel>
        </div>
    );
}

// ─────────────────────────────── Page ───────────────────────────────

function configToForm(config) {
    const rules = (config?.robots?.rules || []).map((r) => ({
        userAgent: r.userAgent || "",
        allowText: (Array.isArray(r.allow) ? r.allow : [r.allow].filter(Boolean)).join("\n"),
        disallowText: (r.disallow || []).join("\n"),
        crawlDelay: r.crawlDelay ?? "",
    }));
    return {
        robotsRules: rules.length ? rules : [{ userAgent: "*", allowText: "/", disallowText: "", crawlDelay: "" }],
        extraSitemapsText: (config?.robots?.extraSitemaps || []).join("\n"),
        excludePathsText: (config?.sitemap?.excludePaths || []).join("\n"),
        extraUrls: (config?.sitemap?.extraUrls || []).map((u) => ({
            url: u.url || "",
            changeFrequency: u.changeFrequency || "monthly",
            priority: typeof u.priority === "number" ? u.priority : 0.5,
        })),
    };
}

function formToConfigBody(form) {
    return {
        robots: {
            rules: form.robotsRules.map((r) => ({
                userAgent: r.userAgent || "*",
                allow: linesToArray(r.allowText),
                disallow: linesToArray(r.disallowText),
                ...(String(r.crawlDelay) !== "" && Number.isFinite(Number(r.crawlDelay))
                    ? { crawlDelay: Number(r.crawlDelay) }
                    : {}),
            })),
            extraSitemaps: linesToArray(form.extraSitemapsText),
        },
        sitemap: {
            excludePaths: linesToArray(form.excludePathsText),
            extraUrls: form.extraUrls
                .filter((u) => u.url?.trim())
                .map((u) => ({
                    url: u.url.trim(),
                    changeFrequency: u.changeFrequency,
                    priority: typeof u.priority === "number" && !Number.isNaN(u.priority) ? u.priority : 0.5,
                })),
        },
    };
}

export default function SeoDashboard() {
    const { confirm } = useAdminFeedback();
    const [tab, setTab] = useState("audit");
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

    const [fixingState, setFixingState] = useState(null);
    const [fixingProgress, setFixingProgress] = useState({ current: 0, total: 0, currentName: "" });
    const stopFixingRef = useRef(false);

    const flash = (msg) => {
        setNotice(msg);
        setTimeout(() => setNotice(null), 4000);
    };

    const loadAudit = useCallback(async () => {
        setLoadingAudit(true);
        try {
            const res = await fetch("/api/admin/seo/audit", { cache: "no-store" });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || "Could not load SEO audit.");
            setAudit(json);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoadingAudit(false);
        }
    }, []);

    const loadConfig = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/seo/config", { cache: "no-store" });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || "Could not load SEO configuration.");
            setConfigData(json);
            setForm(configToForm(json.config));
        } catch (e) {
            setError(e.message);
        }
    }, []);

    useEffect(() => {
        loadAudit();
        loadConfig();
    }, [loadAudit, loadConfig]);

    const fixAllWithAi = async () => {
        if (!audit) return;
        setFixingState("running");
        stopFixingRef.current = false;
        setError(null);

        const itemsToFix = [];
        const groups = audit.groups || {};
        const isFixable = (issues) =>
            (issues || []).some((i) => ["seoDescription", "description", "imageAlt", "siteTitle"].includes(i.field));

        if (groups.blogs) {
            groups.blogs.forEach((b) => {
                if (isFixable(b.issues)) itemsToFix.push({ type: "blog", id: b.id, name: b.title });
            });
        }
        if (groups.projects) {
            groups.projects.forEach((p) => {
                if (isFixable(p.issues)) itemsToFix.push({ type: "project", id: p.id, name: p.title });
            });
        }
        if (groups.apps) {
            groups.apps.forEach((a) => {
                if (isFixable(a.issues)) itemsToFix.push({ type: "app", id: a.id, name: a.title });
            });
        }
        if (groups.static) {
            groups.static.forEach((s) => {
                if (isFixable(s.issues)) itemsToFix.push({ type: "static", id: s.id, name: `Static config: ${s.title}` });
            });
        }

        if (itemsToFix.length === 0) {
            flash("No fixable SEO warnings found.");
            setFixingState(null);
            return;
        }

        let fixedCount = 0;
        setFixingProgress({ current: 0, total: itemsToFix.length, currentName: "" });

        for (let i = 0; i < itemsToFix.length; i++) {
            if (stopFixingRef.current) {
                setFixingState("paused");
                flash("AI fixing paused.");
                loadAudit();
                return;
            }

            const item = itemsToFix[i];
            setFixingProgress({ current: i + 1, total: itemsToFix.length, currentName: item.name });

            try {
                const res = await fetch("/api/admin/seo/fix", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ type: item.type, id: item.id }),
                });

                const data = await res.json();
                if (!res.ok || !data.success) {
                    throw new Error(data.error || "Failed to apply AI fix.");
                }
                fixedCount++;
            } catch (err) {
                setError(`AI fixing interrupted at "${item.name}": ${err.message}`);
                setFixingState(null);
                loadAudit();
                return;
            }
        }

        setFixingState("completed");
        flash(`AI SEO auto-fix completed. Fixed ${fixedCount} item(s).`);
        loadAudit();
        setTimeout(() => setFixingState(null), 5000);
    };

    const handleStopFixing = () => {
        stopFixingRef.current = true;
    };

    const runCrawl = async () => {
        setCrawling(true);
        setError(null);
        try {
            const res = await fetch("/api/admin/seo/crawl", { method: "POST" });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || "Crawl failed.");
            setCrawl(json);
        } catch (e) {
            setError(e.message);
        } finally {
            setCrawling(false);
        }
    };

    const saveConfig = async () => {
        setSaving(true);
        setError(null);
        try {
            const res = await fetch("/api/admin/seo/config", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formToConfigBody(form)),
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || "Could not save configuration.");
            setConfigData((d) => ({ ...d, config: json.config }));
            flash("Robots & sitemap configuration saved.");
        } catch (e) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    const saveKey = async (serviceAccount) => {
        setSavingKey(true);
        setError(null);
        try {
            const res = await fetch("/api/admin/seo/config", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ serviceAccount }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || "Could not save service account.");
            setConfigData((d) => ({ ...d, serviceAccount: json.serviceAccount }));
            flash("Service account saved.");
        } catch (e) {
            setError(e.message);
        } finally {
            setSavingKey(false);
        }
    };

    const clearKey = async () => {
        if (
            !(await confirm({
                title: "Remove service account?",
                message: "Remove the stored Google Indexing API service account credentials?",
                confirmText: "Remove",
                danger: true,
            }))
        )
            return;
        await saveKey("");
    };

    const toggleAutoPing = async (autoPing) => {
        setSavingKey(true);
        setError(null);
        try {
            const res = await fetch("/api/admin/seo/config", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ indexing: { ...(configData?.config?.indexing || {}), autoPing } }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || "Could not update auto-ping setting.");
            setConfigData((d) => ({ ...d, config: json.config }));
            flash(autoPing ? "Auto-ping enabled." : "Auto-ping disabled.");
        } catch (e) {
            setError(e.message);
        } finally {
            setSavingKey(false);
        }
    };

    const ping = async (urls, type) => {
        if (!urls.length) {
            setError("No URLs to submit.");
            return;
        }
        setPinging(true);
        setError(null);
        try {
            const res = await fetch("/api/admin/seo/index", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ urls, type }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || "Ping failed.");
            flash(`Submitted ${json.sent} URL(s); ${json.ok} accepted.`);
            loadConfig();
        } catch (e) {
            setError(e.message);
        } finally {
            setPinging(false);
        }
    };

    const indexableUrls = useMemo(() => {
        const g = audit?.groups || {};
        return [...(g.blogs || []), ...(g.projects || []), ...(g.apps || [])].map((r) => r.url);
    }, [audit]);

    const siteSitemapUrl = useMemo(
        () => (crawl?.base || configData?.config?.base || "") + "/sitemap.xml",
        [crawl, configData]
    );

    return (
        <div className="adm-page">
            <PageHeader
                command="seo --audit"
                title="SEO & crawl"
                description="Audit metadata completeness across content, crawl sitemap URLs live, edit robots.txt and sitemap rules, and request Google indexing."
            />

            <div role="tablist" aria-label="SEO tools" className="adm-tabs">
                {TABS.map((t) => (
                    <button
                        key={t.key}
                        type="button"
                        role="tab"
                        aria-selected={tab === t.key}
                        onClick={() => setTab(t.key)}
                        className="adm-tab"
                    >
                        {t.icon}
                        {t.label}
                    </button>
                ))}
            </div>

            {error && (
                <div role="alert" className="adm-notice adm-notice-error flex items-center gap-2.5">
                    <FaTriangleExclamation aria-hidden="true" className="shrink-0" />
                    <span>{error}</span>
                </div>
            )}
            {notice && (
                <div role="status" className="adm-notice adm-notice-ok flex items-center gap-2.5">
                    <FaCircleCheck aria-hidden="true" className="shrink-0" />
                    <span>{notice}</span>
                </div>
            )}

            {fixingState && (
                <Panel
                    title={fixingState === "running" ? "AI SEO auto-fix running" : "AI SEO auto-fix paused"}
                    actions={
                        fixingState === "running" ? (
                            <button type="button" onClick={handleStopFixing} className="adm-btn">
                                Pause fixing
                            </button>
                        ) : (
                            <button type="button" onClick={fixAllWithAi} className="adm-btn adm-btn-primary">
                                Resume fixing
                            </button>
                        )
                    }
                >
                    <div className="space-y-2.5">
                        <p className="text-sm text-[var(--text-secondary)]">
                            {fixingState === "running"
                                ? `Fixing "${fixingProgress.currentName}" (${fixingProgress.current} of ${fixingProgress.total})`
                                : `Processed ${fixingProgress.current} of ${fixingProgress.total} items.`}
                        </p>
                        <div className="adm-meter">
                            <span
                                style={{
                                    width: `${fixingProgress.total ? (fixingProgress.current / fixingProgress.total) * 100 : 0}%`,
                                }}
                            />
                        </div>
                    </div>
                </Panel>
            )}

            {tab === "audit" && (
                <MetaCheckerTab
                    audit={audit}
                    loading={loadingAudit}
                    onRefresh={loadAudit}
                    onFixAll={fixAllWithAi}
                    fixingState={fixingState}
                />
            )}
            {tab === "crawl" && <CrawlTab crawl={crawl} crawling={crawling} onRun={runCrawl} />}
            {tab === "robots" && (
                <RobotsSitemapTab
                    form={form}
                    setForm={setForm}
                    onSave={saveConfig}
                    saving={saving}
                    siteSitemapUrl={siteSitemapUrl}
                />
            )}
            {tab === "indexing" && (
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
