"use client";

import React, { useEffect, useMemo, useState } from 'react';
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    FaChevronDown,
    FaChevronRight,
    FaFloppyDisk,
    FaGripVertical,
    FaPlus,
    FaSpinner,
    FaTrash,
} from 'react-icons/fa6';
import { Field, TextInput, TextArea, AccentPicker, newId } from '../aiPage/fields';
import SectionBodyEditor from '../aiPage/SectionBodyEditor';
import { DEFAULT_AI_PAGE, AI_SECTION_TYPES } from '@/lib/aiPageDefaults';
import {
    AI_SUBPAGE_THRESHOLD,
    AI_SUBPAGE_THRESHOLD_MIN,
    AI_SUBPAGE_THRESHOLD_MAX,
} from '@/lib/aiSubPages';
import { getJson, putJson } from './api';
import { Badge, Loading, Panel } from '@/app/components/admin/ui';

const TYPE_LABELS = {
    hero: 'Hero',
    skills: 'Skills',
    recommendations: 'Recommendations',
    credits: 'Free credits',
    stats: 'Live telemetry',
    prompts: 'Prompt library',
};

const DB_BACKED = new Set(['skills', 'recommendations', 'credits', 'prompts']);

function clone(obj) {
    if (typeof structuredClone === 'function') return structuredClone(obj);
    return JSON.parse(JSON.stringify(obj));
}

