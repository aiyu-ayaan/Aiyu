"use client";
/**
 * Visual (GUI) mode for Resume Studio: the parsed resume model rendered as
 * drag-and-drop section cards with plain form fields. Every edit calls
 * onChange with a new model; the parent regenerates LaTeX from it, so Save /
 * Compile / Publish behave identically in both modes.
 */
import React, { useEffect, useState } from 'react';
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    FaGripVertical, FaTrash, FaPlus, FaChevronDown, FaChevronRight,
    FaArrowUp, FaArrowDown, FaBriefcase, FaFileLines, FaListCheck, FaAlignLeft, FaCode,
} from 'react-icons/fa6';
import { blankItemFor, blankSection } from '@/lib/resumeVisual';
import { escapeLatex } from '@/lib/resumeStudio';

const inputCls = 'w-full bg-slate-950/60 border border-white/10 rounded-md px-2 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:border-cyan-500/50 focus:outline-none';
const miniBtn = 'p-1 rounded text-slate-500 hover:text-slate-200 transition-colors';

const SECTION_TYPES = [
    { type: 'entries', label: 'Experience / Education', icon: FaBriefcase },
    { type: 'projects', label: 'Projects', icon: FaFileLines },
    { type: 'skills', label: 'Skills', icon: FaListCheck },
    { type: 'text', label: 'Text paragraph', icon: FaAlignLeft },
    { type: 'raw', label: 'Raw LaTeX', icon: FaCode },
];

/** Bullet list editor shared by entries + projects items. */
function BulletsEditor({ bullets, onChange }) {
    const move = (i, dir) => {
        const next = [...bullets];
        const j = i + dir;
        if (j < 0 || j >= next.length) return;
        [next[i], next[j]] = [next[j], next[i]];
        onChange(next);
    };
    return (
        <div className="space-y-1 mt-1.5">
            {bullets.map((bullet, i) => (
                <div key={i} className="flex items-start gap-1">
                    <span className="text-slate-600 text-xs mt-1.5">•</span>
                    <textarea
                        value={bullet}
                        rows={2}
                        onChange={(e) => onChange(bullets.map((b, k) => (k === i ? e.target.value : b)))}
                        className={`${inputCls} resize-y leading-snug`}
                    />
                    <div className="flex flex-col shrink-0">
                        <button onClick={() => move(i, -1)} className={miniBtn} title="Move up"><FaArrowUp className="text-[9px]" /></button>
                        <button onClick={() => move(i, 1)} className={miniBtn} title="Move down"><FaArrowDown className="text-[9px]" /></button>
                        <button onClick={() => onChange(bullets.filter((_, k) => k !== i))} className={`${miniBtn} hover:text-red-400`} title="Delete bullet"><FaTrash className="text-[9px]" /></button>
                    </div>
                </div>
            ))}
            <button
                onClick={() => onChange([...bullets, ''])}
                className="flex items-center gap-1 text-[10px] uppercase font-bold text-cyan-500/70 hover:text-cyan-300"
            >
                <FaPlus className="text-[8px]" /> bullet
            </button>
        </div>
    );
}

/** One draggable item card inside a section (entry / project / skill row). */
function SortableItem({ id, children }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }}
            className="rounded-lg border border-white/5 bg-white/[0.02] p-2"
        >
            <div className="flex gap-1.5">
                <button {...attributes} {...listeners} className="mt-1 shrink-0 cursor-grab text-slate-600 hover:text-slate-300" title="Drag to reorder">
                    <FaGripVertical className="text-[10px]" />
                </button>
                <div className="min-w-0 flex-1">{children}</div>
            </div>
        </div>
    );
}

/** Wrapper making a list of items sortable within one section. */
function ItemsDnd({ items, onReorder, children }) {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );
    const handleDragEnd = ({ active, over }) => {
        if (!over || active.id === over.id) return;
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        onReorder(arrayMove(items, oldIndex, newIndex));
    };
    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">{children}</div>
            </SortableContext>
        </DndContext>
    );
}

