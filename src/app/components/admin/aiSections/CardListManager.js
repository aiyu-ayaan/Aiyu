"use client";

import React, { useEffect, useState } from 'react';
import { Loader2, Plus, ChevronDown, ChevronRight, Trash2, Save } from 'lucide-react';
import {
    Field, TextInput, TextArea, NumberInput, SwitchRow, AccentPicker, StringListEditor,
} from '../aiPage/fields';
import { getJson, postJson, putJson, del } from './api';

/**
 * Generic CRUD manager for a flat AI-section collection (recommendations,
 * credits, prompts). Driven by a `fields` schema; each card is an inline editor
 * that persists live to the section's REST endpoint. Skills has its own nested
 * manager.
 *
 * Props:
 *   endpoint  — collection URL (GET list, POST create); item URL is `${endpoint}/${id}`
 *   dataKey   — key holding the array in the GET response ('cards'|'rows'|'items')
 *   itemKey   — key holding the row in a write response ('recommendation'|'credit'|'prompt')
 *   fields    — [{ name, label, type, ...}] where type ∈ text|textarea|number|switch|accent|tags
 *   titleField— field used as the card heading
 *   blank     — factory returning a new empty item
 *   notify    — (ok:boolean, message:string) => void
 */
export default function CardListManager({ endpoint, dataKey, itemKey, fields, titleField, blank, notify }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [draft, setDraft] = useState(null); // new-item form or null

    useEffect(() => {
        let alive = true;
        getJson(endpoint)
            .then((res) => alive && setItems(Array.isArray(res?.[dataKey]) ? res[dataKey] : []))
            .catch((e) => alive && notify?.(false, e.message))
            .finally(() => alive && setLoading(false));
        return () => {
            alive = false;
        };
    }, [endpoint, dataKey]);

    const onSaveExisting = async (id, form) => {
        const res = await putJson(`${endpoint}/${id}`, form);
        setItems((prev) => prev.map((it) => (it.id === id ? res[itemKey] : it)));
        notify?.(true, 'Saved.');
    };

    const onDelete = async (id) => {
        await del(`${endpoint}/${id}`);
        setItems((prev) => prev.filter((it) => it.id !== id));
        notify?.(true, 'Deleted.');
    };

    const onCreate = async (form) => {
        const res = await postJson(endpoint, form);
        setItems((prev) => [...prev, res[itemKey]]);
        setDraft(null);
        notify?.(true, 'Added.');
    };

    if (loading) {
        return (
            <div className="flex items-center gap-3 py-10 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading…
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {items.length === 0 && !draft && (
                <p className="rounded-xl border border-dashed border-white/10 py-8 text-center font-mono text-xs text-slate-500">
                    No entries yet — add one below.
                </p>
            )}

            {items.map((item) => (
                <ItemCard
                    key={item.id}
                    item={item}
                    fields={fields}
                    titleField={titleField}
                    onSave={(form) => onSaveExisting(item.id, form)}
                    onDelete={() => onDelete(item.id)}
                    notify={notify}
                />
            ))}

            {draft ? (
                <ItemCard
                    isNew
                    startOpen
                    item={draft}
                    fields={fields}
                    titleField={titleField}
                    onSave={onCreate}
                    onCancel={() => setDraft(null)}
                    notify={notify}
                />
            ) : (
                <button
                    type="button"
                    onClick={() => setDraft(blank())}
                    className="flex items-center gap-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 font-mono text-xs uppercase tracking-wider text-cyan-400 transition-colors hover:bg-cyan-500/20"
                >
                    <Plus className="h-3.5 w-3.5" /> Add
                </button>
            )}
        </div>
    );
}

function ItemCard({ item, fields, titleField, onSave, onDelete, onCancel, notify, isNew = false, startOpen = false }) {
    const [open, setOpen] = useState(startOpen);
    const [form, setForm] = useState(item);
    const [busy, setBusy] = useState(false);

    const set = (name, value) => setForm((f) => ({ ...f, [name]: value }));

    const save = async () => {
        setBusy(true);
        try {
            await onSave(form);
            if (!isNew) setOpen(false);
        } catch (e) {
            notify?.(false, e.message);
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        if (!confirm('Delete this entry?')) return;
        setBusy(true);
        try {
            await onDelete();
        } catch (e) {
            notify?.(false, e.message);
            setBusy(false);
        }
    };

    const heading = form[titleField] || (isNew ? 'New entry' : 'Untitled');

    return (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-3 p-4">
                <button type="button" onClick={() => setOpen((v) => !v)} className="flex flex-1 items-center gap-3 text-left">
                    {open ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
                    <span className="text-sm font-semibold text-white">{heading}</span>
                </button>
                {!isNew && (
                    <button
                        type="button"
                        onClick={remove}
                        disabled={busy}
                        className="rounded-md p-2 text-slate-600 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                        title="Delete"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                )}
            </div>

            {open && (
                <div className="space-y-4 border-t border-white/5 p-5">
                    {fields.map((field) => (
                        <Field key={field.name} label={field.label} hint={field.hint}>
                            <FieldInput field={field} value={form[field.name]} onChange={(v) => set(field.name, v)} />
                        </Field>
                    ))}
                    <div className="flex items-center gap-3 pt-1">
                        <button
                            type="button"
                            onClick={save}
                            disabled={busy}
                            className="flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/15 px-4 py-2 font-mono text-xs uppercase tracking-wider text-cyan-300 transition-colors hover:bg-cyan-500/25 disabled:opacity-50"
                        >
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {isNew ? 'Create' : 'Save'}
                        </button>
                        {isNew && (
                            <button
                                type="button"
                                onClick={onCancel}
                                className="rounded-lg border border-white/10 px-4 py-2 font-mono text-xs uppercase tracking-wider text-slate-400 transition-colors hover:bg-white/5"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function FieldInput({ field, value, onChange }) {
    switch (field.type) {
        case 'textarea':
            return <TextArea value={value} rows={field.rows || 4} placeholder={field.placeholder} onChange={onChange} />;
        case 'number':
            return <NumberInput value={Number(value)} min={field.min ?? 0} max={field.max ?? 100} onChange={onChange} />;
        case 'switch':
            return <SwitchRow label={field.switchLabel || field.label} checked={!!value} onChange={onChange} />;
        case 'accent':
            return <AccentPicker value={value} onChange={onChange} />;
        case 'tags':
            return <StringListEditor items={value} onChange={onChange} placeholder={field.placeholder || 'tag'} />;
        default:
            return <TextInput value={value} placeholder={field.placeholder} onChange={onChange} />;
    }
}
