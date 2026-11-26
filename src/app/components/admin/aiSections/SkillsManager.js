"use client";

import React, { useEffect, useState } from 'react';
import {
    FaChevronDown,
    FaChevronRight,
    FaFloppyDisk,
    FaPen,
    FaPlus,
    FaSpinner,
    FaTrash,
} from 'react-icons/fa6';
import { Field, TextInput, TextArea, AccentPicker } from '../aiPage/fields';
import { getJson, postJson, putJson, del } from './api';
import { useAdminFeedback } from '@/app/components/admin/feedback/AdminFeedbackProvider';
import { Badge, EmptyState, Loading, Panel } from '@/app/components/admin/ui';

/**
 * Skills manager — nested categories → skills. Each category is a card with an
 * editable header (label + accent) and a list of skill rows; every mutation
 * persists live to /api/ai/skills/*. Rows are client-shaped (`_id`).
 */
export default function SkillsManager({ notify }) {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [draftCat, setDraftCat] = useState(null);

    useEffect(() => {
        let alive = true;
        getJson('/api/ai/skills/categories')
            .then((res) => alive && setCategories(Array.isArray(res?.categories) ? res.categories : []))
            .catch((e) => alive && notify?.(false, e.message))
            .finally(() => alive && setLoading(false));
        return () => {
            alive = false;
        };
    }, []);

    const patchCat = (id, next) => setCategories((prev) => prev.map((c) => (c._id === id ? { ...c, ...next } : c)));

    const createCategory = async (form) => {
        const res = await postJson('/api/ai/skills/categories', form);
        setCategories((prev) => [{ ...res.category, skills: [] }, ...prev]);
        setDraftCat(null);
        notify?.(true, 'Category added');
    };

    const saveCategory = async (id, form) => {
        const res = await putJson(`/api/ai/skills/categories/${id}`, form);
        patchCat(id, { label: res.category.label, accent: res.category.accent });
        notify?.(true, 'Category saved');
    };

    const deleteCategory = async (id) => {
        await del(`/api/ai/skills/categories/${id}`);
        setCategories((prev) => prev.filter((c) => c._id !== id));
        notify?.(true, 'Category deleted');
    };

    const addSkill = async (categoryId, form) => {
        const res = await postJson('/api/ai/skills/items', { ...form, categoryId });
        setCategories((prev) => prev.map((c) => (c._id === categoryId ? { ...c, skills: [res.skill, ...(c.skills || [])] } : c)));
        notify?.(true, 'Skill added');
    };

    const saveSkill = async (categoryId, skillId, form) => {
        const res = await putJson(`/api/ai/skills/items/${skillId}`, form);
        setCategories((prev) =>
            prev.map((c) =>
                c._id === categoryId ? { ...c, skills: c.skills.map((s) => (s._id === skillId ? res.skill : s)) } : c
            )
        );
        notify?.(true, 'Skill saved');
    };

    const deleteSkill = async (categoryId, skillId) => {
        await del(`/api/ai/skills/items/${skillId}`);
        setCategories((prev) =>
            prev.map((c) => (c._id === categoryId ? { ...c, skills: c.skills.filter((s) => s._id !== skillId) } : c))
        );
        notify?.(true, 'Skill deleted');
    };

    if (loading) {
        return <Panel><Loading label="Loading skills" rows={4} /></Panel>;
    }

    return (
        <Panel
            title={`Skill categories (${categories.length})`}
            actions={
                !draftCat ? (
                    <button
                        type="button"
                        onClick={() => setDraftCat({ label: '', accent: 'var(--accent-cyan)' })}
                        className="adm-btn adm-btn-primary"
                    >
                        <FaPlus aria-hidden="true" /> Add category
                    </button>
                ) : null
            }
        >
            <div className="space-y-3">
                {draftCat && (
                    <CategoryHeaderForm
                        isNew
                        value={draftCat}
                        onSave={createCategory}
                        onCancel={() => setDraftCat(null)}
                        notify={notify}
                    />
                )}

                {categories.length === 0 && !draftCat && (
                    <EmptyState
                        title="No skill categories yet"
                        description="Create a category first, then add individual skills under it."
                        action={
                            <button
                                type="button"
                                onClick={() => setDraftCat({ label: '', accent: 'var(--accent-cyan)' })}
                                className="adm-btn"
                            >
                                <FaPlus aria-hidden="true" /> Add first category
                            </button>
                        }
                    />
                )}

                {categories.map((cat) => (
                    <CategoryCard
                        key={cat._id}
                        category={cat}
                        onSave={(form) => saveCategory(cat._id, form)}
                        onDelete={() => deleteCategory(cat._id)}
                        onAddSkill={(form) => addSkill(cat._id, form)}
                        onSaveSkill={(sid, form) => saveSkill(cat._id, sid, form)}
                        onDeleteSkill={(sid) => deleteSkill(cat._id, sid)}
                        notify={notify}
                    />
                ))}
            </div>
        </Panel>
    );
}

