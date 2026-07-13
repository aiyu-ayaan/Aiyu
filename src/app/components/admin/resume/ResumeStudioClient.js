"use client";
/**
 * Resume Studio — full-screen LaTeX IDE for /admin/resume.
 * Left: CodeMirror editor. Right: compiled PDF preview + error log.
 * Side panel hosts snapshots (and, in later tabs, portfolio items, templates,
 * AI tools, and the ideas board).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
    FaFloppyDisk, FaPlay, FaUpload, FaDownload,
    FaSpinner, FaCircleExclamation, FaXmark, FaCodeBranch,
    FaCode, FaShapes, FaChevronLeft,
} from 'react-icons/fa6';
import { useAdminFeedback } from '@/app/components/admin/feedback/AdminFeedbackProvider';
import { RESUME_ENGINES, MAX_SNAPSHOTS, applyThemePreset } from '@/lib/resumeStudio';
import { parseResumeLatex, generateResumeLatex } from '@/lib/resumeVisual';
import LatexEditor from './LatexEditor';
import StudioSidePanel from './StudioSidePanel';
import VisualEditor from './VisualEditor';

function timeLabel(iso) {
    if (!iso) return 'never';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ResumeStudioClient() {
    const { toast, confirm, prompt } = useAdminFeedback();
    const editorRef = useRef(null);

    const [studio, setStudio] = useState(null); // server document
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
    const [model, setModel] = useState(null); // parsed model while in visual mode
    const [autoSave, setAutoSave] = useState(false);
    const [autoCompile, setAutoCompile] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const pdfUrlRef = useRef(null);
    const didInitialCompile = useRef(false);

    /** Current LaTeX source regardless of editing mode. */
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
                    // Visual mode is the default; fall back to code if the
                    // document can't be parsed into a structured model.
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

    // Compile once as soon as the document is loaded so a preview is ready
    // without the user hitting Compile first.
    useEffect(() => {
        if (loading || !studio || didInitialCompile.current) return;
        didInitialCompile.current = true;
        compile();
    }, [loading, studio, compile]);

    // Restore auto-save / auto-compile preferences.
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

    // Returns the compiled PDF's base64 on success (so callers like publish can
    // chain on a fresh compile), or null on failure.
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

    const saveAndCompile = useCallback(async () => {
        await save();
        await compile();
    }, [save, compile]);

    // Publish runs the full pipeline: save → compile → upload. A one-time
    // explainer dialog describes the flow; "Don't show this again" persists a
    // skip flag so future publishes go straight through.
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
            if (!saved) return; // save() already reported the failure
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

    // Load a saved version into the editor and mark it active. Warns before
    // discarding unsaved edits so switching never silently loses work.
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

    // Overwrite an existing version with the current document.
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

    // Insert LaTeX at the cursor (code mode) or as a new headerless block
    // (visual mode), so AI / portfolio / ideas insertions work in both modes.
    const insertLatex = useCallback((block) => {
        if (mode === 'visual') {
            setModel((m) => (m
                ? { ...m, sections: [...m.sections, { id: `raw-${Date.now()}`, title: 'Added Block', type: 'raw', raw: block.trim() }] }
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

    // Auto-save (debounced) with optional auto-compile after a successful save.
    // The timer resets on every edit (dirty stays true until the save lands),
    // so rapid typing coalesces into one save.
    useEffect(() => {
        if (!autoSave || !dirty || saving || compiling) return undefined;
        const delay = autoCompile ? 2500 : 1500;
        const timer = setTimeout(async () => {
            const saved = await save();
            if (saved && autoCompile) await compile();
        }, delay);
        return () => clearTimeout(timer);
    }, [autoSave, autoCompile, dirty, saving, compiling, save, compile]);

    // ── Render ──────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex h-[70vh] items-center justify-center text-slate-400">
                <FaSpinner className="animate-spin mr-3" /> Loading Resume Studio…
            </div>
        );
    }

    const toolbarBtn = 'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border disabled:opacity-40 disabled:cursor-not-allowed';

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] p-3 gap-3 overflow-hidden bg-slate-950">
            {/* Redesigned Toolbar */}
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur px-4 py-2.5 shrink-0 z-20">
                {/* Left side: Back & Title */}
                <div className="flex items-center gap-3">
                    <Link href="/admin" className="flex items-center justify-center w-8 h-8 rounded-lg border border-white/10 bg-slate-800/40 text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-xs" title="Back to Admin Panel">
                        <FaChevronLeft className="text-[10px]" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-sm font-bold text-white leading-tight">
                                Resume Studio
                            </h1>
                            <span className="text-[9px] font-semibold tracking-wider uppercase text-slate-400 bg-slate-850 border border-white/5 px-1.5 py-0.5 rounded leading-none">
                                v{studio?.updatedAt ? timeLabel(studio.updatedAt) : 'never'}
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                            compiled {timeLabel(studio?.lastCompiledAt)} · published {timeLabel(studio?.lastPublishedAt)}
                        </p>
                    </div>
                </div>

                {/* Right side: Action Triggers & Configure Dropdown */}
                <div className="flex items-center gap-2 relative">
                    {/* Action Group */}
                    <button onClick={() => save()} disabled={saving} className={`${toolbarBtn} bg-slate-500/10 border-slate-500/20 text-slate-300 hover:bg-slate-500/20 hover:border-slate-400/40`}>
                        {saving ? <FaSpinner className="animate-spin" /> : <FaFloppyDisk />} Save
                    </button>
                    
                    <button onClick={saveAndCompile} disabled={compiling || saving} className={`${toolbarBtn} bg-cyan-500/10 border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/40`}>
                        {compiling ? <FaSpinner className="animate-spin" /> : <FaPlay />} Compile
                    </button>
                    
                    <button onClick={publish} disabled={publishing || saving || compiling} className={`${toolbarBtn} bg-emerald-500/10 border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-400/40`} title="Save, compile, then publish to the live site">
                        {publishing ? <FaSpinner className="animate-spin" /> : <FaUpload />} Publish
                    </button>
                    
                    <button onClick={download} disabled={!pdfUrl} className={`${toolbarBtn} bg-purple-500/10 border-purple-500/20 text-purple-300 hover:bg-purple-500/20 hover:border-purple-400/40`} title="Download PDF">
                        <FaDownload /> PDF
                    </button>
                    
                    <button onClick={saveVersion} className={`${toolbarBtn} bg-amber-500/10 border-amber-500/20 text-amber-300 hover:bg-amber-500/20 hover:border-amber-400/40`} title="Save current document as a new version">
                        <FaCodeBranch /> Save Version
                    </button>

                    {/* Configure Settings Popover */}
                    <div className="relative">
                        <button
                            onClick={() => setSettingsOpen(!settingsOpen)}
                            className={`flex items-center justify-center w-8 h-8 rounded-lg border text-slate-400 hover:text-slate-200 transition-all ${
                                settingsOpen ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' : 'border-white/10 bg-slate-800/40 hover:bg-slate-800'
                            }`}
                            title="Configure Studio Settings"
                        >
                            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </button>

                        {settingsOpen && (
                            <>
                                {/* Click outside overlay */}
                                <div className="fixed inset-0 z-30" onClick={() => setSettingsOpen(false)} />
                                {/* Dropdown panel */}
                                <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-white/10 bg-slate-900/95 p-3.5 shadow-2xl z-40 space-y-3.5 backdrop-blur-xl">
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                            LaTeX Engine
                                        </label>
                                        <select
                                            value={engine}
                                            onChange={(e) => { setEngine(e.target.value); setDirty(true); }}
                                            className="w-full bg-slate-950 border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-slate-300 font-mono focus:border-cyan-500/50 focus:outline-none"
                                        >
                                            {RESUME_ENGINES.map((eng) => <option key={eng} value={eng}>{eng}</option>)}
                                        </select>
                                    </div>

                                    <hr className="border-white/5" />

                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                            Edits Automation
                                        </label>
                                        <button
                                            onClick={() => setAutoSave((v) => !v)}
                                            className={`w-full flex items-between items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                                                autoSave 
                                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                                                    : 'border-white/10 text-slate-500 hover:text-slate-300'
                                            }`}
                                        >
                                            <span>Auto-Save</span>
                                            <span className={`w-1.5 h-1.5 rounded-full ${autoSave ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                                        </button>
                                        
                                        <button
                                            onClick={() => setAutoCompile((v) => { const next = !v; if (next) setAutoSave(true); return next; })}
                                            className={`w-full flex items-between items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                                                autoCompile 
                                                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' 
                                                    : 'border-white/10 text-slate-500 hover:text-slate-300'
                                            }`}
                                        >
                                            <span>Auto-Compile</span>
                                            <span className={`w-1.5 h-1.5 rounded-full ${autoCompile ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'}`} />
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Main split */}
            <div className="flex flex-1 min-h-0 gap-3 overflow-hidden">
                {/* Side panel (AI, Ideas, Portfolio, Design, History) — left of the
                    editor so items sit next to the visual canvas you insert them into. */}
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

                {/* Editor Pane (holds both Visual and Code mode views) */}
                <div className="flex-1 min-w-0 flex flex-col rounded-xl border border-white/10 overflow-hidden bg-slate-900/40">
                    {/* Pane tabs header */}
                    <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/45 px-3 py-2 shrink-0">
                        <div className="flex gap-1.5">
                            <button
                                onClick={() => switchMode('visual')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                                    mode === 'visual'
                                        ? 'bg-purple-500/10 border-purple-500/30 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.08)]'
                                        : 'border-transparent text-slate-500 hover:text-slate-300'
                                }`}
                                title="Drag-and-drop visual editor"
                            >
                                <FaShapes className="text-[10.5px]" /> Visual
                            </button>
                            <button
                                onClick={() => switchMode('code')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                                    mode === 'code'
                                        ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.08)]'
                                        : 'border-transparent text-slate-500 hover:text-slate-300'
                                }`}
                                title="LaTeX code editor"
                            >
                                <FaCode className="text-[10.5px]" /> Code
                            </button>
                        </div>
                        {dirty && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/5 border border-amber-500/20 px-2 py-0.5 rounded-md animate-pulse">
                                ● unsaved
                            </span>
                        )}
                    </div>

                    {/* Pane editor canvas */}
                    <div className="flex-1 min-h-0 relative overflow-hidden">
                        {/* Editor (CodeMirror stays mounted so its buffer survives mode switches) */}
                        <div className={`w-full h-full bg-[#282c34] ${mode === 'visual' ? 'hidden' : ''}`}>
                            <LatexEditor
                                ref={editorRef}
                                initialDoc={studio?.latex || ''}
                                onDocChanged={() => setDirty(true)}
                                onSaveShortcut={saveAndCompile}
                            />
                        </div>
                        {mode === 'visual' && model && (
                            <div className="w-full h-full overflow-auto bg-slate-950/40">
                                <VisualEditor
                                    model={model}
                                    onChange={(next) => { setModel(next); setDirty(true); }}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Preview / errors */}
                <div className="flex-1 min-w-0 flex flex-col gap-3 overflow-hidden">
                    <div className="flex-1 min-h-0 rounded-xl border border-white/10 overflow-hidden bg-slate-900/60 relative">
                        {pdfUrl ? (
                            <iframe title="Resume preview" src={`${pdfUrl}#toolbar=0&navpanes=0&view=FitH`} className="w-full h-full border-0" />
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm gap-2">
                                <FaPlay className="text-2xl opacity-40" />
                                <p>Hit <span className="text-cyan-400 font-mono">Compile</span> (or Ctrl+S) to preview your resume</p>
                            </div>
                        )}
                    </div>

                    {showLog && (
                        <div className="max-h-56 overflow-auto rounded-xl border border-red-500/30 bg-red-950/30 p-3 text-xs font-mono">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-red-300 font-bold flex items-center gap-2">
                                    <FaCircleExclamation /> {compileErrors.length} error{compileErrors.length === 1 ? '' : 's'}
                                </span>
                                <button onClick={() => setShowLog(false)} className="text-slate-400 hover:text-white"><FaXmark /></button>
                            </div>
                            {compileErrors.map((err, i) => (
                                <button
                                    key={i}
                                    onClick={() => err.line && editorRef.current?.gotoLine(err.line)}
                                    className="block w-full text-left text-red-200 hover:bg-red-500/10 rounded px-2 py-1"
                                >
                                    {err.line ? <span className="text-amber-400">L{err.line}</span> : null} {err.message}
                                </button>
                            ))}
                            <details className="mt-2 text-slate-400">
                                <summary className="cursor-pointer hover:text-slate-200">Full log</summary>
                                <pre className="whitespace-pre-wrap mt-1 text-[10px] leading-tight">{compileLog}</pre>
                            </details>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
