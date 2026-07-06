"use client";

import React from 'react';
import {
    Field,
    TextInput,
    TextArea,
    NumberInput,
    SwitchRow,
    AccentPicker,
    StringListEditor,
    RemoveButton,
    AddButton,
    newId,
} from './fields';

/**
 * Type-specific body editor for an AI Hub section. Receives the section's
 * `data` object and an `onChange(nextData)` callback. Common fields (title,
 * subtitle, eyebrow, accent, enabled) are edited by the parent shell — this
 * only handles the payload unique to each section type.
 */
export default function SectionBodyEditor({ type, data, onChange }) {
    const set = (patch) => onChange({ ...(data || {}), ...patch });

    switch (type) {
        case 'hero':
            return (
                <Field label="Capability tags">
                    <StringListEditor
                        items={data?.tags}
                        onChange={(tags) => set({ tags })}
                        placeholder="e.g. RAG Pipelines"
                    />
                </Field>
            );

        case 'skills':
            return <SkillsEditor data={data} set={set} />;

        case 'recommendations':
            return <RecommendationsEditor data={data} set={set} />;

        case 'credits':
            return <CreditsEditor data={data} set={set} />;

        case 'stats':
            return (
                <div className="space-y-3">
                    <Field label="Footnote" hint="Metrics themselves come live from AiLog — no manual numbers.">
                        <TextInput value={data?.note} onChange={(note) => set({ note })} />
                    </Field>
                </div>
            );

        case 'prompts':
            return <PromptsEditor data={data} set={set} />;

        default:
            return <p className="font-mono text-xs text-slate-500">No editor for type “{type}”.</p>;
    }
}

// ── nested-item wrapper ─────────────────────────────────────────────
function ItemCard({ title, onRemove, children }) {
    return (
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="mb-3 flex items-center justify-between">
                <span className="font-mono text-[0.7rem] uppercase tracking-wider text-slate-500">{title}</span>
                <RemoveButton onClick={onRemove} />
            </div>
            <div className="space-y-3">{children}</div>
        </div>
    );
}