function EntriesBody({ section, patch }) {
    const setItems = (items) => patch({ items });
    const patchItem = (id, itemPatch) =>
        setItems(section.items.map((i) => (i.id === id ? { ...i, ...itemPatch } : i)));
    return (
        <>
            <ItemsDnd items={section.items} onReorder={setItems}>
                {section.items.map((item) => (
                    <SortableItem key={item.id} id={item.id}>
                        <div className="grid grid-cols-2 gap-1.5">
                            <input value={item.title} placeholder="Company / Institution" onChange={(e) => patchItem(item.id, { title: e.target.value })} className={inputCls} />
                            <input value={item.right} placeholder="Dates (e.g. Jun 2025 -- Present)" onChange={(e) => patchItem(item.id, { right: e.target.value })} className={inputCls} />
                            <input value={item.subtitle} placeholder="Role / Degree" onChange={(e) => patchItem(item.id, { subtitle: e.target.value })} className={inputCls} />
                            <input value={item.subright} placeholder="Location / CGPA" onChange={(e) => patchItem(item.id, { subright: e.target.value })} className={inputCls} />
                        </div>
                        <BulletsEditor bullets={item.bullets} onChange={(bullets) => patchItem(item.id, { bullets })} />
                        <button onClick={() => setItems(section.items.filter((i) => i.id !== item.id))} className="mt-1 flex items-center gap-1 text-[10px] uppercase font-bold text-red-400/60 hover:text-red-300">
                            <FaTrash className="text-[8px]" /> remove entry
                        </button>
                    </SortableItem>
                ))}
            </ItemsDnd>
            <button onClick={() => setItems([...section.items, blankItemFor('entries')])} className="mt-2 flex items-center gap-1 text-[10px] uppercase font-bold text-cyan-400 hover:text-cyan-300">
                <FaPlus className="text-[8px]" /> Add entry
            </button>
        </>
    );
}

