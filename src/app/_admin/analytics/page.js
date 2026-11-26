"use client";
import React, { useCallback, useEffect, useState } from "react";
import {
    FaArrowsRotate, FaTriangleExclamation, FaArrowTrendUp, FaArrowTrendDown,
    FaTrash,
} from "react-icons/fa6";
import { BarList, DonutSplit, WorldMap } from "./charts";
import LineChart from "./LineChart";
import { useAdminFeedback } from "@/app/components/admin/feedback/AdminFeedbackProvider";
import { PageHeader, Panel, Stat, Badge, Loading } from "@/app/components/admin/ui";
import "../../styles/admin-insights.css";

const RANGES = [
    { key: "7d", label: "7 days" },
    { key: "30d", label: "30 days" },
    { key: "90d", label: "90 days" },
];

const DEVICE_COLORS = {
    desktop: "var(--accent-cyan)",
    mobile: "var(--accent-purple)",
    tablet: "var(--status-success)",
    bot: "var(--text-tertiary)",
};

const REFERRER_LABELS = {
    direct: "Direct",
    internal: "Internal",
    search: "Search",
    social: "Social",
    external: "External",
};

const ENTITY_META = {
    blog: { label: "Top blogs", base: "/blogs/" },
    project: { label: "Top projects", base: "/projects/" },
    app: { label: "Top apps", base: "/apps/" },
    gallery: { label: "Top gallery items", base: "/gallery/" },
};

const RANGE_DAYS = { "7d": 7, "30d": 30, "90d": 90 };

/** Percentage change of `cur` vs `prev`. Returns null when there's no baseline. */
function pctDelta(cur = 0, prev = 0) {
    if (!prev) return cur > 0 ? null : 0;
    return ((cur - prev) / prev) * 100;
}

