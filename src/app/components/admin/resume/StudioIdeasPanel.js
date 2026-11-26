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
        <div className="space-y-3">
            <div className="flex gap-2">
                <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addIdea()}
                    placeholder="Capture a resume idea…"
                    aria-label="New resume idea"
                    className="adm-input flex-1"
                />
                <button
                    type="button"
                    onClick={addIdea}
                    className="adm-btn adm-btn-primary"
                    aria-label="Add idea"
                >
                    <FaPlus aria-hidden="true" />
                </button>
            </div>

            {ideas.length === 0 && (
                <p className="adm-help">
                    Jot down achievements, numbers, or sections you want on the resume — then expand them into bullets with AI.
                </p>
            )}

            <div className="space-y-2">
                {ideas.map((idea) => (
                    <div
                        key={idea.id}
                        className={`adm-sc-item p-3 space-y-2 ${idea.done ? 'opacity-60' : ''}`}
                    >
                        <label className="flex cursor-pointer items-start gap-2.5">
                            <input
                                type="checkbox"
                                checked={idea.done}
                                onChange={() => toggle(idea)}
                                className="adm-check mt-0.5"
                            />
                            <span className={`text-sm text-[var(--text-primary)] ${idea.done ? 'line-through' : ''}`}>
                                {idea.text}
                            </span>
                        </label>
                        <div className="flex flex-wrap items-center gap-2 pl-6">
                            <button
                                type="button"
                                onClick={() => expand(idea)}
                                disabled={expanding === idea.id}
                                className="adm-btn"
                            >
                                {expanding === idea.id ? (
                                    <FaSpinner className="animate-spin" aria-hidden="true" />
                                ) : (
                                    <FaWandMagicSparkles aria-hidden="true" />
                                )}
                                Expand to LaTeX
                            </button>
                            <button
                                type="button"
                                onClick={() => remove(idea)}
                                className="adm-icon-btn"
                                title="Delete idea"
                                aria-label="Delete idea"
                            >
                                <FaTrash aria-hidden="true" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