function ProjectsBody({ section, patch, portfolio }) {
    const setItems = (items) => patch({ items });
    const patchItem = (id, itemPatch) =>
        setItems(section.items.map((i) => (i.id === id ? { ...i, ...itemPatch } : i)));

    const addFromPortfolio = (projectId) => {
        const project = portfolio.find((p) => p._id === projectId);
        if (!project) return;
        setItems([...section.items, {
            ...blankItemFor('projects'),
            name: escapeLatex(project.name || ''),
            tech: escapeLatex((project.techStack || []).join(', ')),
            right: escapeLatex(project.year || ''),
            bullets: [escapeLatex(project.description || '')],
        }]);
    };

    return (
        <>
            <ItemsDnd items={section.items} onReorder={setItems}>
                {section.items.map((item) => (
                    <SortableItem key={item.id} id={item.id}>
                        {item.rawTitle ? (
                            <input value={item.rawTitle} placeholder="Title (LaTeX)" onChange={(e) => patchItem(item.id, { rawTitle: e.target.value })} className={inputCls} />
                        ) : (
                            <div className="grid grid-cols-2 gap-1.5">
                                <input value={item.name} placeholder="Project name" onChange={(e) => patchItem(item.id, { name: e.target.value })} className={inputCls} />
                                <input value={item.tech} placeholder="Tech (Kotlin, Compose…)" onChange={(e) => patchItem(item.id, { tech: e.target.value })} className={inputCls} />
                            </div>
                        )}
                        <input value={item.right} placeholder="Dates / status" onChange={(e) => patchItem(item.id, { right: e.target.value })} className={`${inputCls} mt-1.5`} />
                        <BulletsEditor bullets={item.bullets} onChange={(bullets) => patchItem(item.id, { bullets })} />
                        <button onClick={() => setItems(section.items.filter((i) => i.id !== item.id))} className="mt-1 flex items-center gap-1 text-[10px] uppercase font-bold text-red-400/60 hover:text-red-300">
                            <FaTrash className="text-[8px]" /> remove project
                        </button>
                    </SortableItem>
                ))}
            </ItemsDnd>
            <div className="mt-2 flex items-center gap-2">
                <button onClick={() => setItems([...section.items, blankItemFor('projects')])} className="flex items-center gap-1 text-[10px] uppercase font-bold text-cyan-400 hover:text-cyan-300">
                    <FaPlus className="text-[8px]" /> Add project
                </button>
                {portfolio.length > 0 && (
                    <select
                        value=""
                        onChange={(e) => e.target.value && addFromPortfolio(e.target.value)}
                        className="bg-slate-800 border border-white/10 rounded-md px-2 py-1 text-[10px] text-slate-300"
                    >
                        <option value="">+ from portfolio…</option>
                        {portfolio.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                    </select>
                )}
            </div>
        </>
    );
}

function SkillsBody({ section, patch }) {
    const setRows = (rows) => patch({ rows });
    const patchRow = (id, rowPatch) =>
        setRows(section.rows.map((r) => (r.id === id ? { ...r, ...rowPatch } : r)));
    return (
        <>
            <ItemsDnd items={section.rows} onReorder={setRows}>
                {section.rows.map((row) => (
                    <SortableItem key={row.id} id={row.id}>
                        <div className="flex gap-1.5">
                            <input value={row.category} placeholder="Category" onChange={(e) => patchRow(row.id, { category: e.target.value })} className={`${inputCls} !w-40 shrink-0`} />
                            <input value={row.items} placeholder="Comma-separated items" onChange={(e) => patchRow(row.id, { items: e.target.value })} className={inputCls} />
                            <button onClick={() => setRows(section.rows.filter((r) => r.id !== row.id))} className={`${miniBtn} hover:text-red-400 shrink-0`}><FaTrash className="text-[10px]" /></button>
                        </div>
                    </SortableItem>
                ))}
            </ItemsDnd>
            <button onClick={() => setRows([...section.rows, blankItemFor('skills')])} className="mt-2 flex items-center gap-1 text-[10px] uppercase font-bold text-cyan-400 hover:text-cyan-300">
                <FaPlus className="text-[8px]" /> Add row
            </button>
        </>
    );
}

/** One sortable section card. */
function SectionCard({ section, patch, remove, portfolio }) {
    const [open, setOpen] = useState(true);
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
    const typeMeta = SECTION_TYPES.find((t) => t.type === section.type);

    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }}
            className="rounded-xl border border-white/10 bg-slate-900/60"
        >
            <div className="flex items-center gap-2 p-2.5 border-b border-white/5">
                <button {...attributes} {...listeners} className="cursor-grab text-slate-600 hover:text-slate-300 shrink-0" title="Drag section">
                    <FaGripVertical />
                </button>
                <button onClick={() => setOpen(!open)} className="text-slate-500 hover:text-slate-300 shrink-0">
                    {open ? <FaChevronDown className="text-[10px]" /> : <FaChevronRight className="text-[10px]" />}
                </button>
                <input
                    value={section.title}
                    onChange={(e) => patch({ title: e.target.value })}
                    className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white focus:outline-none focus:border-b focus:border-cyan-500/50"
                />
                <span className="shrink-0 text-[9px] uppercase font-bold tracking-wider text-slate-600 border border-white/10 rounded px-1.5 py-0.5">
                    {typeMeta?.label || section.type}
                </span>
                <button onClick={remove} className="shrink-0 text-slate-600 hover:text-red-400" title="Delete section">
                    <FaTrash className="text-[11px]" />
                </button>
            </div>

            {open && (
                <div className="p-2.5">
                    {section.type === 'text' && (
                        <textarea
                            value={section.content}
                            rows={5}
                            onChange={(e) => patch({ content: e.target.value })}
                            placeholder="Paragraph text (inline LaTeX like \\textbf{...} is fine)"
                            className={`${inputCls} resize-y`}
                        />
                    )}
                    {section.type === 'entries' && <EntriesBody section={section} patch={patch} />}
                    {section.type === 'projects' && <ProjectsBody section={section} patch={patch} portfolio={portfolio} />}
                    {section.type === 'skills' && <SkillsBody section={section} patch={patch} />}
                    {section.type === 'raw' && (
                        <textarea
                            value={section.raw}
                            rows={8}
                            onChange={(e) => patch({ raw: e.target.value })}
                            className={`${inputCls} resize-y font-mono`}
                        />
                    )}
                </div>
            )}
        </div>
    );
}