/** Turn a 2-letter ISO country code into its flag emoji. */
function flagEmoji(code = "") {
    const cc = String(code).trim().toUpperCase();
    if (cc.length !== 2 || !/^[A-Z]{2}$/.test(cc)) return "🏳️";
    return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

let COUNTRY_NAMES;
function countryName(code = "") {
    const cc = String(code).trim().toUpperCase();
    try {
        COUNTRY_NAMES ||= new Intl.DisplayNames(["en"], { type: "region" });
        return COUNTRY_NAMES.of(cc) || cc;
    } catch {
        return cc;
    }
}

function DeltaBadge({ delta }) {
    if (delta === null || delta === undefined) {
        return <Badge tone="info">New</Badge>;
    }
    if (Math.abs(delta) < 0.05) {
        return <span className="adm-help adm-num">0%</span>;
    }
    const up = delta > 0;
    return (
        <Badge tone={up ? "ok" : "error"}>
            {up ? <FaArrowTrendUp aria-label="Up" /> : <FaArrowTrendDown aria-label="Down" />}
            {Math.abs(delta).toFixed(delta > -100 && delta < 1000 ? 1 : 0)}%
        </Badge>
    );
}

function KpiStatCard({ label, value, delta, sub, periodDays }) {
    return (
        <Stat
            label={label}
            value={(value ?? 0).toLocaleString()}
            hint={
                <span className="flex min-h-6 flex-wrap items-center gap-2">
                    {delta !== false && <DeltaBadge delta={delta} />}
                    <span>{sub || `vs. prior ${periodDays}d`}</span>
                </span>
            }
        />
    );
}

function InsightChart({ children }) {
    return <div className="adm-insight-chart">{children}</div>;
}

export default function AnalyticsDashboard() {
    const { confirm } = useAdminFeedback();
    const [range, setRange] = useState("30d");
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const load = useCallback(async (r) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/analytics?range=${r}`, { cache: "no-store" });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || "Could not load analytics data.");
            setData(json);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load(range);
    }, [range, load]);

    const handleReset = async () => {
        if (
            !(await confirm({
                title: "Delete all analytics data?",
                message: "This permanently deletes all recorded events and daily rollups. This action cannot be undone.",
                confirmText: "Delete everything",
                danger: true,
            }))
        )
            return;
        try {
            const res = await fetch("/api/admin/analytics", { method: "DELETE" });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.error || "Could not reset analytics data.");
            load(range);
        } catch (e) {
            setError(e.message);
        }
    };

    const kpis = data?.kpis || {};
    const prev = data?.prevKpis || {};
    const series = data?.series || [];
    const devices = (data?.devices || []).map((d) => ({
        label: d.type,
        value: d.views,
        color: DEVICE_COLORS[d.type] || "var(--text-tertiary)",
    }));
    const geoCountries = data?.countries || [];
    const countries = geoCountries.slice(0, 8).map((c) => ({
        label: `${flagEmoji(c.code)} ${countryName(c.code)}`,
        sub: c.code,
        value: c.views,
    }));
    const countriesReached = geoCountries.length;

    // Derived overview insights
    const busiest = series.reduce((best, d) => (d.views > (best?.views ?? -1) ? d : best), null);
    const activeDays = series.filter((d) => d.views > 0).length || 1;
    const avgPerDay = Math.round((kpis.views || 0) / activeDays);
    const totalTraffic = (kpis.views || 0) + (kpis.botViews || 0);
    const humanShare = totalTraffic ? Math.round(((kpis.views || 0) / totalTraffic) * 100) : 0;
    const topReferrer = (data?.referrers || [])[0];
    const topCountry = (data?.countries || [])[0];
    const referrers = (data?.referrers || []).map((r) => ({
        label: REFERRER_LABELS[r.type] || r.type,
        value: r.views,
        title: r.title,
        description: r.description,
    }));
    const topPages = (data?.topPages || []).map((p) => ({
        label: p.path,
        value: p.views,
        title: p.title,
        image: p.image,
        description: p.description,
    }));
    const topEntities = data?.topEntities || {};
    const periodDays = RANGE_DAYS[range];

    const highlightRows = [
        {
            label: "Busiest day",
            value: busiest && busiest.views > 0 ? busiest.day : "—",
            hint: busiest && busiest.views > 0 ? `${busiest.views.toLocaleString()} views` : "No traffic recorded yet",
        },
        {
            label: "Average views per active day",
            value: avgPerDay.toLocaleString(),
            hint: `${activeDays} active day${activeDays === 1 ? "" : "s"} in range`,
        },
        {
            label: "Human traffic share",
            value: `${humanShare}%`,
            hint: `${(kpis.botViews || 0).toLocaleString()} bot hits filtered`,
        },
        {
            label: "Top referrer & region",
            value: topReferrer ? REFERRER_LABELS[topReferrer.type] || topReferrer.type : "—",
            hint: topCountry
                ? `${flagEmoji(topCountry.code)} ${countryName(topCountry.code)} leads (${topCountry.views.toLocaleString()})`
                : topReferrer
                  ? `${topReferrer.views.toLocaleString()} views`
                  : "No referrer data",
        },
        {
            label: "Outbound click-through rate",
            value: kpis.views ? `${((kpis.outboundClicks / kpis.views) * 100).toFixed(1)}%` : "—",
            hint: `${(kpis.outboundClicks ?? 0).toLocaleString()} outbound clicks`,
        },
        {
            label: "Contact conversion rate",
            value: kpis.views ? `${((kpis.contacts / kpis.views) * 100).toFixed(2)}%` : "—",
            hint: `${(kpis.contacts ?? 0).toLocaleString()} contact submissions`,
        },
        {
            label: "Views per unique visitor",
            value: kpis.uniques ? (kpis.views / kpis.uniques).toFixed(1) : "—",
            hint: `${(kpis.entityViews ?? 0).toLocaleString()} content detail views`,
        },
    ];

    return (
        <div className="adm-page">
            <PageHeader
                command={`analytics --range=${range}`}
                title="Analytics"
                description="First-party traffic, content engagement, referrers, and visitor geography."
                actions={
                    <>
                        <div role="group" aria-label="Time range" className="adm-tabs">
                            {RANGES.map((r) => (
                                <button
                                    key={r.key}
                                    type="button"
                                    aria-pressed={range === r.key}
                                    onClick={() => setRange(r.key)}
                                    className="adm-tab"
                                >
                                    {r.label}
                                </button>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={() => load(range)}
                            disabled={loading}
                            className="adm-btn"
                            aria-label="Refresh analytics"
                        >
                            <FaArrowsRotate aria-hidden="true" className={loading ? "animate-spin" : ""} />
                            Refresh
                        </button>
                    </>
                }
            />

            {error && (
                <div role="alert" className="adm-notice adm-notice-error flex items-center gap-2.5">
                    <FaTriangleExclamation aria-hidden="true" className="shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                <KpiStatCard label="Page views" value={kpis.views} delta={pctDelta(kpis.views, prev.views)} periodDays={periodDays} />
                <KpiStatCard label="Unique visitors" value={kpis.uniques} delta={pctDelta(kpis.uniques, prev.uniques)} periodDays={periodDays} />
                <KpiStatCard label="Content views" value={kpis.entityViews} delta={pctDelta(kpis.entityViews, prev.entityViews)} periodDays={periodDays} />
                <KpiStatCard label="Contacts" value={kpis.contacts} delta={pctDelta(kpis.contacts, prev.contacts)} periodDays={periodDays} />
                <KpiStatCard label="Outbound clicks" value={kpis.outboundClicks} delta={pctDelta(kpis.outboundClicks, prev.outboundClicks)} periodDays={periodDays} />
                <KpiStatCard label="Filtered bots" value={kpis.botViews} delta={false} sub="Excluded from views" periodDays={periodDays} />
            </div>

            {/* 12-column dashboard grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Row 1: Traffic chart + Period highlights */}
                <Panel
                    flush
                    title="Traffic over time"
                    actions={<Badge>Last {periodDays} days</Badge>}
                    className="flex flex-col md:col-span-12 xl:col-span-8"
                >
                    {loading && !data ? (
                        <Loading label="Loading traffic chart" rows={6} />
                    ) : (
                        <LineChart
                            data={series}
                            summary={
                                <p className="flex flex-wrap items-baseline gap-2">
                                    <span className="adm-num text-2xl font-semibold text-[var(--text-bright)]">
                                        {(kpis.views ?? 0).toLocaleString()}
                                    </span>
                                    <span className="adm-help">
                                        views and {(kpis.uniques ?? 0).toLocaleString()} visitors over {periodDays} days
                                    </span>
                                </p>
                            }
                        />
                    )}
                </Panel>

                <Panel
                    flush
                    title="Period highlights & engagement"
                    className="flex flex-col md:col-span-12 xl:col-span-4"
                >
                    <ul className="adm-list flex flex-1 flex-col">
                        {highlightRows.map((item) => (
                            <li key={item.label} className="adm-row flex-1 justify-between">
                                <span className="min-w-0">
                                    <span className="block text-[var(--text-primary)]">{item.label}</span>
                                    <span className="adm-help block">{item.hint}</span>
                                </span>
                                <span className="adm-num shrink-0 text-base font-semibold text-[var(--text-bright)]">
                                    {item.value}
                                </span>
                            </li>
                        ))}
                    </ul>
                </Panel>

                {/* Row 2: Top pages + Referrers */}
                <Panel flush title="Top pages" className="flex flex-col md:col-span-6">
                    <InsightChart>
                        {loading && !data ? (
                            <Loading label="Loading top pages" rows={5} />
                        ) : (
                            <BarList items={topPages} share emptyLabel="No page views recorded yet." />
                        )}
                    </InsightChart>
                </Panel>

                <Panel flush title="Referrers" className="flex flex-col md:col-span-6">
                    <InsightChart>
                        {loading && !data ? (
                            <Loading label="Loading referrers" rows={5} />
                        ) : (
                            <BarList items={referrers} accent="var(--accent-purple)" share emptyLabel="No referrers recorded yet." />
                        )}
                    </InsightChart>
                </Panel>

                {/* Row 3: Visitor world map + Top countries */}
                <Panel
                    title="Visitor geography"
                    actions={
                        <Badge tone={countriesReached > 0 ? "info" : undefined}>
                            {countriesReached} {countriesReached === 1 ? "country" : "countries"} reached
                        </Badge>
                    }
                    className="flex flex-col md:col-span-12 xl:col-span-8"
                >
                    <InsightChart>
                        <WorldMap data={geoCountries} />
                    </InsightChart>
                    {countriesReached === 0 && (
                        <p className="adm-help mt-3">
                            Country is resolved from edge headers (Cloudflare or Vercel) or an IP fallback; local traffic appears as private.
                        </p>
                    )}
                </Panel>

                <Panel
                    flush
                    title="Top countries"
                    actions={topCountry ? <Badge>{flagEmoji(topCountry.code)} {countryName(topCountry.code)}</Badge> : null}
                    className="flex flex-col md:col-span-6 xl:col-span-4"
                >
                    <InsightChart>
                        {loading && !data ? (
                            <Loading label="Loading countries" rows={6} />
                        ) : (
                            <BarList items={countries} accent="var(--status-success)" share emptyLabel="No location data recorded yet." />
                        )}
                    </InsightChart>
                </Panel>

                {/* Row 4: Devices + Top blogs + Top projects */}
                <Panel title="Devices" className="flex flex-col md:col-span-6 xl:col-span-4">
                    <InsightChart>
                        {loading && !data ? (
                            <Loading label="Loading devices" rows={4} />
                        ) : (
                            <DonutSplit segments={devices} />
                        )}
                    </InsightChart>
                </Panel>

                {["blog", "project"].map((type) => {
                    const items = (topEntities[type] || []).map((e) => ({
                        label: e.slug,
                        value: e.views,
                        title: e.title,
                        image: e.image,
                        description: e.description,
                    }));
                    return (
                        <Panel key={type} flush title={ENTITY_META[type].label} className="flex flex-col md:col-span-6 xl:col-span-4">
                            <InsightChart>
                                {loading && !data ? (
                                    <Loading label={`Loading ${ENTITY_META[type].label}`} rows={4} />
                                ) : (
                                    <BarList items={items} emptyLabel="No views recorded yet." />
                                )}
                            </InsightChart>
                        </Panel>
                    );
                })}

                {/* Row 5: Top apps + Top gallery items */}
                {["app", "gallery"].map((type) => {
                    const items = (topEntities[type] || []).map((e) => ({
                        label: e.slug,
                        value: e.views,
                        title: e.title,
                        image: e.image,
                        description: e.description,
                    }));
                    return (
                        <Panel key={type} flush title={ENTITY_META[type].label} className="flex flex-col md:col-span-6">
                            <InsightChart>
                                {loading && !data ? (
                                    <Loading label={`Loading ${ENTITY_META[type].label}`} rows={4} />
                                ) : (
                                    <BarList items={items} emptyLabel="No views recorded yet." />
                                )}
                            </InsightChart>
                        </Panel>
                    );
                })}

                {/* Row 6: Danger zone */}
                <Panel title="Reset analytics" className="adm-danger md:col-span-12">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <p className="text-sm text-[var(--text-secondary)]">
                            Permanently delete all recorded analytics events and daily rollups. This action cannot be undone.
                        </p>
                        <button type="button" onClick={handleReset} className="adm-btn adm-btn-danger">
                            <FaTrash aria-hidden="true" />
                            Delete all analytics
                        </button>
                    </div>
                </Panel>
            </div>
        </div>
    );
}