export default function LayoutManager({ notify }) {
    const [sections, setSections] = useState([]);
    const [threshold, setThreshold] = useState(String(DEFAULT_AI_PAGE.subPageThreshold ?? AI_SUBPAGE_THRESHOLD));
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [openId, setOpenId] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        getJson('/api/ai/layout')
            .then((data) => {
                const loaded = Array.isArray(data?.sections) && data.sections.length
                    ? data.sections
                    : clone(DEFAULT_AI_PAGE.sections);
                setSections(loaded.map((s) => ({ ...s, id: s.id || newId('section') })));
                if (Number.isFinite(Number(data?.subPageThreshold))) {
                    setThreshold(String(data.subPageThreshold));
                }
            })
            .catch(() => {
                setSections(clone(DEFAULT_AI_PAGE.sections));
                notify?.(false, 'Could not load layout — showing defaults.');
            })
            .finally(() => setLoading(false));
    }, []);

    const templatesByType = useMemo(() => {
        const map = {};
        for (const s of DEFAULT_AI_PAGE.sections) map[s.type] = s;
        return map;
    }, []);

    const updateSection = (id, patch) => setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    const updateSectionData = (id, data) => setSections((prev) => prev.map((s) => (s.id === id ? { ...s, data } : s)));
    const removeSection = (id) => setSections((prev) => prev.filter((s) => s.id !== id));

    const addSection = (type) => {
        const template = templatesByType[type] || { type, enabled: true, title: TYPE_LABELS[type], data: {} };
        const next = { ...clone(template), id: newId(type), enabled: true };
        setSections((prev) => [next, ...prev]);
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

    const clampThreshold = (value) => {
        const n = Number(value);
        if (!Number.isFinite(n)) return DEFAULT_AI_PAGE.subPageThreshold ?? AI_SUBPAGE_THRESHOLD;
        return Math.max(AI_SUBPAGE_THRESHOLD_MIN, Math.min(AI_SUBPAGE_THRESHOLD_MAX, Math.round(n)));
    };

    const save = async () => {
        setSaving(true);
        try {
            const subPageThreshold = clampThreshold(threshold);
            setThreshold(String(subPageThreshold));
            await putJson('/api/ai/layout', { sections, subPageThreshold });
            notify?.(true, 'Layout saved');
        } catch (e) {
            notify?.(false, e.message || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <Panel><Loading label="Loading AI hub layout" rows={5} /></Panel>;
    }

    const enabledCount = sections.filter((s) => s.enabled !== false).length;

    return (
        <div className="adm-sc-split">
            <div className="adm-sc-col">
                <Panel
                    title="Sections order & headings"
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge tone="ok">{enabledCount} / {sections.length} visible</Badge>
                            <AddSectionMenu onAdd={addSection} />
                        </div>
                    }
                >
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
                </Panel>
            </div>

            <aside className="adm-sc-aside">
                <Panel title="Publish layout" className="adm-sc-save">
                    <p className="adm-help mb-4">
                        Saves section ordering, visibility, titles and overflow threshold to the public /ai hub.
                    </p>
                    <button
                        type="button"
                        onClick={save}
                        disabled={saving}
                        className="adm-btn adm-btn-primary w-full"
                    >
                        {saving ? <FaSpinner className="animate-spin" aria-hidden="true" /> : <FaFloppyDisk aria-hidden="true" />}
                        {saving ? 'Saving…' : 'Save layout'}
                    </button>
                </Panel>

                <Panel title="Sub-page overflow">
                    <div className="adm-field">
                        <label htmlFor="ai-subpage-threshold" className="adm-label">
                            Max items before overflow link
                        </label>
                        <input
                            id="ai-subpage-threshold"
                            type="number"
                            min={AI_SUBPAGE_THRESHOLD_MIN}
                            max={AI_SUBPAGE_THRESHOLD_MAX}
                            value={threshold}
                            onChange={(e) => setThreshold(e.target.value)}
                            onBlur={() => setThreshold(String(clampThreshold(threshold)))}
                            className="adm-input font-mono"
                        />
                        <p className="adm-help">
                            When a section has more than this many items, <code className="adm-code">/ai</code> shows this many and links to its sub-page (such as <code className="adm-code">/ai/skills</code>).
                        </p>
                    </div>
                </Panel>
            </aside>
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
                aria-expanded={open}
                className="adm-btn"
            >
                <FaPlus aria-hidden="true" /> Add section
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div
                        className="adm-dialog absolute right-0 top-full z-20 mt-2 w-52 p-1"
                        role="menu"
                    >
                        {AI_SECTION_TYPES.map((type) => (
                            <button
                                key={type}
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                    onAdd(type);
                                    setOpen(false);
                                }}
                                className="adm-row rounded-lg text-sm"
                            >
                                {TYPE_LABELS[type] || type}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function SortableSection({ section, open, onToggleOpen, onChange, onChangeData, onRemove }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };
    const enabled = section.enabled !== false;
    const dbBacked = DB_BACKED.has(section.type);

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`adm-sc-item ${enabled ? '' : 'opacity-65'}`}
        >
            <div className="adm-sc-item-head">
                <button
                    type="button"
                    {...attributes}
                    {...listeners}
                    className="adm-icon-btn adm-sc-drag"
                    title="Reorder section"
                    aria-label={`Reorder ${section.title || section.type}`}
                >
                    <FaGripVertical aria-hidden="true" />
                </button>

                <button
                    type="button"
                    onClick={onToggleOpen}
                    aria-expanded={open}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                >
                    {open ? (
                        <FaChevronDown className="shrink-0 text-xs text-[var(--text-secondary)]" aria-hidden="true" />
                    ) : (
                        <FaChevronRight className="shrink-0 text-xs text-[var(--text-secondary)]" aria-hidden="true" />
                    )}
                    <Badge>{TYPE_LABELS[section.type] || section.type}</Badge>
                    <span className="truncate text-sm font-semibold text-[var(--text-bright)]">
                        {section.title || 'Untitled section'}
                    </span>
                </button>

                <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    aria-label={`Show ${section.title || section.type} section`}
                    onClick={() => onChange({ enabled: !enabled })}
                    className="adm-switch"
                />
                <button
                    type="button"
                    onClick={onRemove}
                    className="adm-icon-btn"
                    title="Delete section"
                    aria-label={`Delete ${section.title || section.type} section`}
                >
                    <FaTrash aria-hidden="true" />
                </button>
            </div>

            {open && (
                <div className="adm-sc-item-body">
                    <div className="adm-sc-fields">
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

                    <div className="border-t border-[var(--hairline)] pt-4">
                        {dbBacked ? (
                            <div className="adm-notice adm-notice-info">
                                Item content for this section is managed live in the <strong>Content → {TYPE_LABELS[section.type]}</strong> tab. This panel controls its heading, accent, order and visibility.
                            </div>
                        ) : (
                            <SectionBodyEditor type={section.type} data={section.data} onChange={onChangeData} />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