// ── skills ──────────────────────────────────────────────────────────
function SkillsEditor({ data, set }) {
    const categories = Array.isArray(data?.categories) ? data.categories : [];
    const setCats = (categories) => set({ categories });
    const updateCat = (i, patch) => setCats(categories.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

    return (
        <div className="space-y-4">
            {categories.map((cat, i) => (
                <ItemCard
                    key={cat.id || i}
                    title={`Category · ${cat.label || 'untitled'}`}
                    onRemove={() => setCats(categories.filter((_, idx) => idx !== i))}
                >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Field label="Label">
                            <TextInput value={cat.label} onChange={(label) => updateCat(i, { label })} />
                        </Field>
                        <Field label="Accent">
                            <AccentPicker value={cat.accent} onChange={(accent) => updateCat(i, { accent })} />
                        </Field>
                    </div>
                    <Field label="Skills" hint="Each skill shows as a name with a short description.">
                        <SkillItems items={cat.items} onChange={(items) => updateCat(i, { items })} />
                    </Field>
                </ItemCard>
            ))}
            <AddButton
                label="Add category"
                onClick={() =>
                    setCats([...categories, { id: newId('cat'), label: 'New category', accent: 'var(--accent-cyan)', items: [] }])
                }
            />
        </div>
    );
}

function SkillItems({ items, onChange }) {
    const list = Array.isArray(items) ? items : [];
    const update = (i, patch) => onChange(list.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
    return (
        <div className="space-y-2">
            {list.map((item, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg border border-white/5 bg-black/20 p-2">
                    <div className="flex-1 space-y-2">
                        <TextInput value={item.name} onChange={(name) => update(i, { name })} placeholder="Skill name" />
                        <TextArea
                            value={item.description}
                            rows={2}
                            onChange={(description) => update(i, { description })}
                            placeholder="What this skill does…"
                        />
                    </div>
                    <RemoveButton onClick={() => onChange(list.filter((_, idx) => idx !== i))} />
                </div>
            ))}
            <AddButton label="Add skill" onClick={() => onChange([...list, { name: '', description: '' }])} />
        </div>
    );
}

// ── recommendations ─────────────────────────────────────────────────
function RecommendationsEditor({ data, set }) {
    const cards = Array.isArray(data?.cards) ? data.cards : [];
    const setCards = (cards) => set({ cards });
    const update = (i, patch) => setCards(cards.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

    return (
        <div className="space-y-4">
            {cards.map((card, i) => (
                <ItemCard
                    key={card.id || i}
                    title={`Tool · ${card.name || 'untitled'}`}
                    onRemove={() => setCards(cards.filter((_, idx) => idx !== i))}
                >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Field label="Name">
                            <TextInput value={card.name} onChange={(name) => update(i, { name })} />
                        </Field>
                        <Field label="URL">
                            <TextInput value={card.url} onChange={(url) => update(i, { url })} placeholder="https://" />
                        </Field>
                        <Field label="Rating (0–5)">
                            <NumberInput value={Number(card.rating)} min={0} max={5} onChange={(rating) => update(i, { rating })} />
                        </Field>
                        <Field label="Accent">
                            <AccentPicker value={card.accent} onChange={(accent) => update(i, { accent })} />
                        </Field>
                    </div>
                    <Field label="Why I recommend it">
                        <TextArea value={card.blurb} rows={3} onChange={(blurb) => update(i, { blurb })} />
                    </Field>
                    <Field label="Tags">
                        <StringListEditor items={card.tags} onChange={(tags) => update(i, { tags })} placeholder="e.g. low-latency" />
                    </Field>
                </ItemCard>
            ))}
            <AddButton
                label="Add tool"
                onClick={() =>
                    setCards([...cards, { id: newId('rec'), name: 'New tool', url: '', rating: 4, accent: 'var(--accent-cyan)', blurb: '', tags: [] }])
                }
            />
        </div>
    );
}

// ── credits ─────────────────────────────────────────────────────────
function CreditsEditor({ data, set }) {
    const rows = Array.isArray(data?.rows) ? data.rows : [];
    const setRows = (rows) => set({ rows });
    const update = (i, patch) => setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

    return (
        <div className="space-y-4">
            {rows.map((row, i) => (
                <ItemCard
                    key={row.id || i}
                    title={`Provider · ${row.name || 'untitled'}`}
                    onRemove={() => setRows(rows.filter((_, idx) => idx !== i))}
                >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Field label="Name">
                            <TextInput value={row.name} onChange={(name) => update(i, { name })} />
                        </Field>
                        <Field label="URL">
                            <TextInput value={row.url} onChange={(url) => update(i, { url })} placeholder="https://" />
                        </Field>
                    </div>
                    <Field label="Offer">
                        <TextInput value={row.offer} onChange={(offer) => update(i, { offer })} />
                    </Field>
                    <Field label="Note">
                        <TextInput value={row.note} onChange={(note) => update(i, { note })} />
                    </Field>
                    <div className="flex flex-wrap gap-5 pt-1">
                        <SwitchRow label="free API" checked={!!row.freeApi} onChange={(freeApi) => update(i, { freeApi })} />
                        <SwitchRow label="no card" checked={!!row.noCard} onChange={(noCard) => update(i, { noCard })} />
                    </div>
                </ItemCard>
            ))}
            <AddButton
                label="Add provider"
                onClick={() =>
                    setRows([...rows, { id: newId('credit'), name: 'New provider', offer: '', url: '', note: '', freeApi: true, noCard: true }])
                }
            />
        </div>
    );
}

// ── prompts ─────────────────────────────────────────────────────────
function PromptsEditor({ data, set }) {
    const items = Array.isArray(data?.items) ? data.items : [];
    const setItems = (items) => set({ items });
    const update = (i, patch) => setItems(items.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

    return (
        <div className="space-y-4">
            {items.map((item, i) => (
                <ItemCard
                    key={item.id || i}
                    title={`Prompt · ${item.title || 'untitled'}`}
                    onRemove={() => setItems(items.filter((_, idx) => idx !== i))}
                >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Field label="Title">
                            <TextInput value={item.title} onChange={(title) => update(i, { title })} />
                        </Field>
                        <Field label="Role / tag">
                            <TextInput value={item.role} onChange={(role) => update(i, { role })} />
                        </Field>
                    </div>
                    <Field label="Prompt">
                        <TextArea value={item.prompt} rows={5} onChange={(prompt) => update(i, { prompt })} />
                    </Field>
                </ItemCard>
            ))}
            <AddButton
                label="Add prompt"
                onClick={() => setItems([...items, { id: newId('prompt'), title: 'New prompt', role: '', prompt: '' }])}
            />
        </div>
    );
}
