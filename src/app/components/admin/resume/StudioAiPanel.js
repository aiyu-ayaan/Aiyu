"use client";
/**
 * AI tab for Resume Studio. Talks to /api/admin/ai/text (the same provider
 * failover stack configured in /admin/ai) with resume-specific modes.
 * Results land in an output box with Insert / Replace-selection actions.
 */
import React, { useState } from 'react';
import {
    FaArrowRightToBracket,
    FaBugSlash,
    FaBullseye,
    FaCopy,
    FaPenFancy,
    FaRetweet,
    FaSpinner,
    FaWandMagicSparkles,
} from 'react-icons/fa6';
import { Field } from '@/app/components/admin/ui';

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

export default function StudioAiPanel({ mode = 'code', editorApi, compileErrors, compileLog, toast }) {
    const [busy, setBusy] = useState(null);
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
        <div className="space-y-3">
            {mode === 'visual' ? (
                <div className="adm-notice adm-notice-info">
                    Generated LaTeX is added as a new block you can drag into place. Switch to <strong>Code</strong> mode to refine a specific selection.
                </div>
            ) : (
                <button
                    type="button"
                    onClick={refineSelection}
                    disabled={!!busy}
                    className="adm-btn w-full justify-start"
                >
                    {busy === 'refine' ? <FaSpinner className="animate-spin" aria-hidden="true" /> : <FaPenFancy aria-hidden="true" />}
                    Refine selected LaTeX
                </button>
            )}

            <button
                type="button"
                onClick={fixErrors}
                disabled={!!busy || !compileErrors?.length}
                className="adm-btn w-full justify-start"
            >
                {busy === 'fix' ? <FaSpinner className="animate-spin" aria-hidden="true" /> : <FaBugSlash aria-hidden="true" />}
                Fix compile errors ({compileErrors?.length || 0})
            </button>

            <div className="adm-sc-item p-3 space-y-2.5">
                <Field label="Tailor to job description">
                    <textarea
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        placeholder="Paste a job description…"
                        rows={3}
                        className="adm-input !min-h-16"
                    />
                </Field>
                <button
                    type="button"
                    onClick={tailor}
                    disabled={!!busy}
                    className="adm-btn w-full"
                >
                    {busy === 'tailor' ? <FaSpinner className="animate-spin" aria-hidden="true" /> : <FaBullseye aria-hidden="true" />}
                    Tailor resume
                </button>
            </div>

            <div className="adm-sc-item p-3 space-y-2.5">
                <Field label="Generate LaTeX block">
                    <textarea
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder="e.g. A projects entry for a Rust CLI that syncs dotfiles"
                        rows={3}
                        className="adm-input !min-h-16"
                    />
                </Field>
                <button
                    type="button"
                    onClick={generate}
                    disabled={!!busy}
                    className="adm-btn adm-btn-primary w-full"
                >
                    {busy === 'generate' ? <FaSpinner className="animate-spin" aria-hidden="true" /> : <FaWandMagicSparkles aria-hidden="true" />}
                    Generate LaTeX
                </button>
            </div>

            {output && (
                <div className="adm-sc-item p-3 space-y-2.5">
                    <pre className="adm-code max-h-48 whitespace-pre-wrap">{output}</pre>
                    <div className="flex flex-wrap gap-2">
                        {outputKind === 'latex' && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => { editorApi.insertAtCursor(`\n${output}\n`); toast.success('Inserted'); }}
                                    className="adm-btn adm-btn-primary"
                                >
                                    <FaArrowRightToBracket aria-hidden="true" /> Insert
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { editorApi.replaceSelection(output); toast.success('Selection replaced'); }}
                                    className="adm-btn"
                                >
                                    <FaRetweet aria-hidden="true" /> Replace selection
                                </button>
                            </>
                        )}
                        <button
                            type="button"
                            onClick={() => { navigator.clipboard.writeText(output); toast.success('Copied'); }}
                            className="adm-btn"
                        >
                            <FaCopy aria-hidden="true" /> Copy
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
