"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAdminFeedback } from "@/app/components/admin/feedback/AdminFeedbackProvider";
import {
    FaServer, FaGauge, FaArrowsRotate, FaSpinner, FaCircleCheck, FaCircleXmark,
    FaPlus, FaTrash, FaRobot, FaTriangleExclamation, FaPlay, FaUpRightFromSquare, FaPause,
} from "react-icons/fa6";
import { PageHeader, Panel, Stat, Badge, EmptyState, Loading, Field } from "@/app/components/admin/ui";
import { fmtBytes, fmtUptime, MeterBar } from "./shared";
import "../../styles/admin-insights.css";

const TABS = [
    { key: "resources", label: "Resources", icon: <FaGauge aria-hidden="true" /> },
    { key: "uptime", label: "Uptime", icon: <FaServer aria-hidden="true" /> },
    { key: "analyzer", label: "AI analyzer", icon: <FaRobot aria-hidden="true" /> },
];

function ResourceMeterPanel({ label, percent, sub, className = "md:col-span-4" }) {
    const pct = Math.max(0, Math.min(100, Math.round(percent || 0)));
    const tone = pct >= 90 ? "error" : pct >= 70 ? "warn" : "ok";
    return (
        <Panel
            title={label}
            actions={<Badge tone={tone}>{pct}%</Badge>}
            className={className}
        >
            <div className="space-y-3">
                <p className="adm-stat-value !mt-0">{pct}%</p>
                <MeterBar label={label} percent={pct} />
                {sub && <p className="adm-help font-mono">{sub}</p>}
            </div>
        </Panel>
    );
}

// ─────────────────────────── Resources tab ───────────────────────────