function CategoryCard({ category, onSave, onDelete, onAddSkill, onSaveSkill, onDeleteSkill, notify }) {
    const { confirm } = useAdminFeedback();
    const [open, setOpen] = useState(false);
    const [editHeader, setEditHeader] = useState(false);
    const [draftSkill, setDraftSkill] = useState(null);
    const skills = category.skills || [];

    const remove = async () => {
        if (!(await confirm({
            title: 'Delete category?',
            message: `Delete category "${category.label}" and its ${skills.length} skill(s)?`,
            confirmText: 'Delete',
            danger: true,
        }))) return;
        try {
            await onDelete();
        } catch (e) {
            notify?.(false, e.message);
        }
    };

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
                    <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ background: category.accent || 'var(--accent-cyan)' }}
                        aria-hidden="true"
                    />
                    <span className="truncate text-sm font-semibold text-[var(--text-bright)]">
                        {category.label || 'Untitled category'}
                    </span>
                    <Badge>{skills.length} {skills.length === 1 ? 'skill' : 'skills'}</Badge>
                </button>
                <button
                    type="button"
                    onClick={remove}
                    className="adm-icon-btn"
                    title="Delete category"
                    aria-label={`Delete ${category.label || 'category'}`}
                >
                    <FaTrash aria-hidden="true" />
                </button>
            </div>

            {open && (
                <div className="adm-sc-item-body">
                    {editHeader ? (
                        <CategoryHeaderForm
                            value={{ label: category.label, accent: category.accent }}
                            onSave={async (form) => {
                                await onSave(form);
                                setEditHeader(false);
                            }}
                            onCancel={() => setEditHeader(false)}
                            notify={notify}
                        />
                    ) : (
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <button
                                type="button"
                                onClick={() => setEditHeader(true)}
                                className="adm-btn"
                            >
                                <FaPen aria-hidden="true" /> Edit category label &amp; accent
                            </button>
                            {!draftSkill && (
                                <button
                                    type="button"
                                    onClick={() => setDraftSkill({ name: '', description: '', url: '' })}
                                    className="adm-btn"
                                >
                                    <FaPlus aria-hidden="true" /> Add skill
                                </button>
                            )}
                        </div>
                    )}

                    {draftSkill && (
                        <div className="adm-sc-item p-3">
                            <SkillForm
                                isNew
                                value={draftSkill}
                                onSave={async (form) => {
                                    await onAddSkill(form);
                                    setDraftSkill(null);
                                }}
                                onCancel={() => setDraftSkill(null)}
                                notify={notify}
                            />
                        </div>
                    )}

                    {skills.length === 0 ? (
                        <p className="adm-help">No skills in this category yet.</p>
                    ) : (
                        <div className="space-y-2">
                            {skills.map((s) => (
                                <SkillRow
                                    key={s._id}
                                    skill={s}
                                    onSave={(form) => onSaveSkill(s._id, form)}
                                    onDelete={() => onDeleteSkill(s._id)}
                                    notify={notify}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function CategoryHeaderForm({ value, onSave, onCancel, isNew = false, notify }) {
    const [form, setForm] = useState(value);
    const [busy, setBusy] = useState(false);
    const save = async () => {
        setBusy(true);
        try {
            await onSave(form);
        } catch (e) {
            notify?.(false, e.message);
        } finally {
            setBusy(false);
        }
    };
    return (
        <div className="adm-sc-item p-4 space-y-4">
            <div className="adm-sc-fields">
                <Field label="Category label">
                    <TextInput value={form.label} placeholder="e.g. Motion & Animation" onChange={(label) => setForm((f) => ({ ...f, label }))} />
                </Field>
                <Field label="Accent">
                    <AccentPicker value={form.accent} onChange={(accent) => setForm((f) => ({ ...f, accent }))} />
                </Field>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <SaveButton busy={busy} onClick={save} label={isNew ? 'Create category' : 'Save category'} />
                <CancelButton onClick={onCancel} />
            </div>
        </div>
    );
}

function SkillRow({ skill, onSave, onDelete, notify }) {
    const { confirm } = useAdminFeedback();
    const [open, setOpen] = useState(false);
    return (
        <div className="adm-sc-item">
            <div className="adm-sc-item-head">
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    aria-expanded={open}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-medium text-[var(--text-primary)]"
                >
                    {open ? (
                        <FaChevronDown className="shrink-0 text-xs text-[var(--text-secondary)]" aria-hidden="true" />
                    ) : (
                        <FaChevronRight className="shrink-0 text-xs text-[var(--text-secondary)]" aria-hidden="true" />
                    )}
                    <span className="truncate">{skill.name || 'Untitled skill'}</span>
                </button>
                <button
                    type="button"
                    onClick={async () => {
                        if (await confirm({
                            title: 'Delete skill?',
                            message: 'Delete this skill?',
                            confirmText: 'Delete',
                            danger: true,
                        })) {
                            try { await onDelete(); } catch (e) { notify?.(false, e.message); }
                        }
                    }}
                    className="adm-icon-btn"
                    title="Delete skill"
                    aria-label={`Delete ${skill.name || 'skill'}`}
                >
                    <FaTrash aria-hidden="true" />
                </button>
            </div>
            {open && (
                <div className="adm-sc-item-body">
                    <SkillForm value={skill} onSave={async (form) => { await onSave(form); setOpen(false); }} notify={notify} />
                </div>
            )}
        </div>
    );
}

function SkillForm({ value, onSave, onCancel, isNew = false, notify }) {
    const [form, setForm] = useState({ name: value.name || '', description: value.description || '', url: value.url || '' });
    const [busy, setBusy] = useState(false);
    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    const save = async () => {
        setBusy(true);
        try {
            await onSave(form);
        } catch (e) {
            notify?.(false, e.message);
        } finally {
            setBusy(false);
        }
    };
    return (
        <div className="space-y-3">
            <div className="adm-sc-fields">
                <Field label="Name">
                    <TextInput value={form.name} placeholder="e.g. GSAP Core" onChange={(v) => set('name', v)} />
                </Field>
                <Field label="URL (optional)" hint="When set, the skill name links out on the public page.">
                    <TextInput value={form.url} placeholder="https://…" onChange={(v) => set('url', v)} />
                </Field>
            </div>
            <Field label="Description">
                <TextArea value={form.description} rows={2} onChange={(v) => set('description', v)} />
            </Field>
            <div className="flex flex-wrap items-center gap-2">
                <SaveButton busy={busy} onClick={save} label={isNew ? 'Add skill' : 'Save skill'} />
                {isNew && <CancelButton onClick={onCancel} />}
            </div>
        </div>
    );
}

function SaveButton({ busy, onClick, label }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={busy}
            className="adm-btn adm-btn-primary"
        >
            {busy ? <FaSpinner className="animate-spin" aria-hidden="true" /> : <FaFloppyDisk aria-hidden="true" />}
            {label}
        </button>
    );
}

function CancelButton({ onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="adm-btn"
        >
            Cancel
        </button>
    );
}
