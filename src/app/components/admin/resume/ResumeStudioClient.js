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
    FaSpinner, FaCircleExclamation, FaXmark, FaCamera,
    FaCode, FaShapes,
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
    const [pdfBase64, setPdfBase64] = useState(null);
    const [compileErrors, setCompileErrors] = useState([]);
    const [compileLog, setCompileLog] = useState('');
    const [showLog, setShowLog] = useState(false);
    const [engine, setEngine] = useState('pdflatex');
    const [mode, setMode] = useState('code'); // 'code' | 'visual'
    const [model, setModel] = useState(null); // parsed model while in visual mode
    const pdfUrlRef = useRef(null);

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

    // ── Actions ─────────────────────────────────────────────────────────
    const save = useCallback(async (extraPatch = {}) => {
        const latex = getLatex();
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
        if (!latex) return;
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
                setPdfBase64(json.data.pdfBase64);
                setCompileLog('');
                setShowLog(false);
                setStudio((s) => (s ? { ...s, lastCompiledAt: json.data.compiledAt } : s));
                toast.success('Compiled successfully');
            } else if (json.data?.log) {
                setCompileErrors(json.data.errors || []);
                setCompileLog(json.data.log);
                setShowLog(true);
                toast.error(`Compilation failed (${json.data.errors?.length || 0} errors)`);
            } else {
                toast.error(json.error || 'Compile failed');
            }
        } catch {
            toast.error('Compile request failed');
        } finally {
            setCompiling(false);
        }
    }, [engine, toast, getLatex]);

    const saveAndCompile = useCallback(async () => {
        await save();
        await compile();
    }, [save, compile]);

    const publish = useCallback(async () => {
        if (!pdfBase64) {
            toast.error('Compile a PDF first, then publish.');
            return;
        }
        if (!(await confirm({
            title: 'Publish resume?',
            message: 'This replaces the PDF served on your public site at /api/resume.',
            confirmText: 'Publish',
        }))) return;
        setPublishing(true);
        try {
            const res = await fetch('/api/admin/resume/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pdfBase64, filename: 'resume.pdf' }),
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
    }, [pdfBase64, confirm, toast]);

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

    const takeSnapshot = useCallback(async () => {
        const label = await prompt({
            title: 'Snapshot label',
            message: 'Name this version so you can restore it later.',
            defaultValue: `Snapshot ${new Date().toLocaleDateString()}`,
        });
        if (!label) return;
        const latex = getLatex();
        const snapshot = {
            id: `snap-${Date.now()}`,
            label,
            latex,
            createdAt: new Date().toISOString(),
        };
        const snapshots = [snapshot, ...(studio?.snapshots || [])].slice(0, MAX_SNAPSHOTS);
        const saved = await save({ snapshots });
        if (saved) toast.success('Snapshot saved');
    }, [prompt, save, studio, toast, getLatex]);

    const restoreSnapshot = useCallback(async (snapshot) => {
        if (!(await confirm({
            title: `Restore "${snapshot.label}"?`,
            message: 'Your current editor content will be replaced (a safety snapshot is kept in history via undo).',
            confirmText: 'Restore',
        }))) return;
        editorRef.current?.setValue(snapshot.latex);
        setDirty(true);
        toast.success('Snapshot restored into the editor — save to keep it.');
    }, [confirm, toast]);

    const deleteSnapshot = useCallback(async (snapshot) => {
        if (!(await confirm({
            title: 'Delete snapshot?',
            message: `"${snapshot.label}" will be removed permanently.`,
            confirmText: 'Delete',
            danger: true,
        }))) return;
        const snapshots = (studio?.snapshots || []).filter((s) => s.id !== snapshot.id);
        await save({ snapshots });
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

    const insertBlock = useCallback((block) => {
        editorRef.current?.insertAtCursor(block);
        setDirty(true);
    }, []);

    const applyTemplate = useCallback(async (template) => {
        if (!(await confirm({
            title: `Load "${template.name}"?`,
            message: 'This replaces the entire document. Take a snapshot first if you want to keep the current version.',
            confirmText: 'Replace document',
            danger: true,
        }))) return;
        editorRef.current?.setValue(template.latex);
        setDirty(true);
        await save({ templateId: template.id });
        toast.success(`Template "${template.name}" loaded`);
    }, [confirm, save, toast]);

    const applyTheme = useCallback((presetId) => {
        const current = editorRef.current?.getValue() || '';
        const themed = applyThemePreset(current, presetId);
        if (themed === current) return;
        editorRef.current?.setValue(themed);
        setDirty(true);
        toast.success('Theme applied — compile to preview');
    }, [toast]);

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
        <div className="flex flex-col h-[calc(100vh-1rem)] p-3 gap-3">
            {/* Header / toolbar */}
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur px-4 py-3">
                <div className="mr-auto">
                    <Link href="/admin" className="text-cyan-400 hover:text-cyan-300 text-xs font-mono opacity-60 hover:opacity-100">
                        ← BACK
                    </Link>
                    <h1 className="text-lg font-bold text-white leading-tight">
                        Resume Studio
                        {dirty && <span className="ml-2 text-amber-400 text-xs align-middle">● unsaved</span>}
                    </h1>
                    <p className="text-[11px] text-slate-500 font-mono">
                        saved {timeLabel(studio?.updatedAt)} · compiled {timeLabel(studio?.lastCompiledAt)} · published {timeLabel(studio?.lastPublishedAt)}
                    </p>
                </div>

                {/* Mode toggle */}
                <div className="flex rounded-lg border border-white/10 overflow-hidden">
                    <button
                        onClick={() => switchMode('code')}
                        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${mode === 'code' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-500 hover:text-slate-300'}`}
                        title="LaTeX code editor"
                    >
                        <FaCode /> Code
                    </button>
                    <button
                        onClick={() => switchMode('visual')}
                        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${mode === 'visual' ? 'bg-purple-500/20 text-purple-300' : 'text-slate-500 hover:text-slate-300'}`}
                        title="Drag-and-drop visual editor"
                    >
                        <FaShapes /> Visual
                    </button>
                </div>

                <select
                    value={engine}
                    onChange={(e) => { setEngine(e.target.value); setDirty(true); }}
                    className="bg-slate-800 border border-white/10 rounded-lg px-2 py-2 text-xs text-slate-300 font-mono"
                    title="LaTeX engine"
                >
                    {RESUME_ENGINES.map((eng) => <option key={eng} value={eng}>{eng}</option>)}
                </select>

                <button onClick={() => save()} disabled={saving} className={`${toolbarBtn} bg-slate-500/10 border-slate-500/30 text-slate-300 hover:border-slate-400`}>
                    {saving ? <FaSpinner className="animate-spin" /> : <FaFloppyDisk />} Save
                </button>
                <button onClick={saveAndCompile} disabled={compiling || saving} className={`${toolbarBtn} bg-cyan-500/10 border-cyan-500/30 text-cyan-300 hover:border-cyan-400`}>
                    {compiling ? <FaSpinner className="animate-spin" /> : <FaPlay />} Compile
                </button>
                <button onClick={publish} disabled={publishing || !pdfBase64} className={`${toolbarBtn} bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:border-emerald-400`}>
                    {publishing ? <FaSpinner className="animate-spin" /> : <FaUpload />} Publish
                </button>
                <button onClick={download} disabled={!pdfUrl} className={`${toolbarBtn} bg-purple-500/10 border-purple-500/30 text-purple-300 hover:border-purple-400`}>
                    <FaDownload /> PDF
                </button>
                <button onClick={takeSnapshot} className={`${toolbarBtn} bg-amber-500/10 border-amber-500/30 text-amber-300 hover:border-amber-400`}>
                    <FaCamera /> Snapshot
                </button>
            </div>

            {/* Main split */}
            <div className="flex flex-1 min-h-0 gap-3">
                {/* Editor (CodeMirror stays mounted so its buffer survives mode switches) */}
                <div className={`flex-1 min-w-0 rounded-xl border border-white/10 overflow-hidden bg-[#282c34] ${mode === 'visual' ? 'hidden' : ''}`}>
                    <LatexEditor
                        ref={editorRef}
                        initialDoc={studio?.latex || ''}
                        onDocChanged={() => setDirty(true)}
                        onSaveShortcut={saveAndCompile}
                    />
                </div>
                {mode === 'visual' && model && (
                    <div className="flex-1 min-w-0 rounded-xl border border-white/10 overflow-hidden bg-slate-950/40">
                        <VisualEditor
                            model={model}
                            onChange={(next) => { setModel(next); setDirty(true); }}
                        />
                    </div>
                )}

                {/* Preview / errors */}
                <div className="flex-1 min-w-0 flex flex-col gap-3">
                    <div className="flex-1 min-h-0 rounded-xl border border-white/10 overflow-hidden bg-slate-900/60">
                        {pdfUrl ? (
                            <iframe title="Resume preview" src={pdfUrl} className="w-full h-full" />
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

                {/* Side panel targets the code editor; hidden in visual mode */}
                {mode === 'code' && <StudioSidePanel
                    onInsert={insertBlock}
                    onApplyTemplate={applyTemplate}
                    onApplyTheme={applyTheme}
                    currentLatex={() => editorRef.current?.getValue() || ''}
                    snapshots={studio?.snapshots || []}
                    onRestoreSnapshot={restoreSnapshot}
                    onDeleteSnapshot={deleteSnapshot}
                    editorApi={{
                        getValue: () => editorRef.current?.getValue() || '',
                        getSelection: () => editorRef.current?.getSelection() || '',
                        replaceSelection: (text) => { editorRef.current?.replaceSelection(text); setDirty(true); },
                        insertAtCursor: insertBlock,
                    }}
                    compileErrors={compileErrors}
                    compileLog={compileLog}
                    ideas={studio?.ideas || []}
                    onSaveIdeas={(ideas) => save({ ideas })}
                    toast={toast}
                />}
            </div>
        </div>
    );
}
