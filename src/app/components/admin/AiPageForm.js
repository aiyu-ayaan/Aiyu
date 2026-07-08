"use client";

import React, { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import Toast from './Toast';
import { postJson } from './aiSections/api';
import SkillsManager from './aiSections/SkillsManager';
import CardListManager from './aiSections/CardListManager';
import LayoutManager from './aiSections/LayoutManager';

/**
 * AI Hub editor. Card-based, live CRUD against the per-section REST APIs
 * (/api/ai/*): the four content sections are managed independently, and a
 * Layout tab controls section order/visibility/headings + hero/stats. There is
 * no single "big save" for content — each add/edit/delete persists immediately.
 */

const CONTENT_TABS = [
    { id: 'skills', label: 'Skills' },
    { id: 'recommendations', label: 'Recommendations' },
    { id: 'credits', label: 'Free Credits' },
    { id: 'prompts', label: 'Prompt Library' },
];

const RECOMMENDATION_FIELDS = [
    { name: 'name', label: 'Name', type: 'text', placeholder: 'e.g. Groq Cloud' },
    { name: 'url', label: 'URL', type: 'text', placeholder: 'https://' },
    { name: 'rating', label: 'Rating (0–5)', type: 'number', min: 0, max: 5 },
    { name: 'accent', label: 'Accent', type: 'accent' },
    { name: 'blurb', label: 'Why I recommend it', type: 'textarea', rows: 3 },
    { name: 'tags', label: 'Tags', type: 'tags', placeholder: 'e.g. low-latency' },
];

const CREDIT_FIELDS = [
    { name: 'name', label: 'Name', type: 'text', placeholder: 'e.g. Google AI Studio' },
    { name: 'offer', label: 'Offer', type: 'textarea', rows: 2 },
    { name: 'url', label: 'URL', type: 'text', placeholder: 'https://' },
    { name: 'freeApi', label: 'Free API key', type: 'switch' },
    { name: 'noCard', label: 'No credit card', type: 'switch' },
    { name: 'note', label: 'Note', type: 'text' },
];

const PROMPT_FIELDS = [
    { name: 'title', label: 'Title', type: 'text', placeholder: 'e.g. TypeScript Agent Developer' },
    { name: 'role', label: 'Role / tag', type: 'text', placeholder: 'e.g. Engineering' },
    { name: 'prompt', label: 'Prompt', type: 'textarea', rows: 6 },
];

export default function AiPageForm() {
    const [tab, setTab] = useState('content');
    const [contentTab, setContentTab] = useState('skills');
    const [notification, setNotification] = useState(null);
    const [seeding, setSeeding] = useState(false);

    const notify = (success, message) => {
        setNotification({ success, message });
        setTimeout(() => setNotification(null), 2600);
    };

    const seedDefaults = async () => {
        if (!confirm('Seed the four sections with the bundled defaults? This only fills sections that are currently empty.')) return;
        setSeeding(true);
        try {
            const res = await postJson('/api/ai/seed', {});
            const total = Object.values(res.seeded || {}).reduce((a, b) => a + b, 0);
            notify(true, total > 0 ? `Seeded defaults (${total} items). Reopen a tab to see them.` : 'Nothing to seed — sections already have content.');
        } catch (e) {
            notify(false, e.message || 'Seed failed.');
        } finally {
            setSeeding(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Top-level tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
                <div className="flex gap-2">
                    <TopTab label="Content" active={tab === 'content'} onClick={() => setTab('content')} />
                    <TopTab label="Layout" active={tab === 'layout'} onClick={() => setTab('layout')} />
                </div>
                <button
                    type="button"
                    onClick={seedDefaults}
                    disabled={seeding}
                    className="flex items-center gap-2 rounded-lg border border-purple-500/25 bg-purple-500/10 px-3.5 py-2 font-mono text-[0.7rem] uppercase tracking-wider text-purple-300 transition-colors hover:bg-purple-500/20 disabled:opacity-50"
                    title="One-time backfill of empty sections from the bundled defaults"
                >
                    {seeding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    Seed defaults
                </button>
            </div>

            {tab === 'content' ? (
                <div className="space-y-6">
                    {/* Content section sub-tabs */}
                    <div className="flex flex-wrap gap-2 font-mono text-xs">
                        {CONTENT_TABS.map((t) => (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setContentTab(t.id)}
                                className={`rounded-full px-4 py-2 uppercase tracking-wider transition-colors ${
                                    contentTab === t.id
                                        ? 'border border-cyan-400/40 bg-cyan-500/15 text-cyan-200'
                                        : 'border border-white/10 bg-white/[0.02] text-slate-400 hover:bg-white/5'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Keep each manager mounted only when active so it (re)fetches fresh data. */}
                    {contentTab === 'skills' && <SkillsManager notify={notify} />}
                    {contentTab === 'recommendations' && (
                        <CardListManager
                            endpoint="/api/ai/recommendations"
                            dataKey="cards"
                            itemKey="recommendation"
                            fields={RECOMMENDATION_FIELDS}
                            titleField="name"
                            blank={() => ({ name: '', url: '', rating: 5, accent: 'var(--accent-cyan)', blurb: '', tags: [] })}
                            notify={notify}
                        />
                    )}
                    {contentTab === 'credits' && (
                        <CardListManager
                            endpoint="/api/ai/credits"
                            dataKey="rows"
                            itemKey="credit"
                            fields={CREDIT_FIELDS}
                            titleField="name"
                            blank={() => ({ name: '', offer: '', url: '', noCard: true, freeApi: true, note: '' })}
                            notify={notify}
                        />
                    )}
                    {contentTab === 'prompts' && (
                        <CardListManager
                            endpoint="/api/ai/prompts"
                            dataKey="items"
                            itemKey="prompt"
                            fields={PROMPT_FIELDS}
                            titleField="title"
                            blank={() => ({ title: '', role: '', prompt: '' })}
                            notify={notify}
                        />
                    )}
                </div>
            ) : (
                <LayoutManager notify={notify} />
            )}

            <Toast notification={notification} />
        </div>
    );
}

function TopTab({ label, active, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                active ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
        >
            {label}
        </button>
    );
}
