"use client";

import React, { useEffect, useState } from 'react';
import {
    FaChevronDown,
    FaChevronRight,
    FaFloppyDisk,
    FaPlus,
    FaSpinner,
    FaTrash,
} from 'react-icons/fa6';
import {
    Field, TextInput, TextArea, NumberInput, SwitchRow, AccentPicker, StringListEditor,
} from '../aiPage/fields';
import { getJson, postJson, putJson, del } from './api';
import { useAdminFeedback } from '@/app/components/admin/feedback/AdminFeedbackProvider';
import { Badge, EmptyState, Loading, Panel } from '@/app/components/admin/ui';

/**
 * Generic CRUD manager for a flat AI-section collection (recommendations,
 * credits, prompts). Driven by a `fields` schema; each card is an inline editor
 * that persists live to the section's REST endpoint. Skills has its own nested
 * manager.
 */
export default function CardListManager({ endpoint, dataKey, itemKey, fields, titleField, blank, notify }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [draft, setDraft] = useState(null);

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
        notify?.(true, 'Entry saved');
    };

    const onDelete = async (id) => {
        await del(`${endpoint}/${id}`);
        setItems((prev) => prev.filter((it) => it.id !== id));
        notify?.(true, 'Entry deleted');
    };

    const onCreate = async (form) => {
        const res = await postJson(endpoint, form);
        setItems((prev) => [res[itemKey], ...prev]);
        setDraft(null);
        notify?.(true, 'Entry created');
    };

    if (loading) {
        return <Panel><Loading label="Loading entries" rows={4} /></Panel>;
    }

    return (
        <Panel
            title={`Entries (${items.length})`}
            actions={
                !draft ? (
                    <button
                        type="button"
                        onClick={() => setDraft(blank())}
                        className="adm-btn adm-btn-primary"
                    >
                        <FaPlus aria-hidden="true" /> Add entry
                    </button>
                ) : null
            }
        >
            <div className="space-y-3">
                {draft && (
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
                )}

                {items.length === 0 && !draft && (
                    <EmptyState
                        title="No entries yet"
                        description="Add the first entry to publish it on the /ai page."
                        action={
                            <button
                                type="button"
                                onClick={() => setDraft(blank())}
                                className="adm-btn"
                            >
                                <FaPlus aria-hidden="true" /> Add first entry
                            </button>
                        }
                    />
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
            </div>
        </Panel>
    );
}

function ItemCard({ item, fields, titleField, onSave, onDelete, onCancel, notify, isNew = false, startOpen = false }) {
    const { confirm } = useAdminFeedback();
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
        if (!(await confirm({
            title: 'Delete entry?',
            message: 'Delete this entry?',
            confirmText: 'Delete',
            danger: true,
        }))) return;
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
        <div className="adm-sc-item">
            <div className="adm-sc-item-head">
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    aria-expanded={open}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                >
                    {open ? (
                        <FaChevronDown className="shrink-0 text-xs text-[var(--text-secondary)]" aria-hidden="true" />
                    ) : (
                        <FaChevronRight className="shrink-0 text-xs text-[var(--text-secondary)]" aria-hidden="true" />
                    )}
                    <span className="truncate text-sm font-semibold text-[var(--text-bright)]">{heading}</span>
                    {isNew && <Badge tone="info">Draft</Badge>}
                </button>
                {!isNew && (
                    <button
                        type="button"
                        onClick={remove}
                        disabled={busy}
                        className="adm-icon-btn"
                        title="Delete entry"
                        aria-label={`Delete ${heading}`}
                    >
                        <FaTrash aria-hidden="true" />
                    </button>
                )}
            </div>

            {open && (
                <div className="adm-sc-item-body">
                    <div className="adm-sc-fields">
                        {fields.map((field) => {
                            const fullSpan = field.type === 'textarea' || field.type === 'tags';
                            return (
                                <div key={field.name} className={fullSpan ? 'col-span-full' : ''}>
                                    <Field label={field.label} hint={field.hint}>
                                        <FieldInput field={field} value={form[field.name]} onChange={(v) => set(field.name, v)} />
                                    </Field>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                            type="button"
                            onClick={save}
                            disabled={busy}
                            className="adm-btn adm-btn-primary"
                        >
                            {busy ? <FaSpinner className="animate-spin" aria-hidden="true" /> : <FaFloppyDisk aria-hidden="true" />}
                            {isNew ? 'Create entry' : 'Save changes'}
                        </button>
                        {isNew && (
                            <button
                                type="button"
                                onClick={onCancel}
                                className="adm-btn"
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
            return <StringListEditor items={value} onChange={onChange} placeholder={field.placeholder || 'Tag'} />;
        default:
            return <TextInput value={value} placeholder={field.placeholder} onChange={onChange} />;
    }
}
