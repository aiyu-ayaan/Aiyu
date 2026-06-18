"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  FaFloppyDisk, FaPlay, FaCirclePlus, FaCopy, FaTrash, FaPenToSquare,
  FaCircleCheck, FaUpload, FaChevronDown, FaTriangleExclamation,
} from 'react-icons/fa6';
import { createLatexDocument, duplicateLatexDocument } from '@/lib/resume/schema';
import { compileLatex, bytesToBase64 } from '@/lib/resume/swiftlatexEngine';
import { loadInsertSources } from './insertSources';

// CodeMirror is browser-only; never SSR it.
const LatexCodeEditor = dynamic(() => import('./LatexCodeEditor'), {
  ssr: false,
  loading: () => <div className="p-4 text-slate-500 font-mono text-xs">Loading editor…</div>,
});

const DEBOUNCE_MS = 1500;

export default function ResumeBuilderClient() {
  const [builder, setBuilder] = useState(null);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [compiling, setCompiling] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [compileLog, setCompileLog] = useState('');
  const [compileError, setCompileError] = useState('');
  const [logOpen, setLogOpen] = useState(false);

  const [insertGroups, setInsertGroups] = useState([]);
  const [insertOpen, setInsertOpen] = useState(false);

  const editorRef = useRef(null);
  const debounceRef = useRef(null);
  const pdfUrlRef = useRef('');
  const lastPdfBytesRef = useRef(null);

  // ---- load ----------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/resume');
        if (!res.ok) throw new Error('Failed to load resume');
        const data = await res.json();
        if (cancelled) return;
        setBuilder(data);
        setSelectedId(data.latex.liveDocumentId || data.latex.documents[0]?.id || '');
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    loadInsertSources().then((g) => !cancelled && setInsertGroups(g));
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedDoc = useMemo(
    () => builder?.latex.documents.find((d) => d.id === selectedId) || builder?.latex.documents[0] || null,
    [builder, selectedId]
  );
  const activeFile = selectedDoc?.files[0] || null;

  // ---- compile -------------------------------------------------------------
  const setPdf = useCallback((bytes) => {
    if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    pdfUrlRef.current = url;
    lastPdfBytesRef.current = bytes;
    setPdfUrl(url);
  }, []);

  const runCompile = useCallback(async () => {
    if (!selectedDoc) return null;
    setCompiling(true);
    setCompileError('');
    try {
      const result = await compileLatex({ files: selectedDoc.files, entry: selectedDoc.entry });
      setCompileLog(result.log || '');
      if (result.ok && result.pdf) {
        setPdf(result.pdf);
        return result.pdf;
      }
      setCompileError('Compilation failed — check the log.');
      setLogOpen(true);
      return null;
    } catch (e) {
      setCompileError(e.message || 'Engine error');
      setLogOpen(true);
      return null;
    } finally {
      setCompiling(false);
    }
  }, [selectedDoc, setPdf]);

  // Compile on document switch; clear stale preview first.
  useEffect(() => {
    if (!selectedDoc) return;
    lastPdfBytesRef.current = null;
    runCompile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => () => pdfUrlRef.current && URL.revokeObjectURL(pdfUrlRef.current), []);

  // ---- editing -------------------------------------------------------------
  const patchDoc = useCallback(
    (id, patch) =>
      setBuilder((prev) => ({
        ...prev,
        latex: {
          ...prev.latex,
          documents: prev.latex.documents.map((d) =>
            d.id === id ? { ...d, ...patch, updatedAt: new Date().toISOString() } : d
          ),
        },
      })),
    []
  );

  const onContentChange = useCallback(
    (value) => {
      if (!selectedDoc || !activeFile) return;
      const files = selectedDoc.files.map((f) => (f.name === activeFile.name ? { ...f, content: value } : f));
      // Editing invalidates the published PDF tie — keep pdf but mark dirty.
      patchDoc(selectedDoc.id, { files });
      setDirty(true);
      lastPdfBytesRef.current = null;
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => runCompile(), DEBOUNCE_MS);
    },
    [selectedDoc, activeFile, patchDoc, runCompile]
  );

  const insertSnippet = useCallback((text) => {
    const view = editorRef.current?.view;
    if (!view) return;
    const { from, to } = view.state.selection.main;
    const insert = `\n${text}\n`;
    view.dispatch({ changes: { from, to, insert }, selection: { anchor: from + insert.length } });
    view.focus();
    setInsertOpen(false);
  }, []);

  // ---- persistence ---------------------------------------------------------
  const save = useCallback(async () => {
    if (!builder) return builder;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/resume', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(builder),
      });
      if (!res.ok) throw new Error('Save failed');
      const saved = await res.json();
      setBuilder(saved);
      setDirty(false);
      return saved;
    } catch (e) {
      setError(e.message || 'Save failed');
      return null;
    } finally {
      setSaving(false);
    }
  }, [builder]);

  const publish = useCallback(async () => {
    if (!selectedDoc) return;
    setPublishing(true);
    setError('');
    try {
      const saved = await save();
      if (!saved) throw new Error('Could not save before publishing');
      // Reuse fresh bytes if the current source already compiled cleanly.
      const bytes = lastPdfBytesRef.current || (await runCompile());
      if (!bytes) throw new Error('Fix the compile errors before publishing');
      const res = await fetch('/api/admin/resume/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: selectedDoc.id, pdfBase64: bytesToBase64(bytes), filename: selectedDoc.name }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Publish failed');
      setBuilder((prev) => ({ ...prev, latex: { ...prev.latex, liveDocumentId: selectedDoc.id } }));
    } catch (e) {
      setError(e.message || 'Publish failed');
    } finally {
      setPublishing(false);
    }
  }, [selectedDoc, save, runCompile]);

  // ---- document ops --------------------------------------------------------
  const addDocument = useCallback(() => {
    const doc = createLatexDocument(`Resume ${builder.latex.documents.length + 1}`, builder.schema);
    setBuilder((prev) => ({ ...prev, latex: { ...prev.latex, documents: [...prev.latex.documents, doc] } }));
    setSelectedId(doc.id);
    setDirty(true);
  }, [builder]);

  const duplicateDocument = useCallback(() => {
    if (!selectedDoc) return;
    const doc = duplicateLatexDocument(selectedDoc);
    setBuilder((prev) => ({ ...prev, latex: { ...prev.latex, documents: [...prev.latex.documents, doc] } }));
    setSelectedId(doc.id);
    setDirty(true);
  }, [selectedDoc]);

  const renameDocument = useCallback(
    (id) => {
      const doc = builder.latex.documents.find((d) => d.id === id);
      const name = window.prompt('Rename résumé', doc?.name || '');
      if (name && name.trim()) {
        patchDoc(id, { name: name.trim() });
        setDirty(true);
      }
    },
    [builder, patchDoc]
  );

  const deleteDocument = useCallback(
    (id) => {
      if (builder.latex.documents.length <= 1) return;
      if (!window.confirm('Delete this résumé? This cannot be undone.')) return;
      setBuilder((prev) => {
        const documents = prev.latex.documents.filter((d) => d.id !== id);
        const liveDocumentId = prev.latex.liveDocumentId === id ? documents[0].id : prev.latex.liveDocumentId;
        return { ...prev, latex: { ...prev.latex, documents, liveDocumentId } };
      });
      if (selectedId === id) setSelectedId(builder.latex.documents.find((d) => d.id !== id).id);
      setDirty(true);
    },
    [builder, selectedId]
  );

  if (loading) return <div className="p-8 text-slate-400 font-mono text-sm animate-pulse">Loading resume editor…</div>;
  if (!builder) return <div className="p-8 text-red-400 font-mono text-sm">{error || 'Could not load resume.'}</div>;

  const liveId = builder.latex.liveDocumentId;

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-5">
        <Link href="/admin" className="text-cyan-400 hover:text-cyan-300 mb-3 inline-block text-sm font-mono opacity-60 hover:opacity-100">
          ← BACK_TO_COMMAND_CENTER
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Resume LaTeX Studio</h1>
            <p className="text-slate-400 text-sm">Write LaTeX, compile in your browser, publish the live CV.</p>
          </div>
          <div className="flex items-center gap-2">
            {dirty ? <span className="text-xs text-amber-400/80 font-mono">Unsaved</span> : <span className="text-xs text-emerald-400/70 font-mono">Saved</span>}
            <button onClick={save} disabled={saving || !dirty} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700/40 border border-white/10 text-slate-200 hover:bg-slate-700/60 disabled:opacity-40 text-sm transition-all">
              <FaFloppyDisk size={13} /> {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={publish} disabled={publishing} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/15 border border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/25 disabled:opacity-40 text-sm transition-all">
              <FaUpload size={13} /> {publishing ? 'Publishing…' : 'Publish to site'}
            </button>
          </div>
        </div>
        {error ? <div className="mt-3 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div> : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[210px_1fr_1fr] gap-4 h-[calc(100vh-200px)] min-h-[560px]">
        {/* Documents sidebar */}
        <div className="bg-slate-900/40 rounded-xl border border-white/10 p-3 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-mono text-cyan-400/80 uppercase tracking-widest">Résumés</h3>
            <div className="flex gap-1">
              <button onClick={addDocument} title="New résumé" className="p-1.5 rounded-md border border-cyan-500/20 text-cyan-400 hover:border-cyan-500/40"><FaCirclePlus size={11} /></button>
              <button onClick={duplicateDocument} title="Duplicate" className="p-1.5 rounded-md border border-white/10 text-slate-300 hover:border-white/30"><FaCopy size={11} /></button>
            </div>
          </div>
          <div className="space-y-1.5 overflow-y-auto flex-1">
            {builder.latex.documents.map((d) => (
              <div key={d.id} className={`group rounded-lg border transition-all ${selectedId === d.id ? 'bg-cyan-500/10 border-cyan-500/40' : 'bg-slate-950/40 border-white/10 hover:border-white/20'}`}>
                <button onClick={() => setSelectedId(d.id)} className="w-full text-left px-3 py-2 flex items-center justify-between gap-2">
                  <span className={`truncate text-sm ${selectedId === d.id ? 'text-cyan-200' : 'text-slate-300'}`}>{d.name}</span>
                  {d.id === liveId ? <span className="text-[8px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded px-1 py-0.5">Live</span> : null}
                </button>
                {selectedId === d.id ? (
                  <div className="flex gap-1 px-2 pb-2">
                    <button onClick={() => renameDocument(d.id)} title="Rename" className="p-1 rounded text-slate-400 hover:text-white"><FaPenToSquare size={10} /></button>
                    <button onClick={() => deleteDocument(d.id)} disabled={builder.latex.documents.length <= 1} title="Delete" className="p-1 rounded text-red-400/70 hover:text-red-400 disabled:opacity-30"><FaTrash size={10} /></button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {/* Editor */}
        <div className="bg-slate-900/40 rounded-xl border border-white/10 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
            <span className="text-xs font-mono text-slate-400">{activeFile?.name}</span>
            <div className="flex items-center gap-2 relative">
              <button onClick={() => setInsertOpen((v) => !v)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-xs transition-all">
                Insert <FaChevronDown size={9} />
              </button>
              <button onClick={runCompile} disabled={compiling} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-50 text-xs transition-all">
                <FaPlay size={9} /> {compiling ? 'Compiling…' : 'Compile'}
              </button>
              {insertOpen ? (
                <div className="absolute right-0 top-9 z-20 w-72 max-h-80 overflow-y-auto bg-slate-900 border border-white/15 rounded-lg shadow-2xl p-2">
                  {insertGroups.every((g) => g.items.length === 0) ? (
                    <p className="text-xs text-slate-500 p-2">No projects/experience found.</p>
                  ) : (
                    insertGroups.map((g) =>
                      g.items.length ? (
                        <div key={g.key} className="mb-2">
                          <p className="text-[10px] font-mono uppercase tracking-wider text-cyan-400/70 px-2 py-1">{g.label}</p>
                          {g.items.map((it) => (
                            <button key={it.id} onClick={() => insertSnippet(it.latex())} className="w-full text-left px-2 py-1.5 rounded text-sm text-slate-300 hover:bg-cyan-500/10 hover:text-cyan-200 truncate">
                              {it.label}
                            </button>
                          ))}
                        </div>
                      ) : null
                    )
                  )}
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            {activeFile ? <LatexCodeEditor ref={editorRef} value={activeFile.content} onChange={onContentChange} /> : null}
          </div>
        </div>

        {/* Preview */}
        <div className="bg-slate-900/40 rounded-xl border border-white/10 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
            <span className="text-xs font-mono text-slate-400">Preview</span>
            <button onClick={() => setLogOpen((v) => !v)} className={`text-xs font-mono ${compileError ? 'text-red-400' : 'text-slate-500 hover:text-slate-300'}`}>
              {compileError ? <span className="flex items-center gap-1"><FaTriangleExclamation size={10} /> Log</span> : 'Log'}
            </button>
          </div>
          <div className="flex-1 relative bg-slate-950/60">
            {compiling ? <div className="absolute inset-0 flex items-center justify-center text-cyan-300/70 font-mono text-xs animate-pulse z-10">Compiling LaTeX…</div> : null}
            {pdfUrl ? (
              <iframe title="Resume preview" src={pdfUrl} className="w-full h-full" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-slate-500 font-mono text-xs px-6 text-center">
                {compileError || 'Compile to see a preview.'}
              </div>
            )}
            {logOpen ? (
              <div className="absolute bottom-0 left-0 right-0 max-h-1/2 h-1/2 overflow-y-auto bg-slate-950/95 border-t border-white/10 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Compile log</span>
                  <button onClick={() => setLogOpen(false)} className="text-slate-500 hover:text-white text-xs">close</button>
                </div>
                <pre className="text-[11px] leading-relaxed text-slate-400 whitespace-pre-wrap font-mono">{compileLog || 'No log yet.'}</pre>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
