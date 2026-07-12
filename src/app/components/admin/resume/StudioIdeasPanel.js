"use client";
/**
 * Ideas board tab: capture rough resume ideas ("mention the 40% automation
 * win"), tick them off, and expand any idea into polished LaTeX bullets via AI.
 */
import React, { useState } from 'react';
import { FaPlus, FaSpinner, FaWandMagicSparkles, FaTrash } from 'react-icons/fa6';

export default function StudioIdeasPanel({ ideas, onSaveIdeas, editorApi, toast }) {
    const [draft, setDraft] = useState('');
    const [expanding, setExpanding] = useState(null);

    const addIdea = () => {
        const text = draft.trim();
        if (!text) return;
        onSaveIdeas([
            { id: `idea-${Date.now()}`, text, done: false, createdAt: new Date().toISOString() },
            ...ideas,
        ]);
        setDraft('');
    };

    const toggle = (idea) =>
        onSaveIdeas(ideas.map((i) => (i.id === idea.id ? { ...i, done: !i.done } : i)));

    const remove = (idea) => onSaveIdeas(ideas.filter((i) => i.id !== idea.id));

    const expand = async (idea) => {
        setExpanding(idea.id);
        try {
            const res = await fetch('/api/admin/ai/text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: idea.text, mode: 'resume_expand_idea' }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error || 'AI request failed');
            editorApi.insertAtCursor(`\n${json.data}\n`);
            toast.success('Bullets inserted at cursor');
        } catch (e) {
            toast.error(e.message);
        } finally {
            setExpanding(null);
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex gap-1.5">
                <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addIdea()}
                    placeholder="Capture a resume idea…"
                    className="min-w-0 flex-1 bg-slate-950/60 border border-white/10 rounded-md px-2 py-1.5 text-xs text-slate-200 placeholder:text-slate-600"
                />
                <button onClick={addIdea} className="shrink-0 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2.5 text-cyan-300 hover:border-cyan-400">
                    <FaPlus className="text-[10px]" />
                </button>
            </div>

            {ideas.length === 0 && (
                <p className="text-[11px] text-slate-600">Jot down achievements, numbers, or sections you want on the resume — then expand them into bullets with AI.</p>
            )}

            {ideas.map((idea) => (
                <div key={idea.id} className={`rounded-lg border p-2 ${idea.done ? 'border-white/5 bg-white/[0.01] opacity-50' : 'border-white/5 bg-white/[0.03]'}`}>
                    <label className="flex items-start gap-2 cursor-pointer">
                        <input type="checkbox" checked={idea.done} onChange={() => toggle(idea)} className="mt-0.5 accent-cyan-500" />
                        <span className={`text-xs text-slate-200 ${idea.done ? 'line-through' : ''}`}>{idea.text}</span>
                    </label>
                    <div className="flex gap-3 mt-1.5 pl-6">
                        <button
                            onClick={() => expand(idea)}
                            disabled={expanding === idea.id}
                            className="flex items-center gap-1 text-[10px] uppercase font-bold text-purple-400 hover:text-purple-300 disabled:opacity-50"
                        >
                            {expanding === idea.id ? <FaSpinner className="animate-spin" /> : <FaWandMagicSparkles />} Expand to LaTeX
                        </button>
                        <button onClick={() => remove(idea)} className="flex items-center gap-1 text-[10px] uppercase font-bold text-red-400/70 hover:text-red-300">
                            <FaTrash /> Delete
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
