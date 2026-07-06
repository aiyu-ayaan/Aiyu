"use client";
import React, { useEffect, useMemo, useState } from "react";
import { FaGear, FaCheck, FaRotateLeft } from "react-icons/fa6";
import { NAV_GROUPS, ACCENT, STAGE_META } from "@/app/components/admin/shell/navConfig";

/** Ordered stage choices for the segmented control. `null` == Stable. */
const STAGE_CHOICES = [
    { value: null, label: "Stable", active: "bg-white/10 text-white" },
    { value: "beta", label: "Beta", active: "bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/40" },
    { value: "alpha", label: "Alpha", active: "bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/40" },
];

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
        <div className="p-5 md:p-8 max-w-4xl mx-auto pb-8">
            {/* Header */}
            <header className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                        <FaGear />
                    </span>
                    <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Settings</h1>
                </div>
                <p className="text-slate-400">
                    Pin a maturity stage to any section. A <span className="text-sky-300 font-medium">Beta</span> or{" "}
                    <span className="text-amber-300 font-medium">Alpha</span> badge then appears next to it in the sidebar.
                </p>
                {status === "ready" && (
                    <div className="mt-4 flex flex-wrap gap-2 text-xs font-mono">
                        <span className="px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-300">{counts.beta} beta</span>
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300">{counts.alpha} alpha</span>
                    </div>
                )}
            </header>

            {status === "loading" && (
                <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 rounded-xl bg-slate-900/40 border border-white/5 animate-pulse" />)}</div>
            )}

            {status === "error" && (
                <div className="p-6 rounded-2xl border border-red-500/20 bg-red-500/5 text-red-300 text-sm">
                    Could not load or save settings. Please try again.
                </div>
            )}

            {status === "ready" && (
                <div className="space-y-8">
                    {NAV_GROUPS.filter((g) => g.id !== "overview").map((group) => (
                        <section key={group.id}>
                            <h2 className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-3">{group.label}</h2>
                            <div className="rounded-2xl bg-slate-900/50 border border-white/5 divide-y divide-white/5 overflow-hidden">
                                {group.items.map((item) => {
                                    const accent = ACCENT[item.accent] || ACCENT.slate;
                                    const Icon = item.icon;
                                    const current = stages[item.path] || null;
                                    const stageMeta = STAGE_META[current];
                                    return (
                                        <div key={item.path} className="flex items-center gap-3 px-4 py-3">
                                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${accent.bgSoft} ${accent.text}`}>
                                                <Icon className="text-[14px]" />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="flex items-center gap-2">
                                                    <span className="text-sm font-semibold text-white truncate">{item.label}</span>
                                                    {stageMeta && (
                                                        <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${stageMeta.badge}`}>{stageMeta.label}</span>
                                                    )}
                                                </span>
                                                <span className="block text-xs text-slate-500 truncate">{item.description}</span>
                                            </span>
                                            {/* Segmented control */}
                                            <div className="flex shrink-0 rounded-lg bg-black/30 p-0.5">
                                                {STAGE_CHOICES.map((c) => {
                                                    const isOn = current === c.value;
                                                    return (
                                                        <button
                                                            key={c.label}
                                                            onClick={() => setStage(item.path, c.value)}
                                                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${isOn ? c.active : "text-slate-400 hover:text-white"}`}
                                                        >
                                                            {c.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    ))}
                </div>
            )}

            {/* Sticky save bar — lives in the layout flow (sticky, not fixed), so
                it floats while scrolling but settles below the last row at the
                bottom and never hides content. */}
            {status === "ready" && dirty && (
                <div className="sticky bottom-4 z-20 mt-6">
                    <div className="flex items-center gap-3 px-5 py-3 rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-xl shadow-2xl">
                        <span className="text-sm text-slate-300">You have unsaved changes.</span>
                        <div className="ml-auto flex items-center gap-2">
                            <button
                                onClick={() => { setStages(initial); setSavedAt(0); }}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                <FaRotateLeft className="text-[11px]" /> Reset
                            </button>
                            <button
                                onClick={save}
                                disabled={saving}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 ring-1 ring-cyan-400/30 transition-colors disabled:opacity-50"
                            >
                                {saving ? "Saving…" : "Save changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Saved confirmation */}
            {savedAt > 0 && !dirty && (
                <div className="fixed bottom-6 right-6 z-30 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30 text-sm shadow-lg">
                    <FaCheck className="text-[12px]" /> Settings saved
                </div>
            )}
        </div>
    );
}
