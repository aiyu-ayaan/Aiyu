"use client";
import React, { useEffect, useMemo, useState } from "react";
import { FaCheck, FaRotateLeft } from "react-icons/fa6";
import { NAV_GROUPS } from "@/app/components/admin/shell/navConfig";
import { Badge, Loading, PageHeader, Panel } from "@/app/components/admin/ui";
import "@/app/styles/admin-system.css";

/** Ordered stage choices for the segmented control. `null` == Stable. */
const STAGE_CHOICES = [
    { value: null, label: "Stable" },
    { value: "beta", label: "Beta", tone: "info" },
    { value: "alpha", label: "Alpha", tone: "warn" },
];

const GROUPS = NAV_GROUPS.filter((g) => g.id !== "overview");

const norm = (m) => JSON.stringify(Object.entries(m || {}).sort());

export default function AdminSettingsPage() {
    const [stages, setStages] = useState({});
    const [initial, setInitial] = useState({});
    const [status, setStatus] = useState("loading"); // loading | ready | error
    const [saving, setSaving] = useState(false);
    const [savedAt, setSavedAt] = useState(0);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const res = await fetch("/api/config", { cache: "no-store" });
                const json = await res.json();
                if (!alive) return;
                const map = json?.adminSectionStages || {};
                setStages(map);
                setInitial(map);
                setStatus("ready");
            } catch {
                if (alive) setStatus("error");
            }
        })();
        return () => { alive = false; };
    }, []);

    const dirty = useMemo(() => norm(stages) !== norm(initial), [stages, initial]);
    const counts = useMemo(() => {
        const c = { beta: 0, alpha: 0 };
        for (const v of Object.values(stages)) if (c[v] != null) c[v]++;
        return c;
    }, [stages]);

    const setStage = (path, value) => {
        setStages((prev) => {
            const next = { ...prev };
            if (value == null) delete next[path];
            else next[path] = value;
            return next;
        });
        setSavedAt(0);
    };

    const save = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/config", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ adminSectionStages: stages }),
            });
            if (!res.ok) throw new Error("save failed");
            setInitial(stages);
            setSavedAt(Date.now());
            // Broadcast so the sidebar badges update without a reload.
            window.dispatchEvent(new CustomEvent("admin:stages-changed", { detail: stages }));
        } catch {
            setStatus("error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="adm-page">
            <PageHeader
                command="chmod"
                title="Settings"
                description="Mark a section as Beta or Alpha. The badge then appears next to it in the sidebar."
            />

            {status === "loading" && <section className="adm-panel"><Loading label="Loading settings" rows={6} /></section>}

            {status === "error" && (
                <div role="alert" className="adm-notice adm-notice-error">Could not load or save settings. Reload the page and try again.</div>
            )}

            {status === "ready" && (
                <div className="adm-split">
                    <div className="grid items-start gap-6 2xl:grid-cols-2">
                        {GROUPS.map((group) => (
                            <Panel key={group.id} id={`stage-${group.id}`} title={group.label} className="scroll-mt-20" flush>
                                <ul className="adm-list">
                                    {group.items.map((item) => {
                                        const Icon = item.icon;
                                        const current = stages[item.path] || null;
                                        const stage = STAGE_CHOICES.find((c) => c.value === current);
                                        return (
                                            <li key={item.path} className="adm-row flex-wrap">
                                                <Icon aria-hidden="true" className="adm-nav-icon shrink-0" />
                                                <div className="min-w-0 flex-1 basis-48">
                                                    <p className="flex flex-wrap items-center gap-2">
                                                        <span className="font-semibold text-[var(--text-bright)]">{item.label}</span>
                                                        {current && <Badge tone={stage?.tone}>{stage?.label}</Badge>}
                                                    </p>
                                                    <p className="adm-help">{item.description}</p>
                                                </div>
                                                <div role="group" aria-label={`Stage for ${item.label}`} className="flex shrink-0 gap-1">
                                                    {STAGE_CHOICES.map((c) => (
                                                        <button
                                                            key={c.label}
                                                            type="button"
                                                            aria-pressed={current === c.value}
                                                            onClick={() => setStage(item.path, c.value)}
                                                            className="adm-tab"
                                                        >
                                                            {c.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </Panel>
                        ))}
                    </div>

                    <aside className="adm-stack adm-side order-first xl:order-none">
                        <Panel title="Changes">
                            <p role="status" className="adm-help mb-4">
                                {dirty ? "You have unsaved changes." : savedAt > 0 ? "Settings saved." : "No unsaved changes."}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <button type="button" onClick={save} disabled={saving || !dirty} className="adm-btn adm-btn-primary flex-1">
                                    <FaCheck aria-hidden="true" /> {saving ? "Saving" : "Save changes"}
                                </button>
                                <button type="button" onClick={() => { setStages(initial); setSavedAt(0); }} disabled={!dirty} className="adm-btn">
                                    <FaRotateLeft aria-hidden="true" /> Reset
                                </button>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <Badge tone="info">{counts.beta} beta</Badge>
                                <Badge tone="warn">{counts.alpha} alpha</Badge>
                            </div>
                        </Panel>
                        <Panel title="Sections" className="hidden xl:block" flush>
                            <nav aria-label="Section groups">
                                <ul className="adm-list">
                                    {GROUPS.map((group) => (
                                        <li key={group.id}>
                                            <a href={`#stage-${group.id}`} className="adm-row justify-between">
                                                <span>{group.label}</span>
                                                <span className="adm-num adm-help">{group.items.length}</span>
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </nav>
                        </Panel>
                    </aside>
                </div>
            )}
        </div>
    );
}