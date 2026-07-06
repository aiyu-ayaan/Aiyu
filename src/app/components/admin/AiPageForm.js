"use client";

import React, { useEffect, useMemo, useState } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronDown, ChevronRight, Trash2, Loader2, Save, Plus, Eye, EyeOff } from 'lucide-react';
import Toast from './Toast';
import { Field, TextInput, TextArea, AccentPicker, newId } from './aiPage/fields';
import SectionBodyEditor from './aiPage/SectionBodyEditor';
import { DEFAULT_AI_PAGE, AI_SECTION_TYPES } from '@/lib/aiPageDefaults';

const TYPE_LABELS = {
    hero: 'Hero',
    skills: 'Skills',
    recommendations: 'Recommendations',
    credits: 'Free Credits',
    stats: 'Live Telemetry',
    prompts: 'Prompt Library',
};

/** Deep clone (structuredClone with JSON fallback for older runtimes). */
function clone(obj) {
    if (typeof structuredClone === 'function') return structuredClone(obj);
    return JSON.parse(JSON.stringify(obj));
}

export default function AiPageForm() {
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notification, setNotification] = useState(null);
    const [openId, setOpenId] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/ai-page');
                const data = await res.json();
                const loaded = Array.isArray(data?.sections) && data.sections.length
                    ? data.sections
                    : clone(DEFAULT_AI_PAGE.sections);
                // Guarantee every section has a stable id for dnd keys.
                setSections(loaded.map((s) => ({ ...s, id: s.id || newId('section') })));
            } catch {
                setSections(clone(DEFAULT_AI_PAGE.sections));
                setNotification({ success: false, message: 'Could not load config — showing defaults.' });
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const templatesByType = useMemo(() => {
        const map = {};
        for (const s of DEFAULT_AI_PAGE.sections) map[s.type] = s;
        return map;
    }, []);

    const updateSection = (id, patch) =>
        setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

    const updateSectionData = (id, data) =>
        setSections((prev) => prev.map((s) => (s.id === id ? { ...s, data } : s)));

    const removeSection = (id) => setSections((prev) => prev.filter((s) => s.id !== id));

    const addSection = (type) => {
        const template = templatesByType[type] || { type, enabled: true, title: TYPE_LABELS[type], data: {} };
        const next = { ...clone(template), id: newId(type), enabled: true };
        setSections((prev) => [...prev, next]);
        setOpenId(next.id);
    };

    const onDragEnd = (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        setSections((prev) => {
            const oldIndex = prev.findIndex((s) => s.id === active.id);
            const newIndex = prev.findIndex((s) => s.id === over.id);
            if (oldIndex === -1 || newIndex === -1) return prev;
            return arrayMove(prev, oldIndex, newIndex);
        });
    };

    const save = async () => {
        setSaving(true);
        setNotification(null);
        try {
            const res = await fetch('/api/ai-page', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sections }),
            });
            if (!res.ok) throw new Error('save failed');
            setNotification({ success: true, message: 'AI Hub saved.' });
        } catch {
            setNotification({ success: false, message: 'Save failed. Check your session and try again.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center gap-3 py-20 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading AI Hub config…
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="font-mono text-xs text-slate-500">
                    {sections.filter((s) => s.enabled !== false).length}/{sections.length} sections live · drag to reorder
                </p>
                <div className="flex items-center gap-3">
                    <AddSectionMenu onAdd={addSection} />
                    <button
                        type="button"
                        onClick={save}
                        disabled={saving}
                        className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/15 px-5 py-2.5 font-mono text-xs uppercase tracking-wider text-cyan-300 transition-colors hover:bg-cyan-500/25 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save
                    </button>
                </div>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3">
                        {sections.map((section) => (
                            <SortableSection
                                key={section.id}
                                section={section}
                                open={openId === section.id}
                                onToggleOpen={() => setOpenId(openId === section.id ? null : section.id)}
                                onChange={(patch) => updateSection(section.id, patch)}
                                onChangeData={(data) => updateSectionData(section.id, data)}
                                onRemove={() => removeSection(section.id)}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            <Toast notification={notification} />
        </div>
    );
}

function AddSectionMenu({ onAdd }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-slate-300 transition-colors hover:bg-white/10"
            >
                <Plus className="h-4 w-4" /> Add section
            </button>
            {open && (
                <div
                    className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-xl border border-white/10 bg-[#0b0f19] shadow-2xl"
                    onMouseLeave={() => setOpen(false)}
                >
                    {AI_SECTION_TYPES.map((type) => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => {
                                onAdd(type);
                                setOpen(false);
                            }}
                            className="block w-full px-4 py-2.5 text-left text-sm text-slate-300 transition-colors hover:bg-cyan-500/10 hover:text-cyan-300"
                        >
                            {TYPE_LABELS[type] || type}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function SortableSection({ section, open, onToggleOpen, onChange, onChangeData, onRemove }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };
    const enabled = section.enabled !== false;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`rounded-2xl border bg-white/[0.02] transition-colors ${
                enabled ? 'border-white/10' : 'border-white/5 opacity-60'
            }`}
        >
            <div className="flex items-center gap-3 p-4">
                <button
                    type="button"
                    {...attributes}
                    {...listeners}
                    className="cursor-grab touch-none text-slate-600 transition-colors hover:text-cyan-400 active:cursor-grabbing"
                    title="Reorder"
                >
                    <GripVertical className="h-5 w-5" />
                </button>

                <button type="button" onClick={onToggleOpen} className="flex flex-1 items-center gap-3 text-left">
                    {open ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
                    <span className="rounded-md bg-white/5 px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-wider text-slate-400">
                        {TYPE_LABELS[section.type] || section.type}
                    </span>
                    <span className="text-sm font-semibold text-white">{section.title || 'Untitled section'}</span>
                </button>

                <button
                    type="button"
                    onClick={() => onChange({ enabled: !enabled })}
                    className={`rounded-md p-2 transition-colors ${
                        enabled ? 'text-cyan-400 hover:bg-cyan-500/10' : 'text-slate-600 hover:bg-white/5'
                    }`}
                    title={enabled ? 'Enabled — click to hide' : 'Hidden — click to show'}
                >
                    {enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button
                    type="button"
                    onClick={onRemove}
                    className="rounded-md p-2 text-slate-600 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    title="Delete section"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            </div>

            {open && (
                <div className="space-y-5 border-t border-white/5 p-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field label="Eyebrow">
                            <TextInput value={section.eyebrow} onChange={(eyebrow) => onChange({ eyebrow })} />
                        </Field>
                        <Field label="Accent">
                            <AccentPicker value={section.accent} onChange={(accent) => onChange({ accent })} />
                        </Field>
                    </div>
                    <Field label="Title">
                        <TextInput value={section.title} onChange={(title) => onChange({ title })} />
                    </Field>
                    <Field label="Subtitle">
                        <TextArea value={section.subtitle} rows={2} onChange={(subtitle) => onChange({ subtitle })} />
                    </Field>

                    <div className="border-t border-white/5 pt-4">
                        <SectionBodyEditor type={section.type} data={section.data} onChange={onChangeData} />
                    </div>
                </div>
            )}
        </div>
    );
}
