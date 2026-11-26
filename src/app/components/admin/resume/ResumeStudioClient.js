"use client";
/**
 * Resume Studio — full-screen LaTeX IDE for /admin/resume.
 * Left: studio tools (items, design, AI, ideas, versions).
 * Middle: Visual / Code editor. Right: compiled PDF preview + error log.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    FaCircleExclamation,
    FaCode,
    FaCodeBranch,
    FaDownload,
    FaFloppyDisk,
    FaGear,
    FaPlay,
    FaShapes,
    FaSpinner,
    FaUpload,
    FaXmark,
} from 'react-icons/fa6';
import { useAdminFeedback } from '@/app/components/admin/feedback/AdminFeedbackProvider';
import { RESUME_ENGINES, MAX_SNAPSHOTS, applyThemePreset } from '@/lib/resumeStudio';
import { parseResumeLatex, generateResumeLatex } from '@/lib/resumeVisual';
import { Badge, Field, Loading, PageHeader, Panel } from '@/app/components/admin/ui';
import LatexEditor from './LatexEditor';
import StudioSidePanel from './StudioSidePanel';
import VisualEditor from './VisualEditor';
import '@/app/styles/admin-showcase.css';

function timeLabel(iso) {
    if (!iso) return 'never';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ResumeStudioClient() {
    const { toast, confirm, prompt } = useAdminFeedback();
    const editorRef = useRef(null);

    const [studio, setStudio] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [compiling, setCompiling] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [pdfUrl, setPdfUrl] = useState(null);
    const [compileErrors, setCompileErrors] = useState([]);
    const [compileLog, setCompileLog] = useState('');
    const [showLog, setShowLog] = useState(false);
    const [engine, setEngine] = useState('pdflatex');
    const [mode, setMode] = useState('code'); // 'code' | 'visual'
    const [model, setModel] = useState(null);
    const [autoSave, setAutoSave] = useState(false);
    const [autoCompile, setAutoCompile] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const pdfUrlRef = useRef(null);
    const didInitialCompile = useRef(false);

    const getLatex = useCallback(() => {
        if (mode === 'visual' && model) {
            return generateResumeLatex(model);
        }
        return editorRef.current?.getValue() ?? '';
    }, [mode, model]);

    // ── Load ────────────────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch('/api/admin/resume');
                const json = await res.json();
                if (!cancelled && json.success) {
                    setStudio(json.data);
                    setEngine(json.data.engine || 'pdflatex');
                    try {
                        setModel(parseResumeLatex(json.data.latex || ''));
                        setMode('visual');
                    } catch {
                        /* stay in code mode */
                    }
                }
            } catch {
                if (!cancelled) toast.error('Failed to load resume studio');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [toast]);

    useEffect(() => () => {
        if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
    }, []);

    useEffect(() => {
        try {
            setAutoSave(localStorage.getItem('resumeStudio.autoSave') === '1');
            setAutoCompile(localStorage.getItem('resumeStudio.autoCompile') === '1');
        } catch { /* localStorage unavailable */ }
    }, []);
    useEffect(() => {
        try { localStorage.setItem('resumeStudio.autoSave', autoSave ? '1' : '0'); } catch { /* ignore */ }
    }, [autoSave]);
    useEffect(() => {
        try { localStorage.setItem('resumeStudio.autoCompile', autoCompile ? '1' : '0'); } catch { /* ignore */ }
    }, [autoCompile]);

    // ── Actions ─────────────────────────────────────────────────────────
    const save = useCallback(async (extraPatch = {}, latexOverride = null) => {
        const latex = latexOverride ?? getLatex();
        if (!latex) return null;
        setSaving(true);
        try {
            const res = await fetch('/api/admin/resume', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ latex, engine, ...extraPatch }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            setStudio(json.data);
            setDirty(false);
            return json.data;
        } catch (e) {
            toast.error(e.message || 'Save failed');
            return null;
        } finally {
            setSaving(false);
        }
    }, [engine, toast, getLatex]);

    const compile = useCallback(async () => {
        const latex = getLatex();
        if (!latex) return null;
        setCompiling(true);
        setCompileErrors([]);
        try {
            const res = await fetch('/api/admin/resume/compile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ latex, engine }),
            });
            const json = await res.json();
            if (json.success) {
                const bytes = Uint8Array.from(atob(json.data.pdfBase64), (c) => c.charCodeAt(0));
                const blob = new Blob([bytes], { type: 'application/pdf' });
                if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
                const url = URL.createObjectURL(blob);
                pdfUrlRef.current = url;
                setPdfUrl(url);
                setCompileLog('');
                setShowLog(false);
                setStudio((s) => (s ? { ...s, lastCompiledAt: json.data.compiledAt } : s));
                toast.success('Compiled successfully');
                return json.data.pdfBase64;
            }
            if (json.data?.log) {
                setCompileErrors(json.data.errors || []);
                setCompileLog(json.data.log);
                setShowLog(true);
                toast.error(`Compilation failed (${json.data.errors?.length || 0} errors)`);
            } else {
                toast.error(json.error || 'Compile failed');
            }
            return null;
        } catch {
            toast.error('Compile request failed');
            return null;
        } finally {
            setCompiling(false);
        }
    }, [engine, toast, getLatex]);

    useEffect(() => {
        if (loading || !studio || didInitialCompile.current) return;
        didInitialCompile.current = true;
        compile();
    }, [loading, studio, compile]);

    const saveAndCompile = useCallback(async () => {
        await save();
        await compile();
    }, [save, compile]);

    const publish = useCallback(async () => {
        let skip = false;
        try { skip = localStorage.getItem('resumeStudio.skipPublishDialog') === '1'; } catch { /* ignore */ }

        if (!skip) {
            const res = await confirm({
                title: 'Publish resume',
                message: 'Publishing runs the full pipeline for you:\n\n'
                    + '1.  Save — store the current document\n'
                    + '2.  Compile — build a fresh PDF\n'
                    + '3.  Publish — replace the PDF served at /api/resume on your live site',
                confirmText: 'Save, compile & publish',
                checkbox: { label: "Don't show this again" },
            });
            if (!res?.confirmed) return;
            if (res.checked) {
                try { localStorage.setItem('resumeStudio.skipPublishDialog', '1'); } catch { /* ignore */ }
            }
        }

        setPublishing(true);
        try {
            const saved = await save();
            if (!saved) return;
            const base64 = await compile();
            if (!base64) {
                toast.error('Compile failed — nothing was published.');
                return;
            }
            const res = await fetch('/api/admin/resume/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pdfBase64: base64, filename: 'resume.pdf' }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            setStudio((s) => (s ? { ...s, lastPublishedAt: json.data.publishedAt } : s));
            toast.success('Published to the live site');
        } catch (e) {
            toast.error(e.message || 'Publish failed');
        } finally {
            setPublishing(false);
        }
    }, [confirm, save, compile, toast]);

    const download = useCallback(() => {
        if (!pdfUrl) {
            toast.error('Compile a PDF first.');
            return;
        }
        const a = document.createElement('a');
        a.href = pdfUrl;
        a.download = 'resume.pdf';
        a.click();
    }, [pdfUrl, toast]);

    const saveVersion = useCallback(async () => {
        const label = await prompt({
            title: 'Save version',
            message: 'Name this version so you can switch back to it later.',
            defaultValue: `Version ${(studio?.snapshots?.length || 0) + 1}`,
        });
        if (!label) return;
        const latex = getLatex();
        const now = new Date().toISOString();
        const version = {
            id: `ver-${Date.now()}`,
            label,
            latex,
            createdAt: now,
            updatedAt: now,
        };
        const snapshots = [version, ...(studio?.snapshots || [])].slice(0, MAX_SNAPSHOTS);
        const saved = await save({ snapshots, activeVersionId: version.id }, latex);
        if (saved) toast.success(`Saved version "${label}"`);
    }, [prompt, save, studio, toast, getLatex]);

    const loadLatexIntoActiveEditor = useCallback((latex) => {
        editorRef.current?.setValue(latex);
        if (mode === 'visual') {
            try {
                setModel(parseResumeLatex(latex));
            } catch (e) {
                setModel(null);
                setMode('code');
                toast.error(`Opened in code mode: ${e.message}`);
            }
        }
        setDirty(true);
    }, [mode, toast]);

    const switchVersion = useCallback(async (version) => {
        if (version.id === studio?.activeVersionId && !dirty) return;
        if (dirty && !(await confirm({
            title: `Switch to "${version.label}"?`,
            message: 'You have unsaved changes that will be discarded. Save them as a version first if you want to keep them.',
            confirmText: 'Switch anyway',
            danger: true,
        }))) return;
        loadLatexIntoActiveEditor(version.latex);
        await save({ activeVersionId: version.id }, version.latex);
        toast.success(`Switched to "${version.label}"`);
    }, [confirm, save, studio, dirty, toast, loadLatexIntoActiveEditor]);

    const updateVersion = useCallback(async (version) => {
        const latex = getLatex();
        const snapshots = (studio?.snapshots || []).map((s) => (
            s.id === version.id ? { ...s, latex, updatedAt: new Date().toISOString() } : s
        ));
        const saved = await save({ snapshots, activeVersionId: version.id }, latex);
        if (saved) toast.success(`Updated "${version.label}"`);
    }, [save, studio, toast, getLatex]);

    const renameVersion = useCallback(async (version) => {
        const label = await prompt({ title: 'Rename version', defaultValue: version.label });
        if (!label || label === version.label) return;
        const snapshots = (studio?.snapshots || []).map((s) => (s.id === version.id ? { ...s, label } : s));
        await save({ snapshots });
    }, [prompt, save, studio]);

    const deleteVersion = useCallback(async (version) => {
        if (!(await confirm({
            title: 'Delete version?',
            message: `"${version.label}" will be removed permanently.`,
            confirmText: 'Delete',
            danger: true,
        }))) return;
        const snapshots = (studio?.snapshots || []).filter((s) => s.id !== version.id);
        const patch = { snapshots };
        if (studio?.activeVersionId === version.id) patch.activeVersionId = null;
        await save(patch);
    }, [confirm, save, studio]);

    const switchMode = useCallback((next) => {
        if (next === mode) return;
        if (next === 'visual') {
            try {
                setModel(parseResumeLatex(editorRef.current?.getValue() ?? ''));
                setMode('visual');
            } catch (e) {
                toast.error(`Can't open visual mode: ${e.message}`);
            }
        } else {
            if (model) {
                editorRef.current?.setValue(generateResumeLatex(model));
            }
            setModel(null);
            setMode('code');
        }
    }, [mode, model, toast]);

    const insertLatex = useCallback((block) => {
        if (mode === 'visual') {
            setModel((m) => (m
                ? { ...m, sections: [{ id: `raw-${Date.now()}`, title: 'Added Block', type: 'raw', raw: block.trim() }, ...m.sections] }
                : m));
            setDirty(true);
            toast.success('Added as a new "Added Block" section — rename or drag it into place');
        } else {
            editorRef.current?.insertAtCursor(block);
            setDirty(true);
        }
    }, [mode, toast]);

    const applyTemplate = useCallback(async (template) => {
        if (!(await confirm({
            title: `Load "${template.name}"?`,
            message: 'This replaces the entire document. Take a snapshot first if you want to keep the current version.',
            confirmText: 'Replace document',
            danger: true,
        }))) return;
        loadLatexIntoActiveEditor(template.latex);
        await save({ templateId: template.id }, template.latex);
        toast.success(`Template "${template.name}" loaded`);
    }, [confirm, save, toast, loadLatexIntoActiveEditor]);

    const applyTheme = useCallback((presetId) => {
        const current = getLatex();
        const themed = applyThemePreset(current, presetId);
        if (themed === current) return;
        loadLatexIntoActiveEditor(themed);
        toast.success('Theme applied — compile to preview');
    }, [getLatex, toast, loadLatexIntoActiveEditor]);

    useEffect(() => {
        if (!autoSave || !dirty || saving || compiling) return undefined;
        const delay = autoCompile ? 2500 : 1500;
        const timer = setTimeout(async () => {
            const saved = await save();
            if (saved && autoCompile) await compile();
        }, delay);
        return () => clearTimeout(timer);
    }, [autoSave, autoCompile, dirty, saving, compiling, save, compile]);

    if (loading) {
        return (
            <div className="adm-page adm-sc-root">
                <Panel><Loading label="Loading resume studio" rows={6} /></Panel>
            </div>
        );
    }

    return (
        <div className="adm-page adm-sc-root">
            <PageHeader
                command="edit"
                title="Resume studio"
                description={`Compiled ${timeLabel(studio?.lastCompiledAt)} · Published ${timeLabel(studio?.lastPublishedAt)}`}
                actions={
                    <>
                        <button
                            type="button"
                            onClick={() => save()}
                            disabled={saving}
                            className="adm-btn"
                        >
                            {saving ? <FaSpinner className="animate-spin" aria-hidden="true" /> : <FaFloppyDisk aria-hidden="true" />}
                            Save
                        </button>
                        <button
                            type="button"
                            onClick={saveAndCompile}
                            disabled={compiling || saving}
                            className="adm-btn"
                        >
                            {compiling ? <FaSpinner className="animate-spin" aria-hidden="true" /> : <FaPlay aria-hidden="true" />}
                            Compile
                        </button>
                        <button
                            type="button"
                            onClick={publish}
                            disabled={publishing || saving || compiling}
                            className="adm-btn adm-btn-primary"
                            title="Save, compile, then publish to the live site"
                        >
                            {publishing ? <FaSpinner className="animate-spin" aria-hidden="true" /> : <FaUpload aria-hidden="true" />}
                            Publish
                        </button>
                        <button
                            type="button"
                            onClick={download}
                            disabled={!pdfUrl}
                            className="adm-btn"
                            title="Download compiled PDF"
                        >
                            <FaDownload aria-hidden="true" /> Download PDF
                        </button>
                        <button
                            type="button"
                            onClick={saveVersion}
                            className="adm-btn"
                            title="Save current document as a new version"
                        >
                            <FaCodeBranch aria-hidden="true" /> Save version
                        </button>

                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setSettingsOpen(!settingsOpen)}
                                aria-expanded={settingsOpen}
                                aria-label="Studio settings"
                                title="Studio settings"
                                className="adm-icon-btn"
                            >
                                <FaGear aria-hidden="true" />
                            </button>

                            {settingsOpen && (
                                <>
                                    <div className="fixed inset-0 z-30" onClick={() => setSettingsOpen(false)} />
                                    <div className="adm-dialog absolute right-0 top-full z-40 mt-2 w-64 p-4 space-y-4">
                                        <Field label="LaTeX engine">
                                            <select
                                                value={engine}
                                                onChange={(e) => { setEngine(e.target.value); setDirty(true); }}
                                                className="adm-input font-mono"
                                            >
                                                {RESUME_ENGINES.map((eng) => <option key={eng} value={eng}>{eng}</option>)}
                                            </select>
                                        </Field>

                                        <div className="space-y-3 border-t border-[var(--hairline)] pt-3">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-sm text-[var(--text-primary)]">Auto-save</span>
                                                <button
                                                    type="button"
                                                    role="switch"
                                                    aria-checked={autoSave}
                                                    aria-label="Auto-save edits"
                                                    onClick={() => setAutoSave((v) => !v)}
                                                    className="adm-switch"
                                                />
                                            </div>
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-sm text-[var(--text-primary)]">Auto-compile</span>
                                                <button
                                                    type="button"
                                                    role="switch"
                                                    aria-checked={autoCompile}
                                                    aria-label="Auto-compile after save"
                                                    onClick={() => setAutoCompile((v) => { const next = !v; if (next) setAutoSave(true); return next; })}
                                                    className="adm-switch"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </>
                }
            />

            <div className="adm-sc-studio">
                <StudioSidePanel
                    mode={mode}
                    onInsert={insertLatex}
                    onApplyTemplate={applyTemplate}
                    onApplyTheme={applyTheme}
                    currentLatex={getLatex}
                    versions={studio?.snapshots || []}
                    activeVersionId={studio?.activeVersionId || null}
                    onSaveVersion={saveVersion}
                    onSwitchVersion={switchVersion}
                    onUpdateVersion={updateVersion}
                    onRenameVersion={renameVersion}
                    onDeleteVersion={deleteVersion}
                    editorApi={{
                        getValue: getLatex,
                        getSelection: () => (mode === 'code' ? (editorRef.current?.getSelection() || '') : ''),
                        replaceSelection: (text) => {
                            if (mode === 'code') {
                                editorRef.current?.replaceSelection(text);
                                setDirty(true);
                            } else {
                                insertLatex(text);
                            }
                        },
                        insertAtCursor: insertLatex,
                    }}
                    compileErrors={compileErrors}
                    compileLog={compileLog}
                    ideas={studio?.ideas || []}
                    onSaveIdeas={(ideas) => save({ ideas })}
                    toast={toast}
                />

                {/* Editor Pane */}
                <section className="adm-sc-studio-pane" aria-label="Resume editor">
                    <header className="adm-panel-head !py-0">
                        <div className="adm-tabs border-b-0" role="tablist" aria-label="Editor mode">
                            <button
                                type="button"
                                role="tab"
                                aria-selected={mode === 'visual'}
                                onClick={() => switchMode('visual')}
                                className="adm-tab"
                                title="Drag-and-drop visual editor"
                            >
                                <FaShapes aria-hidden="true" /> Visual
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={mode === 'code'}
                                onClick={() => switchMode('code')}
                                className="adm-tab"
                                title="LaTeX code editor"
                            >
                                <FaCode aria-hidden="true" /> Code
                            </button>
                        </div>
                        <div className="adm-actions">
                            <Badge>{engine}</Badge>
                            {dirty && <Badge tone="warn">Unsaved</Badge>}
                        </div>
                    </header>

                    <div className="relative flex-1 min-h-0 overflow-hidden">
                        <div className={`h-full w-full ${mode === 'visual' ? 'hidden' : ''}`}>
                            <LatexEditor
                                ref={editorRef}
                                initialDoc={studio?.latex || ''}
                                onDocChanged={() => setDirty(true)}
                                onSaveShortcut={saveAndCompile}
                            />
                        </div>
                        {mode === 'visual' && model && (
                            <div className="h-full w-full overflow-y-auto">
                                <VisualEditor
                                    model={model}
                                    onChange={(next) => { setModel(next); setDirty(true); }}
                                />
                            </div>
                        )}
                    </div>
                </section>

                {/* Preview & Compile Log Pane */}
                <section className="adm-sc-studio-pane" aria-label="PDF preview">
                    <header className="adm-panel-head">
                        <h2 className="adm-panel-title">PDF preview</h2>
                        <div className="adm-actions">
                            {studio?.updatedAt && (
                                <Badge>Saved {timeLabel(studio.updatedAt)}</Badge>
                            )}
                            {compileErrors.length > 0 && (
                                <Badge tone="error">{compileErrors.length} {compileErrors.length === 1 ? 'error' : 'errors'}</Badge>
                            )}
                        </div>
                    </header>

                    <div className="relative flex-1 min-h-0 overflow-hidden bg-[var(--bg-secondary)]">
                        {pdfUrl ? (
                            <iframe
                                title="Resume preview"
                                src={`${pdfUrl}#toolbar=0&navpanes=0&view=FitH`}
                                className="h-full w-full border-0"
                            />
                        ) : (
                            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-[var(--text-secondary)]">
                                <FaPlay className="text-xl text-[var(--adm-hint)]" aria-hidden="true" />
                                <p>Click <strong className="text-[var(--text-bright)]">Compile</strong> (or press Ctrl+S) to preview your resume.</p>
                            </div>
                        )}
                    </div>

                    {showLog && (
                        <div className="max-h-56 overflow-y-auto border-t border-[var(--hairline)] bg-[var(--bg-secondary)] p-3 font-mono text-xs">
                            <div className="mb-2 flex items-center justify-between">
                                <span className="flex items-center gap-2 font-semibold text-[var(--adm-error-ink)]">
                                    <FaCircleExclamation aria-hidden="true" />
                                    {compileErrors.length} {compileErrors.length === 1 ? 'error' : 'errors'}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setShowLog(false)}
                                    className="adm-icon-btn"
                                    aria-label="Close compile log"
                                >
                                    <FaXmark aria-hidden="true" />
                                </button>
                            </div>
                            <div className="space-y-1">
                                {compileErrors.map((err, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => err.line && editorRef.current?.gotoLine(err.line)}
                                        className="adm-row w-full rounded-md text-left text-xs text-[var(--adm-error-ink)]"
                                    >
                                        {err.line ? <Badge tone="warn">L{err.line}</Badge> : null}
                                        <span>{err.message}</span>
                                    </button>
                                ))}
                            </div>
                            <details className="mt-2">
                                <summary className="cursor-pointer text-[var(--text-secondary)]">Full compiler log</summary>
                                <pre className="adm-code mt-1.5 whitespace-pre-wrap text-xs">{compileLog}</pre>
                            </details>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
