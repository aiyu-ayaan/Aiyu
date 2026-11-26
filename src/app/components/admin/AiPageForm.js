"use client";

import React, { useState } from 'react';
import { FaSpinner, FaWandMagicSparkles } from 'react-icons/fa6';
import { postJson } from './aiSections/api';
import SkillsManager from './aiSections/SkillsManager';
import CardListManager from './aiSections/CardListManager';
import LayoutManager from './aiSections/LayoutManager';
import { useAdminFeedback } from '@/app/components/admin/feedback/AdminFeedbackProvider';
import '@/app/styles/admin-showcase.css';

const CONTENT_TABS = [
    { id: 'skills', label: 'Skills' },
    { id: 'recommendations', label: 'Recommendations' },
    { id: 'credits', label: 'Free credits' },
    { id: 'prompts', label: 'Prompt library' },
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
    { name: 'url', label: 'URL', type: 'text', placeholder: 'https://' },
    { name: 'offer', label: 'Offer', type: 'textarea', rows: 2 },
    { name: 'note', label: 'Note', type: 'text' },
    { name: 'freeApi', label: 'Free API key', type: 'switch' },
    { name: 'noCard', label: 'No credit card', type: 'switch' },
];

const PROMPT_FIELDS = [
    { name: 'title', label: 'Title', type: 'text', placeholder: 'e.g. TypeScript Agent Developer' },
    { name: 'role', label: 'Role or tag', type: 'text', placeholder: 'e.g. Engineering' },
    { name: 'prompt', label: 'Prompt', type: 'textarea', rows: 6 },
];

export default function AiPageForm() {
    const { confirm, toast } = useAdminFeedback();
    const [tab, setTab] = useState('content');
    const [contentTab, setContentTab] = useState('skills');
    const [seeding, setSeeding] = useState(false);

    const notify = (success, message) => {
        if (success) toast.success(message);
        else toast.error(message);
    };

    const seedDefaults = async () => {
        if (!(await confirm({
            title: 'Seed default sections?',
            message: 'Seed the four sections with the bundled defaults? This only fills sections that are currently empty.',
            confirmText: 'Seed',
        }))) return;
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
        <div className="adm-sc-root space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--hairline)]">
                <div className="adm-tabs adm-sc-tabs border-b-0" role="tablist" aria-label="AI hub workspace">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={tab === 'content'}
                        onClick={() => setTab('content')}
                        className="adm-tab"
                    >
                        Content
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={tab === 'layout'}
                        onClick={() => setTab('layout')}
                        className="adm-tab"
                    >
                        Layout
                    </button>
                </div>

                <button
                    type="button"
                    onClick={seedDefaults}
                    disabled={seeding}
                    className="adm-btn mb-2"
                    title="One-time backfill of empty sections from the bundled defaults"
                >
                    {seeding ? <FaSpinner className="animate-spin" aria-hidden="true" /> : <FaWandMagicSparkles aria-hidden="true" />}
                    Seed defaults
                </button>
            </div>

            {tab === 'content' ? (
                <div className="space-y-6">
                    <div className="adm-tabs adm-sc-tabs" role="tablist" aria-label="Content sections">
                        {CONTENT_TABS.map((t) => (
                            <button
                                key={t.id}
                                type="button"
                                role="tab"
                                aria-selected={contentTab === t.id}
                                onClick={() => setContentTab(t.id)}
                                className="adm-tab"
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

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
        </div>
    );
}
