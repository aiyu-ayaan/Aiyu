"use client";
/**
 * Tabbed side panel for Resume Studio: insert portfolio items (projects,
 * hosted apps, experience, education, skills) as LaTeX blocks, switch starter
 * templates and color themes, and manage snapshots.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
    FaArrowRotateLeft,
    FaBriefcase,
    FaCheck,
    FaCodeBranch,
    FaGraduationCap,
    FaLightbulb,
    FaListCheck,
    FaPalette,
    FaPen,
    FaPlus,
    FaServer,
    FaTrash,
    FaUserTie,
    FaWandMagicSparkles,
} from 'react-icons/fa6';
import StudioAiPanel from './StudioAiPanel';
import StudioIdeasPanel from './StudioIdeasPanel';
import {
    RESUME_TEMPLATES, THEME_PRESETS, detectThemePreset,
    projectToLatex, deploymentToLatex, experienceToLatex,
    educationToLatex, skillsToLatex,
} from '@/lib/resumeStudio';
import { Badge, Loading } from '@/app/components/admin/ui';

const TABS = [
    { id: 'portfolio', label: 'Items', icon: FaBriefcase },
    { id: 'design', label: 'Design', icon: FaPalette },
    { id: 'ai', label: 'AI', icon: FaWandMagicSparkles },
    { id: 'ideas', label: 'Ideas', icon: FaLightbulb },
    { id: 'versions', label: 'Versions', icon: FaCodeBranch },
];

function SectionLabel({ icon: Icon, children }) {
    return (
        <h3 className="mt-3 mb-1.5 flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
            <Icon className="text-[var(--adm-hint)]" aria-hidden="true" />
            <span>{children}</span>
        </h3>
    );
}

function InsertRow({ title, subtitle, onInsert }) {
    return (
        <div className="adm-sc-item flex items-center gap-2 p-2.5">
            <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-[var(--text-bright)]" title={title}>{title}</p>
                {subtitle && <p className="adm-help truncate">{subtitle}</p>}
            </div>
            <button
                type="button"
                onClick={onInsert}
                title={`Insert ${title}`}
                aria-label={`Insert ${title}`}
                className="adm-icon-btn"
            >
                <FaPlus aria-hidden="true" />
            </button>
        </div>
    );
}

export default function StudioSidePanel({
    mode = 'code',
    onInsert,
    onApplyTemplate,
    onApplyTheme,
    currentLatex,
    versions,
    activeVersionId,
    onSaveVersion,
    onSwitchVersion,
    onUpdateVersion,
    onRenameVersion,
    onDeleteVersion,
    editorApi,
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

    useEffect(() => {
        if (tab === 'design') setActiveTheme(detectThemePreset(currentLatex?.() || ''));
    }, [tab, currentLatex]);

    const skillNames = useMemo(
        () => (about?.skills || []).map((s) => s.name).filter(Boolean),
        [about]
    );

    return (
        <section className="adm-sc-studio-pane" aria-label="Studio tools">
            <div className="adm-tabs" role="tablist" aria-label="Studio tools">
                {TABS.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={tab === id}
                        onClick={() => setTab(id)}
                        className="adm-tab !px-2.5 text-xs"
                    >
                        <Icon aria-hidden="true" /> {label}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {/* ── Portfolio ── */}
                {tab === 'portfolio' && (loading ? (
                    <Loading label="Loading portfolio items" rows={4} />
                ) : (
                    <>
                        <p className="adm-help">Click + to insert an item as a LaTeX block.</p>

                        <SectionLabel icon={FaBriefcase}>Projects ({projects.length})</SectionLabel>
                        {projects.map((p) => (
                            <InsertRow
                                key={p._id}
                                title={p.name}
                                subtitle={`${p.year || ''} · ${(p.techStack || []).slice(0, 3).join(', ')}`}
                                onInsert={() => onInsert(`\n${projectToLatex(p)}\n`)}
                            />
                        ))}

                        <SectionLabel icon={FaServer}>Hosted apps ({deployments.length})</SectionLabel>
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
                        <SectionLabel icon={FaPalette}>Colour themes</SectionLabel>
                        <p className="adm-help">Swaps only the marked theme block — your content stays untouched.</p>
                        <div className="space-y-2">
                            {THEME_PRESETS.map((preset) => (
                                <button
                                    key={preset.id}
                                    type="button"
                                    aria-pressed={activeTheme === preset.id}
                                    onClick={() => { onApplyTheme(preset.id); setActiveTheme(preset.id); }}
                                    className="adm-sc-choice w-full items-center"
                                >
                                    <span className="flex shrink-0 -space-x-1" aria-hidden="true">
                                        {preset.swatch.map((c) => (
                                            <span
                                                key={c}
                                                className="h-4 w-4 rounded-full border border-[var(--hairline-strong)]"
                                                style={{ backgroundColor: c }}
                                            />
                                        ))}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-xs font-semibold text-[var(--text-bright)]">{preset.name}</span>
                                        <span className="adm-help block truncate">{preset.description}</span>
                                    </span>
                                </button>
                            ))}
                        </div>

                        <SectionLabel icon={FaBriefcase}>Starter templates</SectionLabel>
                        <p className="adm-help">Replaces the entire document.</p>
                        <div className="space-y-2">
                            {RESUME_TEMPLATES.map((tpl) => (
                                <button
                                    key={tpl.id}
                                    type="button"
                                    onClick={() => onApplyTemplate(tpl)}
                                    className="adm-sc-choice w-full flex-col"
                                >
                                    <span className="block text-xs font-semibold text-[var(--text-bright)]">{tpl.name}</span>
                                    <span className="adm-help block">{tpl.description}</span>
                                </button>
                            ))}
                        </div>
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
                    <div className="space-y-3">
                        <button
                            type="button"
                            onClick={onSaveVersion}
                            className="adm-btn adm-btn-primary w-full"
                        >
                            <FaPlus aria-hidden="true" /> Save current as version
                        </button>

                        {(versions || []).length === 0 ? (
                            <p className="adm-help">
                                No versions saved yet. Save one to snapshot your resume and switch back anytime.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {(versions || []).map((v) => {
                                    const active = v.id === activeVersionId;
                                    return (
                                        <div
                                            key={v.id}
                                            className="adm-sc-item p-3 space-y-2"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="min-w-0 flex-1 truncate text-xs font-semibold text-[var(--text-bright)]" title={v.label}>
                                                    {v.label}
                                                </p>
                                                {active && <Badge tone="ok">Current</Badge>}
                                            </div>
                                            <p className="adm-num adm-help">
                                                {new Date(v.updatedAt || v.createdAt).toLocaleString()}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {active ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => onUpdateVersion(v)}
                                                        className="adm-btn !px-2.5 text-xs"
                                                        title="Overwrite this version with current document"
                                                    >
                                                        <FaCheck aria-hidden="true" /> Update
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => onSwitchVersion(v)}
                                                        className="adm-btn !px-2.5 text-xs"
                                                        title="Load this version into the editor"
                                                    >
                                                        <FaArrowRotateLeft aria-hidden="true" /> Switch
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => onRenameVersion(v)}
                                                    className="adm-icon-btn"
                                                    title="Rename version"
                                                    aria-label={`Rename ${v.label}`}
                                                >
                                                    <FaPen aria-hidden="true" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => onDeleteVersion(v)}
                                                    className="adm-icon-btn"
                                                    title="Delete version"
                                                    aria-label={`Delete ${v.label}`}
                                                >
                                                    <FaTrash aria-hidden="true" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}
