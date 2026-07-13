"use client";
/**
 * Tabbed side panel for Resume Studio: insert portfolio items (projects,
 * hosted apps, experience, education, skills) as LaTeX blocks, switch starter
 * templates and color themes, and manage snapshots.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
    FaBriefcase, FaPalette, FaCodeBranch, FaPlus, FaSpinner,
    FaServer, FaUserTie, FaGraduationCap, FaListCheck,
    FaWandMagicSparkles, FaLightbulb, FaCheck, FaArrowRotateLeft,
    FaPen, FaTrash,
} from 'react-icons/fa6';
import StudioAiPanel from './StudioAiPanel';
import StudioIdeasPanel from './StudioIdeasPanel';
import {
    RESUME_TEMPLATES, THEME_PRESETS, detectThemePreset,
    projectToLatex, deploymentToLatex, experienceToLatex,
    educationToLatex, skillsToLatex,
} from '@/lib/resumeStudio';

const TABS = [
    { id: 'portfolio', label: 'Items', icon: FaBriefcase },
    { id: 'design', label: 'Design', icon: FaPalette },
    { id: 'ai', label: 'AI', icon: FaWandMagicSparkles },
    { id: 'ideas', label: 'Ideas', icon: FaLightbulb },
    { id: 'versions', label: 'Versions', icon: FaCodeBranch },
];

function SectionLabel({ icon: Icon, children }) {
    return (
        <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-3 mb-1">
            <Icon className="text-slate-600" /> {children}
        </h4>
    );
}

function InsertRow({ title, subtitle, onInsert }) {
    return (
        <div className="group flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.03] hover:border-cyan-500/30 p-2">
            <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-200 font-semibold truncate" title={title}>{title}</p>
                {subtitle && <p className="text-[10px] text-slate-500 truncate">{subtitle}</p>}
            </div>
            <button
                onClick={onInsert}
                title="Insert at cursor"
                className="shrink-0 rounded-md border border-cyan-500/30 bg-cyan-500/10 p-1.5 text-cyan-300 opacity-70 group-hover:opacity-100 hover:border-cyan-400 transition-all"
            >
                <FaPlus className="text-[10px]" />
            </button>
        </div>
    );
}

export default function StudioSidePanel({
    mode = 'code',     // 'code' | 'visual'
    onInsert,          // (latexBlock: string) => void
    onApplyTemplate,   // (template) => void
    onApplyTheme,      // (presetId) => void
    currentLatex,      // () => string (for theme detection)
    versions,          // [{ id, label, latex, createdAt, updatedAt }]
    activeVersionId,   // id of the version currently switched to
    onSaveVersion,     // () => void
    onSwitchVersion,   // (version) => void
    onUpdateVersion,   // (version) => void
    onRenameVersion,   // (version) => void
    onDeleteVersion,   // (version) => void
    editorApi,         // { getValue, getSelection, replaceSelection, insertAtCursor }
    compileErrors,
    compileLog,
    ideas,
    onSaveIdeas,
    toast,
}) {
    const [tab, setTab] = useState('portfolio');
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState([]);
    const [deployments, setDeployments] = useState([]);
    const [about, setAbout] = useState(null);
    const [activeTheme, setActiveTheme] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [projectsRes, deploymentsRes, aboutRes] = await Promise.all([
                    fetch('/api/projects').then((r) => r.json()).catch(() => []),
                    fetch('/api/deployments').then((r) => r.json()).catch(() => []),
                    fetch('/api/about').then((r) => r.json()).catch(() => null),
                ]);
                if (cancelled) return;
                setProjects(Array.isArray(projectsRes) ? projectsRes : projectsRes?.data || []);
                setDeployments(Array.isArray(deploymentsRes) ? deploymentsRes : deploymentsRes?.data || []);
                setAbout(aboutRes && !aboutRes.error ? aboutRes : null);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // Re-detect the active theme when switching to the design tab.
    useEffect(() => {
        if (tab === 'design') setActiveTheme(detectThemePreset(currentLatex?.() || ''));
    }, [tab, currentLatex]);

    const skillNames = useMemo(
        () => (about?.skills || []).map((s) => s.name).filter(Boolean),
        [about]
    );

    return (
        <div className="w-72 shrink-0 hidden lg:flex flex-col rounded-xl border border-white/10 bg-slate-900/60 overflow-hidden">
            {/* Tab bar */}
            <div className="flex border-b border-white/10">
                {TABS.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setTab(id)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                            tab === id
                                ? 'text-cyan-300 bg-cyan-500/10 border-b-2 border-cyan-400'
                                : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        <Icon /> {label}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-auto p-3 space-y-1.5">
                {/* ── Portfolio ── */}
                {tab === 'portfolio' && (loading ? (
                    <div className="flex justify-center py-8 text-slate-500"><FaSpinner className="animate-spin" /></div>
                ) : (
                    <>
                        <p className="text-[10px] text-slate-600">Click + to insert an item as LaTeX at the cursor.</p>

                        <SectionLabel icon={FaBriefcase}>Projects ({projects.length})</SectionLabel>
                        {projects.map((p) => (
                            <InsertRow
                                key={p._id}
                                title={p.name}
                                subtitle={`${p.year || ''} · ${(p.techStack || []).slice(0, 3).join(', ')}`}
                                onInsert={() => onInsert(`\n${projectToLatex(p)}\n`)}
                            />
                        ))}

                        <SectionLabel icon={FaServer}>Hosted Apps ({deployments.length})</SectionLabel>
                        {deployments.map((d) => (
                            <InsertRow
                                key={d._id}
                                title={d.name}
                                subtitle={`${d.appType || ''} · ${d.status || ''}`}
                                onInsert={() => onInsert(`\n${deploymentToLatex(d)}\n`)}
                            />
                        ))}

                        <SectionLabel icon={FaUserTie}>Experience ({about?.experiences?.length || 0})</SectionLabel>
                        {(about?.experiences || []).map((exp) => (
                            <InsertRow
                                key={exp._id}
                                title={`${exp.role} · ${exp.company}`}
                                subtitle={exp.duration}
                                onInsert={() => onInsert(`\n${experienceToLatex(exp)}\n`)}
                            />
                        ))}

                        <SectionLabel icon={FaGraduationCap}>Education ({about?.education?.length || 0})</SectionLabel>
                        {(about?.education || []).map((edu) => (
                            <InsertRow
                                key={edu._id}
                                title={edu.degree}
                                subtitle={edu.institution}
                                onInsert={() => onInsert(`\n${educationToLatex(edu)}\n`)}
                            />
                        ))}

                        {skillNames.length > 0 && (
                            <>
                                <SectionLabel icon={FaListCheck}>Skills</SectionLabel>
                                <InsertRow
                                    title={`All skills (${skillNames.length})`}
                                    subtitle={skillNames.slice(0, 5).join(', ') + '…'}
                                    onInsert={() => onInsert(`\n${skillsToLatex({ Skills: skillNames })}\n`)}
                                />
                            </>
                        )}
                    </>
                ))}

                {/* ── Design ── */}
                {tab === 'design' && (
                    <>
                        <SectionLabel icon={FaPalette}>Color Themes</SectionLabel>
                        <p className="text-[10px] text-slate-600 mb-1">Swaps only the marked theme block — your content is untouched.</p>
                        {THEME_PRESETS.map((preset) => (
                            <button
                                key={preset.id}
                                onClick={() => { onApplyTheme(preset.id); setActiveTheme(preset.id); }}
                                className={`w-full flex items-center gap-3 rounded-lg border p-2 text-left transition-all ${
                                    activeTheme === preset.id
                                        ? 'border-cyan-400/60 bg-cyan-500/10'
                                        : 'border-white/5 bg-white/[0.03] hover:border-white/20'
                                }`}
                            >
                                <span className="flex shrink-0 -space-x-1">
                                    {preset.swatch.map((c) => (
                                        <span key={c} className="w-4 h-4 rounded-full border border-black/40" style={{ backgroundColor: c }} />
                                    ))}
                                </span>
                                <span className="min-w-0">
                                    <span className="block text-xs text-slate-200 font-semibold">{preset.name}</span>
                                    <span className="block text-[10px] text-slate-500 truncate">{preset.description}</span>
                                </span>
                            </button>
                        ))}

                        <SectionLabel icon={FaBriefcase}>Starter Templates</SectionLabel>
                        <p className="text-[10px] text-amber-500/80 mb-1">⚠ Replaces the whole document.</p>
                        {RESUME_TEMPLATES.map((tpl) => (
                            <button
                                key={tpl.id}
                                onClick={() => onApplyTemplate(tpl)}
                                className="w-full rounded-lg border border-white/5 bg-white/[0.03] hover:border-amber-500/40 p-2 text-left"
                            >
                                <span className="block text-xs text-slate-200 font-semibold">{tpl.name}</span>
                                <span className="block text-[10px] text-slate-500">{tpl.description}</span>
                            </button>
                        ))}
                    </>
                )}

                {/* ── AI ── */}
                {tab === 'ai' && (
                    <StudioAiPanel
                        mode={mode}
                        editorApi={editorApi}
                        compileErrors={compileErrors}
                        compileLog={compileLog}
                        toast={toast}
                    />
                )}

                {/* ── Ideas ── */}
                {tab === 'ideas' && (
                    <StudioIdeasPanel
                        ideas={ideas || []}
                        onSaveIdeas={onSaveIdeas}
                        editorApi={editorApi}
                        toast={toast}
                    />
                )}

                {/* ── Versions ── */}
                {tab === 'versions' && (
                    <>
                        <button
                            onClick={onSaveVersion}
                            className="w-full flex items-center justify-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 py-2 text-[10px] font-bold uppercase tracking-wider text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/50 transition-all"
                        >
                            <FaPlus className="text-[9px]" /> Save current as version
                        </button>

                        {(versions || []).length === 0 ? (
                            <p className="text-[11px] text-slate-600 mt-2">
                                No versions yet. Save one, then switch between as many as you like — each keeps its own copy of the document.
                            </p>
                        ) : (
                            <div className="space-y-1.5 mt-1">
                                {(versions || []).map((v) => {
                                    const active = v.id === activeVersionId;
                                    return (
                                        <div
                                            key={v.id}
                                            className={`rounded-lg border p-2 transition-all ${
                                                active
                                                    ? 'border-cyan-400/60 bg-cyan-500/10'
                                                    : 'border-white/5 bg-white/[0.03] hover:border-white/20'
                                            }`}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                {active && (
                                                    <span className="shrink-0 flex items-center gap-1 rounded bg-cyan-500/20 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-cyan-300">
                                                        <FaCheck className="text-[7px]" /> current
                                                    </span>
                                                )}
                                                <p className="min-w-0 flex-1 text-xs text-slate-200 font-semibold truncate" title={v.label}>{v.label}</p>
                                            </div>
                                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                                {new Date(v.updatedAt || v.createdAt).toLocaleString()}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                                                {active ? (
                                                    <button onClick={() => onUpdateVersion(v)} className="flex items-center gap-1 text-[10px] uppercase font-bold text-emerald-400 hover:text-emerald-300" title="Save current document into this version">
                                                        <FaCheck className="text-[8px]" /> Update
                                                    </button>
                                                ) : (
                                                    <button onClick={() => onSwitchVersion(v)} className="flex items-center gap-1 text-[10px] uppercase font-bold text-cyan-400 hover:text-cyan-300" title="Load this version into the editor">
                                                        <FaArrowRotateLeft className="text-[8px]" /> Switch
                                                    </button>
                                                )}
                                                <button onClick={() => onRenameVersion(v)} className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400 hover:text-slate-200" title="Rename version">
                                                    <FaPen className="text-[8px]" /> Rename
                                                </button>
                                                <button onClick={() => onDeleteVersion(v)} className="flex items-center gap-1 text-[10px] uppercase font-bold text-red-400 hover:text-red-300" title="Delete version">
                                                    <FaTrash className="text-[8px]" /> Delete
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
