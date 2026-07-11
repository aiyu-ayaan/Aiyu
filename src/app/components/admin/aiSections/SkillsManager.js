"use client";

import React, { useEffect, useState } from 'react';
import { Loader2, Plus, ChevronDown, ChevronRight, Trash2, Save } from 'lucide-react';
import { Field, TextInput, TextArea, AccentPicker } from '../aiPage/fields';
import { getJson, postJson, putJson, del } from './api';
import { useAdminFeedback } from '@/app/components/admin/feedback/AdminFeedbackProvider';

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
        setCategories((prev) => [...prev, { ...res.category, skills: [] }]);
        setDraftCat(null);
        notify?.(true, 'Category added.');
    };

    const saveCategory = async (id, form) => {
        const res = await putJson(`/api/ai/skills/categories/${id}`, form);
        patchCat(id, { label: res.category.label, accent: res.category.accent });
        notify?.(true, 'Category saved.');
    };

    const deleteCategory = async (id) => {
        await del(`/api/ai/skills/categories/${id}`);
        setCategories((prev) => prev.filter((c) => c._id !== id));
        notify?.(true, 'Category deleted.');
    };

    const addSkill = async (categoryId, form) => {
        const res = await postJson('/api/ai/skills/items', { ...form, categoryId });
        setCategories((prev) => prev.map((c) => (c._id === categoryId ? { ...c, skills: [...(c.skills || []), res.skill] } : c)));
        notify?.(true, 'Skill added.');
    };

    const saveSkill = async (categoryId, skillId, form) => {
        const res = await putJson(`/api/ai/skills/items/${skillId}`, form);
        setCategories((prev) =>
            prev.map((c) =>
                c._id === categoryId ? { ...c, skills: c.skills.map((s) => (s._id === skillId ? res.skill : s)) } : c
            )
        );
        notify?.(true, 'Skill saved.');
    };

    const deleteSkill = async (categoryId, skillId) => {
        await del(`/api/ai/skills/items/${skillId}`);
        setCategories((prev) =>
            prev.map((c) => (c._id === categoryId ? { ...c, skills: c.skills.filter((s) => s._id !== skillId) } : c))
        );
        notify?.(true, 'Skill deleted.');
    };

    if (loading) {
        return (
            <div className="flex items-center gap-3 py-10 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading skills…
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {categories.length === 0 && !draftCat && (
                <p className="rounded-xl border border-dashed border-white/10 py-8 text-center font-mono text-xs text-slate-500">
                    No categories yet — add one to start.
                </p>
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

            {draftCat ? (
                <CategoryHeaderForm
                    isNew
                    value={draftCat}
                    onSave={createCategory}
                    onCancel={() => setDraftCat(null)}
                    notify={notify}
                />
            ) : (
                <button
                    type="button"
                    onClick={() => setDraftCat({ label: '', accent: 'var(--accent-cyan)' })}
                    className="flex items-center gap-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 font-mono text-xs uppercase tracking-wider text-cyan-400 transition-colors hover:bg-cyan-500/20"
                >
                    <Plus className="h-3.5 w-3.5" /> Add category
                </button>
            )}
        </div>
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
        <div className="rounded-2xl border border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-3 p-4">
                <button type="button" onClick={() => setOpen((v) => !v)} className="flex flex-1 items-center gap-3 text-left">
                    {open ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
                    <span className="h-3 w-3 rounded-full" style={{ background: category.accent }} aria-hidden="true" />
                    <span className="text-sm font-semibold text-white">{category.label || 'Untitled category'}</span>
                    <span className="font-mono text-[0.65rem] text-slate-500">{skills.length} skills</span>
                </button>
                <button
                    type="button"
                    onClick={remove}
                    className="rounded-md p-2 text-slate-600 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    title="Delete category"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            </div>

            {open && (
                <div className="space-y-4 border-t border-white/5 p-5">
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
                        <button
                            type="button"
                            onClick={() => setEditHeader(true)}
                            className="font-mono text-[0.7rem] uppercase tracking-wider text-slate-400 underline-offset-2 hover:text-cyan-300 hover:underline"
                        >
                            Edit category label / accent
                        </button>
                    )}

                    <div className="space-y-2.5">
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

                    {draftSkill ? (
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
                    ) : (
                        <button
                            type="button"
                            onClick={() => setDraftSkill({ name: '', description: '', url: '' })}
                            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-slate-300 transition-colors hover:bg-white/5"
                        >
                            <Plus className="h-3.5 w-3.5" /> Add skill
                        </button>
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
        <div className="grid grid-cols-1 gap-4 rounded-xl border border-white/10 bg-black/20 p-4 sm:grid-cols-2">
            <Field label="Category label">
                <TextInput value={form.label} placeholder="e.g. Motion & Animation" onChange={(label) => setForm((f) => ({ ...f, label }))} />
            </Field>
            <Field label="Accent">
                <AccentPicker value={form.accent} onChange={(accent) => setForm((f) => ({ ...f, accent }))} />
            </Field>
            <div className="flex items-center gap-3 sm:col-span-2">
                <SaveButton busy={busy} onClick={save} label={isNew ? 'Create category' : 'Save'} />
                <CancelButton onClick={onCancel} />
            </div>
        </div>
    );
}

function SkillRow({ skill, onSave, onDelete, notify }) {
    const { confirm } = useAdminFeedback();
    const [open, setOpen] = useState(false);
    return (
        <div className="rounded-lg border border-white/5 bg-black/20">
            <div className="flex items-center gap-2 px-3 py-2.5">
                <button type="button" onClick={() => setOpen((v) => !v)} className="flex-1 text-left text-sm text-slate-200">
                    {skill.name || 'Untitled skill'}
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
                    className="rounded p-1.5 text-slate-600 hover:bg-red-500/10 hover:text-red-400"
                    title="Delete skill"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </button>
            </div>
            {open && (
                <div className="border-t border-white/5 p-3">
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
            <Field label="Name">
                <TextInput value={form.name} placeholder="e.g. GSAP Core" onChange={(v) => set('name', v)} />
            </Field>
            <Field label="Description">
                <TextArea value={form.description} rows={2} onChange={(v) => set('description', v)} />
            </Field>
            <Field label="URL (optional)" hint="When set, the skill name links out on the public page.">
                <TextInput value={form.url} placeholder="https://…" onChange={(v) => set('url', v)} />
            </Field>
            <div className="flex items-center gap-3">
                <SaveButton busy={busy} onClick={save} label={isNew ? 'Add skill' : 'Save'} />
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
            className="flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/15 px-4 py-2 font-mono text-xs uppercase tracking-wider text-cyan-300 transition-colors hover:bg-cyan-500/25 disabled:opacity-50"
        >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {label}
        </button>
    );
}

function CancelButton({ onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="rounded-lg border border-white/10 px-4 py-2 font-mono text-xs uppercase tracking-wider text-slate-400 transition-colors hover:bg-white/5"
        >
            Cancel
        </button>
    );
}
