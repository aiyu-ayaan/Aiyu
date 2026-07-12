"use client";
/**
 * AI tab for Resume Studio. Talks to /api/admin/ai/text (the same provider
 * failover stack configured in /admin/ai) with resume-specific modes.
 * Results land in an output box with Insert / Replace-selection actions.
 */
import React, { useState } from 'react';
import { FaWandMagicSparkles, FaSpinner, FaBugSlash, FaBullseye, FaPenFancy, FaCopy, FaArrowRightToBracket, FaRetweet } from 'react-icons/fa6';

async function callAi({ prompt, mode, context }) {
    const res = await fetch('/api/admin/ai/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, mode, context }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'AI request failed');
    return json.data;
}

const actionBtn = 'w-full flex items-center gap-2 rounded-lg border p-2 text-left text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed';

export default function StudioAiPanel({ editorApi, compileErrors, compileLog, toast }) {
    const [busy, setBusy] = useState(null); // which action is running
    const [output, setOutput] = useState('');
    const [outputKind, setOutputKind] = useState('latex'); // latex | advice
    const [jobDescription, setJobDescription] = useState('');
    const [customPrompt, setCustomPrompt] = useState('');

    const run = async (id, kind, fn) => {
        setBusy(id);
        try {
            const text = await fn();
            setOutput(text);
            setOutputKind(kind);
        } catch (e) {
            toast.error(e.message);
        } finally {
            setBusy(null);
        }
    };

    const refineSelection = () => {
        const selection = editorApi.getSelection();
        if (!selection.trim()) return toast.error('Select some LaTeX in the editor first.');
        return run('refine', 'latex', () => callAi({ prompt: selection, mode: 'latex_refine' }));
    };

    const fixErrors = () => {
        if (!compileErrors?.length) return toast.error('No compile errors — run Compile first.');
        const doc = editorApi.getValue();
        const lines = doc.split('\n');
        // Send only the neighborhoods of the failing lines, not the whole doc.
        const snippets = compileErrors.slice(0, 5).map((err) => {
            if (!err.line) return '';
            const from = Math.max(0, err.line - 6);
            const to = Math.min(lines.length, err.line + 5);
            return lines.slice(from, to).map((l, i) => `${from + i + 1}: ${l}`).join('\n');
        }).filter(Boolean).join('\n---\n');
        const errors = compileErrors.map((e) => `${e.line ? `line ${e.line}: ` : ''}${e.message}`).join('\n');
        return run('fix', 'advice', () => callAi({ prompt: snippets || compileLog.slice(-3000), mode: 'latex_fix', context: { errors } }));
    };

    const tailor = () => {
        if (!jobDescription.trim()) return toast.error('Paste a job description first.');
        return run('tailor', 'advice', () => callAi({
            prompt: editorApi.getValue(),
            mode: 'latex_tailor',
            context: { jobDescription },
        }));
    };

    const generate = () => {
        if (!customPrompt.trim()) return toast.error('Describe what to generate.');
        const selection = editorApi.getSelection();
        return run('generate', 'latex', () => callAi({
            prompt: selection ? `${customPrompt}\n\nSelected LaTeX for context:\n${selection}` : customPrompt,
            mode: 'latex_generate',
        }));
    };

    return (
        <div className="space-y-2">
            <button onClick={refineSelection} disabled={!!busy} className={`${actionBtn} border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:border-cyan-400`}>
                {busy === 'refine' ? <FaSpinner className="animate-spin" /> : <FaPenFancy />} Refine selection
            </button>
            <button onClick={fixErrors} disabled={!!busy || !compileErrors?.length} className={`${actionBtn} border-red-500/30 bg-red-500/10 text-red-300 hover:border-red-400`}>
                {busy === 'fix' ? <FaSpinner className="animate-spin" /> : <FaBugSlash />} Fix compile errors ({compileErrors?.length || 0})
            </button>

            <div className="rounded-lg border border-white/5 bg-white/[0.03] p-2 space-y-2">
                <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste a job description…"
                    rows={3}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-md p-2 text-xs text-slate-200 placeholder:text-slate-600 resize-y"
                />
                <button onClick={tailor} disabled={!!busy} className={`${actionBtn} border-amber-500/30 bg-amber-500/10 text-amber-300 hover:border-amber-400`}>
                    {busy === 'tailor' ? <FaSpinner className="animate-spin" /> : <FaBullseye />} Tailor to this job
                </button>
            </div>

            <div className="rounded-lg border border-white/5 bg-white/[0.03] p-2 space-y-2">
                <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Generate anything… e.g. 'a projects entry for a rust CLI that syncs dotfiles'"
                    rows={3}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-md p-2 text-xs text-slate-200 placeholder:text-slate-600 resize-y"
                />
                <button onClick={generate} disabled={!!busy} className={`${actionBtn} border-purple-500/30 bg-purple-500/10 text-purple-300 hover:border-purple-400`}>
                    {busy === 'generate' ? <FaSpinner className="animate-spin" /> : <FaWandMagicSparkles />} Generate LaTeX
                </button>
            </div>

            {output && (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-2 space-y-2">
                    <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-[11px] text-emerald-100/90 font-mono">{output}</pre>
                    <div className="flex gap-2">
                        {outputKind === 'latex' && (
                            <>
                                <button
                                    onClick={() => { editorApi.insertAtCursor(`\n${output}\n`); toast.success('Inserted'); }}
                                    className="flex items-center gap-1 text-[10px] uppercase font-bold text-cyan-400 hover:text-cyan-300"
                                >
                                    <FaArrowRightToBracket /> Insert
                                </button>
                                <button
                                    onClick={() => { editorApi.replaceSelection(output); toast.success('Selection replaced'); }}
                                    className="flex items-center gap-1 text-[10px] uppercase font-bold text-amber-400 hover:text-amber-300"
                                >
                                    <FaRetweet /> Replace selection
                                </button>
                            </>
                        )}
                        <button
                            onClick={() => { navigator.clipboard.writeText(output); toast.success('Copied'); }}
                            className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400 hover:text-slate-200"
                        >
                            <FaCopy /> Copy
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