function ResourcesTab() {
    const [metrics, setMetrics] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [auto, setAuto] = useState(true);
    const timer = useRef(null);

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/health/metrics", { cache: "no-store" });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || "Failed to load metrics");
            setMetrics(data.metrics);
            setError("");
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
        return () => clearInterval(timer.current);
    }, [load]);

    useEffect(() => {
        clearInterval(timer.current);
        if (auto) timer.current = setInterval(load, 5000);
        return () => clearInterval(timer.current);
    }, [auto, load]);

    if (loading && !metrics) {
        return (
            <Panel flush title="Sampling server metrics">
                <Loading label="Sampling server metrics" rows={6} />
            </Panel>
        );
    }

    if (error && !metrics) {
        return (
            <div role="alert" className="adm-notice adm-notice-error flex items-center gap-2.5">
                <FaTriangleExclamation aria-hidden="true" className="shrink-0" />
                <span>{error}</span>
            </div>
        );
    }

    if (!metrics) return null;

    const m = metrics;
    const dbUp = m.database?.status === "up";

    return (
        <div className="space-y-6">
            {error && (
                <div role="alert" className="adm-notice adm-notice-error flex items-center gap-2.5">
                    <FaTriangleExclamation aria-hidden="true" className="shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Badge tone={auto ? "ok" : undefined}>{auto ? "Live (5s polling)" : "Polling paused"}</Badge>
                    <span className="adm-help font-mono">
                        Sampled at {new Date(m.timestamp).toLocaleTimeString()}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        aria-pressed={auto}
                        onClick={() => setAuto((a) => !a)}
                        className="adm-btn"
                    >
                        {auto ? <FaPause aria-hidden="true" /> : <FaPlay aria-hidden="true" />}
                        {auto ? "Pause live updates" : "Resume live updates"}
                    </button>
                    <button type="button" onClick={load} className="adm-btn">
                        <FaArrowsRotate aria-hidden="true" />
                        Refresh
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <ResourceMeterPanel
                    label="CPU utilization"
                    percent={m.cpu.percent}
                    sub={`${m.cpu.cores} cores · load average ${m.cpu.loadAvg.join(" / ")}`}
                    className="md:col-span-4"
                />
                <ResourceMeterPanel
                    label="Memory usage"
                    percent={m.memory.usedPercent}
                    sub={`${fmtBytes(m.memory.used)} used of ${fmtBytes(m.memory.total)}`}
                    className="md:col-span-4"
                />
                <ResourceMeterPanel
                    label="Disk capacity"
                    percent={m.disk?.usedPercent ?? 0}
                    sub={
                        m.disk
                            ? `${fmtBytes(m.disk.used)} / ${fmtBytes(m.disk.total)} · ${fmtBytes(m.disk.free)} free`
                            : "Disk stats unavailable"
                    }
                    className="md:col-span-4"
                />

                <div className="adm-stats md:col-span-12">
                    <Stat
                        label="Event-loop lag"
                        value={`${m.eventLoop.lagMeanMs} ms`}
                        hint="Mean event-loop delay"
                    />
                    <Stat
                        label="Database connection"
                        value={dbUp ? `${m.database.latencyMs} ms` : "Down"}
                        hint={<Badge tone={dbUp ? "ok" : "error"}>{dbUp ? "Connected" : "Unreachable"}</Badge>}
                    />
                    <Stat
                        label="Node.js heap / RSS"
                        value={`${fmtBytes(m.process.heapUsed)} / ${fmtBytes(m.process.rss)}`}
                        hint="Active process memory"
                    />
                    <Stat
                        label="Process uptime"
                        value={fmtUptime(m.process.uptimeSeconds)}
                        hint={`Host up ${fmtUptime(m.host.uptimeSeconds)}`}
                    />
                </div>

                <Panel flush title="Runtime & host environment" className="md:col-span-12">
                    <dl className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[var(--hairline)]">
                        <div className="p-4">
                            <dt className="adm-help">Node.js runtime</dt>
                            <dd className="adm-num mt-1 font-semibold text-[var(--text-bright)]">
                                {m.process.nodeVersion}
                            </dd>
                        </div>
                        <div className="p-4">
                            <dt className="adm-help">Operating system</dt>
                            <dd className="adm-num mt-1 font-semibold text-[var(--text-bright)]">
                                {m.host.platform} {m.host.release}
                            </dd>
                        </div>
                        <div className="p-4">
                            <dt className="adm-help">Host uptime</dt>
                            <dd className="adm-num mt-1 font-semibold text-[var(--text-bright)]">
                                {fmtUptime(m.host.uptimeSeconds)}
                            </dd>
                        </div>
                        <div className="p-4">
                            <dt className="adm-help">Last sample</dt>
                            <dd className="adm-num mt-1 font-semibold text-[var(--text-bright)]">
                                {new Date(m.timestamp).toLocaleTimeString()}
                            </dd>
                        </div>
                    </dl>
                </Panel>
            </div>
        </div>
    );
}

// ─────────────────────────── Uptime tab ───────────────────────────

function HistoryStrip({ history }) {
    if (!history?.length) return <span className="adm-help font-mono">No history</span>;
    return (
        <div className="flex items-end gap-0.5" aria-label="Recent check history">
            {history.map((h, i) => (
                <span
                    key={i}
                    title={`${h.status} · ${h.latencyMs}ms · ${new Date(h.checkedAt).toLocaleString()}`}
                    className="w-1.5 rounded-sm"
                    style={{
                        height: `${Math.max(6, Math.min(24, (h.latencyMs || 0) / 50))}px`,
                        background: h.status === "up" ? "var(--status-success)" : "var(--status-error)",
                        opacity: 0.8,
                    }}
                />
            ))}
        </div>
    );
}

function UptimeTab() {
    const { confirm } = useAdminFeedback();
    const [targets, setTargets] = useState([]);
    const [custom, setCustom] = useState([]);
    const [loading, setLoading] = useState(true);
    const [checking, setChecking] = useState(false);
    const [error, setError] = useState("");
    const [newLabel, setNewLabel] = useState("");
    const [newUrl, setNewUrl] = useState("");
    const [adding, setAdding] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [u, c] = await Promise.all([
                fetch("/api/admin/health/uptime", { cache: "no-store" }).then((r) => r.json()),
                fetch("/api/admin/health/targets", { cache: "no-store" }).then((r) => r.json()),
            ]);
            if (!u.success) throw new Error(u.error);
            setTargets(u.targets || []);
            setCustom(c.targets || []);
            setError("");
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const runCheck = async () => {
        setChecking(true);
        setError("");
        try {
            const res = await fetch("/api/admin/health/uptime/check", { method: "POST" });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            setTargets(data.targets || []);
        } catch (e) {
            setError(e.message);
        } finally {
            setChecking(false);
        }
    };

    const addTarget = async (e) => {
        e.preventDefault();
        setAdding(true);
        setError("");
        try {
            const res = await fetch("/api/admin/health/targets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ label: newLabel, url: newUrl }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            setNewLabel("");
            setNewUrl("");
            await load();
        } catch (e) {
            setError(e.message);
        } finally {
            setAdding(false);
        }
    };

    const removeTarget = async (id) => {
        if (
            !(await confirm({
                title: "Remove endpoint?",
                message: "Remove this custom endpoint from uptime monitoring?",
                confirmText: "Remove",
                danger: true,
            }))
        )
            return;
        await fetch(`/api/admin/health/targets?id=${id}`, { method: "DELETE" });
        await load();
    };

    const upCount = targets.filter((t) => t.latest?.status === "up").length;
    const downCount = targets.filter((t) => t.latest?.status === "down").length;

    return (
        <div className="space-y-6">
            <div className="adm-stats">
                <Stat label="Endpoints up" value={upCount} hint="Responding normally" />
                <Stat label="Endpoints down" value={downCount} hint="Failing health check" />
                <Stat label="Monitored targets" value={targets.length} hint={`${custom.length} custom endpoints`} />
            </div>

            {error && (
                <div role="alert" className="adm-notice adm-notice-error flex items-center gap-2.5">
                    <FaTriangleExclamation aria-hidden="true" className="shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                <Panel
                    flush
                    title="Monitored endpoints"
                    actions={
                        <button
                            type="button"
                            onClick={runCheck}
                            disabled={checking}
                            className="adm-btn adm-btn-primary"
                        >
                            {checking ? <FaSpinner aria-hidden="true" className="animate-spin" /> : <FaPlay aria-hidden="true" />}
                            {checking ? "Checking…" : "Run check now"}
                        </button>
                    }
                    className="md:col-span-12 xl:col-span-8"
                >
                    {loading && targets.length === 0 ? (
                        <Loading label="Loading endpoints" rows={4} />
                    ) : targets.length === 0 ? (
                        <EmptyState
                            title="No monitored endpoints yet"
                            description="Add a deployment with a hosted URL or register a custom health endpoint on the right, then run a check."
                        />
                    ) : (
                        <ul className="adm-list">
                            {targets.map((t) => {
                                const up = t.latest?.status === "up";
                                const noData = !t.latest;
                                return (
                                    <li
                                        key={t.url}
                                        className="adm-row flex-col sm:flex-row !items-start sm:!items-center justify-between gap-3"
                                    >
                                        <div className="flex items-start gap-3 min-w-0 flex-1">
                                            <span className="mt-0.5 shrink-0">
                                                {noData ? (
                                                    <FaServer aria-label="Unchecked" className="text-[var(--text-secondary)]" />
                                                ) : up ? (
                                                    <FaCircleCheck aria-label="Up" className="text-[var(--adm-ok-ink)]" />
                                                ) : (
                                                    <FaCircleXmark aria-label="Down" className="text-[var(--adm-error-ink)]" />
                                                )}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="truncate font-medium text-[var(--text-bright)]">
                                                        {t.label || t.url}
                                                    </span>
                                                    <Badge>{t.source}</Badge>
                                                </div>
                                                <p className="adm-help truncate font-mono mt-0.5">{t.url}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                                            <HistoryStrip history={t.history} />
                                            <div className="min-w-[5.5rem] text-right">
                                                {noData ? (
                                                    <Badge>Unchecked</Badge>
                                                ) : (
                                                    <>
                                                        <p
                                                            className={`adm-num text-sm font-semibold ${
                                                                up ? "text-[var(--adm-ok-ink)]" : "text-[var(--adm-error-ink)]"
                                                            }`}
                                                        >
                                                            {up ? `${t.latest.latencyMs}ms` : t.latest.error || "Down"}
                                                        </p>
                                                        {up && (
                                                            <p className="adm-help adm-num">HTTP {t.latest.statusCode}</p>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                            <a
                                                href={t.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="adm-icon-btn"
                                                aria-label={`Open ${t.label || t.url}`}
                                                title="Open endpoint"
                                            >
                                                <FaUpRightFromSquare aria-hidden="true" className="text-xs" />
                                            </a>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </Panel>

                <Panel title="Custom endpoints" className="md:col-span-12 xl:col-span-4">
                    <div className="space-y-4">
                        <form onSubmit={addTarget} className="space-y-3">
                            <Field label="Label (optional)" id="custom-endpoint-label">
                                <input
                                    value={newLabel}
                                    onChange={(e) => setNewLabel(e.target.value)}
                                    placeholder="e.g. API gateway"
                                    className="adm-input"
                                />
                            </Field>
                            <Field
                                label="Endpoint URL"
                                help="Deployments with a hosted URL are monitored automatically."
                                id="custom-endpoint-url"
                            >
                                <input
                                    value={newUrl}
                                    onChange={(e) => setNewUrl(e.target.value)}
                                    placeholder="https://example.com/health"
                                    required
                                    className="adm-input font-mono"
                                />
                            </Field>
                            <button type="submit" disabled={adding} className="adm-btn adm-btn-primary w-full">
                                {adding ? <FaSpinner aria-hidden="true" className="animate-spin" /> : <FaPlus aria-hidden="true" />}
                                {adding ? "Adding…" : "Add endpoint"}
                            </button>
                        </form>

                        {custom.length > 0 && (
                            <div className="border-t border-[var(--hairline)] pt-3">
                                <p className="adm-label mb-2">Registered custom endpoints</p>
                                <ul className="adm-list -mx-4 sm:-mx-5">
                                    {custom.map((t) => (
                                        <li key={t._id} className="adm-row justify-between">
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-medium text-[var(--text-bright)]">
                                                    {t.label || t.url}
                                                </p>
                                                <p className="adm-help truncate font-mono">{t.url}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeTarget(t._id)}
                                                className="adm-icon-btn"
                                                aria-label={`Remove ${t.label || t.url}`}
                                                title="Remove endpoint"
                                            >
                                                <FaTrash aria-hidden="true" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </Panel>
            </div>
        </div>
    );
}

// ─────────────────────────── AI analyzer tab ───────────────────────────

function AnalyzerTab() {
    const [logText, setLogText] = useState("");
    const [summary, setSummary] = useState("");
    const [signals, setSignals] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const analyze = async () => {
        setLoading(true);
        setError("");
        setSummary("");
        try {
            const res = await fetch("/api/admin/health/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ logText }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            setSummary(data.summary);
            setSignals(data.signals);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {error && (
                <div role="alert" className="adm-notice adm-notice-error flex items-center gap-2.5">
                    <FaTriangleExclamation aria-hidden="true" className="shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                <Panel title="Runtime logs & incident context" className="md:col-span-12 xl:col-span-6">
                    <div className="space-y-4">
                        <Field
                            label="Runtime logs or stack trace (optional)"
                            help="Recent failed uptime checks and security events are automatically included with your logs."
                            id="health-analyzer-logs"
                        >
                            <textarea
                                value={logText}
                                onChange={(e) => setLogText(e.target.value)}
                                rows={10}
                                placeholder="Paste Docker container output, server logs, or stack traces here…"
                                className="adm-input font-mono"
                            />
                        </Field>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <button
                                type="button"
                                onClick={analyze}
                                disabled={loading}
                                className="adm-btn adm-btn-primary"
                            >
                                {loading ? <FaSpinner aria-hidden="true" className="animate-spin" /> : <FaRobot aria-hidden="true" />}
                                {loading ? "Analyzing signals…" : "Analyze with AI"}
                            </button>
                            {signals && (
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge tone={signals.failedChecks > 0 ? "warn" : "ok"}>
                                        {signals.failedChecks} failed checks
                                    </Badge>
                                    <Badge tone={signals.securityEvents > 0 ? "info" : undefined}>
                                        {signals.securityEvents} security events
                                    </Badge>
                                </div>
                            )}
                        </div>
                    </div>
                </Panel>

                <Panel title="Troubleshooting summary" className="md:col-span-12 xl:col-span-6">
                    {loading ? (
                        <Loading label="Generating troubleshooting analysis" rows={6} />
                    ) : !summary ? (
                        <EmptyState
                            title="No analysis generated yet"
                            description="Click Analyze with AI to inspect recent failed checks, security events, and any logs you pasted."
                        />
                    ) : (
                        <pre className="adm-code whitespace-pre-wrap leading-relaxed">{summary}</pre>
                    )}
                </Panel>
            </div>
        </div>
    );
}

export default function HealthDashboard() {
    const [tab, setTab] = useState("resources");

    return (
        <div className="adm-page">
            <PageHeader
                command="top"
                title="Server health"
                description="Live CPU, memory, disk and event-loop telemetry, endpoint uptime checks, and AI-assisted log triage."
            />

            <div role="tablist" aria-label="Server health views" className="adm-tabs">
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

            {tab === "resources" && <ResourcesTab />}
            {tab === "uptime" && <UptimeTab />}
            {tab === "analyzer" && <AnalyzerTab />}
        </div>
    );
}