export default function VisualEditor({ model, onChange }) {
    const [portfolio, setPortfolio] = useState([]);
    const [showHeader, setShowHeader] = useState(false);
    const [addOpen, setAddOpen] = useState(false);

    useEffect(() => {
        let cancelled = false;
        fetch('/api/projects')
            .then((r) => r.json())
            .then((data) => { if (!cancelled) setPortfolio(Array.isArray(data) ? data : []); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, []);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const patchSection = (id, sectionPatch) =>
        onChange({
            ...model,
            sections: model.sections.map((s) => (s.id === id ? { ...s, ...sectionPatch } : s)),
        });

    const removeSection = (id) =>
        onChange({ ...model, sections: model.sections.filter((s) => s.id !== id) });

    const handleSectionDrag = ({ active, over }) => {
        if (!over || active.id === over.id) return;
        const oldIndex = model.sections.findIndex((s) => s.id === active.id);
        const newIndex = model.sections.findIndex((s) => s.id === over.id);
        onChange({ ...model, sections: arrayMove(model.sections, oldIndex, newIndex) });
    };

    return (
        <div className="h-full overflow-auto p-3 space-y-3">
            {/* Header block */}
            <div className="rounded-xl border border-white/10 bg-slate-900/60">
                <button onClick={() => setShowHeader(!showHeader)} className="w-full flex items-center gap-2 p-2.5 text-left">
                    {showHeader ? <FaChevronDown className="text-[10px] text-slate-500" /> : <FaChevronRight className="text-[10px] text-slate-500" />}
                    <span className="text-sm font-bold text-white">Header</span>
                    <span className="text-[10px] text-slate-500">name, contacts — edited as LaTeX</span>
                </button>
                {showHeader && (
                    <div className="p-2.5 pt-0">
                        <textarea
                            value={model.header}
                            rows={9}
                            onChange={(e) => onChange({ ...model, header: e.target.value })}
                            className={`${inputCls} resize-y font-mono`}
                        />
                    </div>
                )}
            </div>

            {/* Sections */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSectionDrag}>
                <SortableContext items={model.sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3">
                        {model.sections.map((section) => (
                            <SectionCard
                                key={section.id}
                                section={section}
                                patch={(p) => patchSection(section.id, p)}
                                remove={() => removeSection(section.id)}
                                portfolio={portfolio}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            {/* Add section */}
            <div className="relative">
                <button
                    onClick={() => setAddOpen(!addOpen)}
                    className="w-full rounded-xl border border-dashed border-white/15 hover:border-cyan-500/40 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-cyan-300 transition-all"
                >
                    <FaPlus className="inline mr-2 text-[10px]" /> Add section
                </button>
                {addOpen && (
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10 rounded-xl border border-white/10 bg-slate-800 shadow-xl p-1.5 flex gap-1">
                        {SECTION_TYPES.map(({ type, label, icon: Icon }) => (
                            <button
                                key={type}
                                onClick={() => {
                                    onChange({ ...model, sections: [...model.sections, blankSection(type)] });
                                    setAddOpen(false);
                                }}
                                className="flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-slate-300 hover:bg-cyan-500/10 hover:text-cyan-300"
                                title={label}
                            >
                                <Icon />
                                <span className="text-[9px] whitespace-nowrap">{label}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
