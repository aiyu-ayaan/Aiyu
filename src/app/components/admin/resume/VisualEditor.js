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
    FaAlignLeft,
    FaArrowDown,
    FaArrowUp,
    FaBriefcase,
    FaCertificate,
    FaChevronDown,
    FaChevronRight,
    FaCode,
    FaDiagramProject,
    FaFileLines,
    FaGraduationCap,
    FaGripVertical,
    FaHandshake,
    FaListCheck,
    FaPenToSquare,
    FaPlus,
    FaTrash,
    FaTrophy,
    FaUser,
} from 'react-icons/fa6';
import {
    blankItemFor, blankSection, blankContact,
    parseHeader, generateHeader, CONTACT_TYPES,
} from '@/lib/resumeVisual';
import { escapeLatex } from '@/lib/resumeStudio';
import { Badge } from '@/app/components/admin/ui';

const SECTION_TYPES = [
    { type: 'entries', label: 'Experience / Education', icon: FaBriefcase },
    { type: 'projects', label: 'Projects', icon: FaFileLines },
    { type: 'skills', label: 'Skills', icon: FaListCheck },
    { type: 'text', label: 'Text paragraph', icon: FaAlignLeft },
    { type: 'raw', label: 'Raw LaTeX', icon: FaCode },
];

const SECTION_MENU = [
    { key: 'experience', label: 'Experience', icon: FaBriefcase, type: 'entries', title: 'Experience' },
    { key: 'education', label: 'Education', icon: FaGraduationCap, type: 'entries', title: 'Education' },
    { key: 'projects', label: 'Projects', icon: FaDiagramProject, type: 'projects', title: 'Projects' },
    { key: 'skills', label: 'Skills', icon: FaListCheck, type: 'skills', title: 'Technical Skills' },
    { key: 'summary', label: 'Summary', icon: FaAlignLeft, type: 'text', title: 'Professional Summary' },
    { key: 'certifications', label: 'Certifications', icon: FaCertificate, type: 'skills', title: 'Certifications' },
    { key: 'achievements', label: 'Achievements', icon: FaTrophy, type: 'text', title: 'Achievements' },
    { key: 'involvement', label: 'Involvement', icon: FaHandshake, type: 'entries', title: 'Leadership & Involvement' },
    { key: 'raw', label: 'Raw LaTeX', icon: FaCode, type: 'raw', title: 'Custom Section' },
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
        <div className="space-y-2 mt-2">
            {bullets.map((bullet, i) => (
                <div key={i} className="flex items-start gap-2">
                    <span className="mt-2.5 text-xs text-[var(--adm-hint)]" aria-hidden="true">•</span>
                    <textarea
                        value={bullet}
                        rows={1}
                        aria-label={`Bullet point ${i + 1}`}
                        onChange={(e) => onChange(bullets.map((b, k) => (k === i ? e.target.value : b)))}
                        className="adm-input !min-h-10 flex-1 py-1.5"
                        placeholder="Describe achievement or responsibility…"
                    />
                    <div className="flex shrink-0 items-center gap-0.5">
                        <button
                            type="button"
                            onClick={() => move(i, -1)}
                            disabled={i === 0}
                            className="adm-icon-btn"
                            title="Move bullet up"
                            aria-label="Move bullet up"
                        >
                            <FaArrowUp aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            onClick={() => move(i, 1)}
                            disabled={i === bullets.length - 1}
                            className="adm-icon-btn"
                            title="Move bullet down"
                            aria-label="Move bullet down"
                        >
                            <FaArrowDown aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            onClick={() => onChange(bullets.filter((_, k) => k !== i))}
                            className="adm-icon-btn"
                            title="Delete bullet"
                            aria-label="Delete bullet"
                        >
                            <FaTrash aria-hidden="true" />
                        </button>
                    </div>
                </div>
            ))}
            <button
                type="button"
                onClick={() => onChange(['', ...bullets])}
                className="adm-btn !px-3 text-xs"
            >
                <FaPlus aria-hidden="true" /> Add bullet
            </button>
        </div>
    );
}

/** One draggable item card inside a section (entry / project / skill row). */
function SortableItem({ id, onDelete, children }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }}
            className="adm-sc-item p-3"
        >
            <div className="flex items-start gap-2">
                <button
                    type="button"
                    {...attributes}
                    {...listeners}
                    className="adm-icon-btn adm-sc-drag"
                    title="Drag to reorder"
                    aria-label="Drag item to reorder"
                >
                    <FaGripVertical aria-hidden="true" />
                </button>
                <div className="min-w-0 flex-1 space-y-2">{children}</div>
                {onDelete && (
                    <button
                        type="button"
                        onClick={onDelete}
                        className="adm-icon-btn"
                        title="Remove item"
                        aria-label="Remove item"
                    >
                        <FaTrash aria-hidden="true" />
                    </button>
                )}
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
                <div className="space-y-2.5">{children}</div>
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
                    <SortableItem key={item.id} id={item.id} onDelete={() => setItems(section.items.filter((i) => i.id !== item.id))}>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <input
                                value={item.title}
                                aria-label="Company or institution"
                                placeholder="Company or institution"
                                onChange={(e) => patchItem(item.id, { title: e.target.value })}
                                className="adm-input"
                            />
                            <input
                                value={item.right}
                                aria-label="Dates"
                                placeholder="Dates (e.g. Jun 2025 -- Present)"
                                onChange={(e) => patchItem(item.id, { right: e.target.value })}
                                className="adm-input"
                            />
                            <input
                                value={item.subtitle}
                                aria-label="Role or degree"
                                placeholder="Role or degree"
                                onChange={(e) => patchItem(item.id, { subtitle: e.target.value })}
                                className="adm-input"
                            />
                            <input
                                value={item.subright}
                                aria-label="Location or grade"
                                placeholder="Location or CGPA"
                                onChange={(e) => patchItem(item.id, { subright: e.target.value })}
                                className="adm-input"
                            />
                        </div>
                        <BulletsEditor bullets={item.bullets} onChange={(bullets) => patchItem(item.id, { bullets })} />
                    </SortableItem>
                ))}
            </ItemsDnd>
            <button
                type="button"
                onClick={() => setItems([blankItemFor('entries'), ...section.items])}
                className="adm-btn"
            >
                <FaPlus aria-hidden="true" /> Add entry
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
        setItems([{
            ...blankItemFor('projects'),
            name: escapeLatex(project.name || ''),
            tech: escapeLatex((project.techStack || []).join(', ')),
            right: escapeLatex(project.year || ''),
            bullets: [escapeLatex(project.description || '')],
        }, ...section.items]);
    };

    return (
        <>
            <ItemsDnd items={section.items} onReorder={setItems}>
                {section.items.map((item) => (
                    <SortableItem key={item.id} id={item.id} onDelete={() => setItems(section.items.filter((i) => i.id !== item.id))}>
                        {item.rawTitle ? (
                            <input
                                value={item.rawTitle}
                                aria-label="Project title (LaTeX)"
                                placeholder="Title (LaTeX)"
                                onChange={(e) => patchItem(item.id, { rawTitle: e.target.value })}
                                className="adm-input"
                            />
                        ) : (
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <input
                                    value={item.name}
                                    aria-label="Project name"
                                    placeholder="Project name"
                                    onChange={(e) => patchItem(item.id, { name: e.target.value })}
                                    className="adm-input"
                                />
                                <input
                                    value={item.tech}
                                    aria-label="Technologies"
                                    placeholder="Tech (Kotlin, Compose…)"
                                    onChange={(e) => patchItem(item.id, { tech: e.target.value })}
                                    className="adm-input"
                                />
                            </div>
                        )}
                        <input
                            value={item.right}
                            aria-label="Dates or status"
                            placeholder="Dates or status"
                            onChange={(e) => patchItem(item.id, { right: e.target.value })}
                            className="adm-input"
                        />
                        <BulletsEditor bullets={item.bullets} onChange={(bullets) => patchItem(item.id, { bullets })} />
                    </SortableItem>
                ))}
            </ItemsDnd>
            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={() => setItems([blankItemFor('projects'), ...section.items])}
                    className="adm-btn"
                >
                    <FaPlus aria-hidden="true" /> Add project
                </button>
                {portfolio.length > 0 && (
                    <select
                        value=""
                        aria-label="Add project from portfolio"
                        onChange={(e) => e.target.value && addFromPortfolio(e.target.value)}
                        className="adm-input !w-auto"
                    >
                        <option value="">Add from portfolio…</option>
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
                    <SortableItem key={row.id} id={row.id} onDelete={() => setRows(section.rows.filter((r) => r.id !== row.id))}>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[10rem_minmax(0,1fr)]">
                            <input
                                value={row.category}
                                aria-label="Skill category"
                                placeholder="Category"
                                onChange={(e) => patchRow(row.id, { category: e.target.value })}
                                className="adm-input"
                            />
                            <input
                                value={row.items}
                                aria-label="Skill items"
                                placeholder="Comma-separated items"
                                onChange={(e) => patchRow(row.id, { items: e.target.value })}
                                className="adm-input"
                            />
                        </div>
                    </SortableItem>
                ))}
            </ItemsDnd>
            <button
                type="button"
                onClick={() => setRows([blankItemFor('skills'), ...section.rows])}
                className="adm-btn"
            >
                <FaPlus aria-hidden="true" /> Add row
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
            className="adm-sc-item"
        >
            <div className="adm-sc-item-head">
                <button
                    type="button"
                    {...attributes}
                    {...listeners}
                    className="adm-icon-btn adm-sc-drag"
                    title="Drag section"
                    aria-label={`Reorder ${section.title}`}
                >
                    <FaGripVertical aria-hidden="true" />
                </button>
                <button
                    type="button"
                    onClick={() => setOpen(!open)}
                    aria-expanded={open}
                    aria-label={open ? 'Collapse section' : 'Expand section'}
                    className="adm-icon-btn"
                >
                    {open ? <FaChevronDown aria-hidden="true" /> : <FaChevronRight aria-hidden="true" />}
                </button>
                <input
                    value={section.title}
                    aria-label="Section title"
                    onChange={(e) => patch({ title: e.target.value })}
                    className="adm-input !min-h-8 flex-1 font-semibold"
                />
                <Badge>{typeMeta?.label || section.type}</Badge>
                <button
                    type="button"
                    onClick={remove}
                    className="adm-icon-btn"
                    title="Delete section"
                    aria-label={`Delete ${section.title} section`}
                >
                    <FaTrash aria-hidden="true" />
                </button>
            </div>

            {open && (
                <div className="adm-sc-item-body">
                    {section.type === 'text' && (
                        <textarea
                            value={section.content}
                            rows={5}
                            aria-label="Section paragraph text"
                            onChange={(e) => patch({ content: e.target.value })}
                            placeholder="Paragraph text (inline LaTeX like \textbf{...} is fine)"
                            className="adm-input"
                        />
                    )}
                    {section.type === 'entries' && <EntriesBody section={section} patch={patch} />}
                    {section.type === 'projects' && <ProjectsBody section={section} patch={patch} portfolio={portfolio} />}
                    {section.type === 'skills' && <SkillsBody section={section} patch={patch} />}
                    {section.type === 'raw' && (
                        <textarea
                            value={section.raw}
                            rows={8}
                            aria-label="Raw LaTeX content"
                            onChange={(e) => patch({ raw: e.target.value })}
                            className="adm-input font-mono"
                        />
                    )}
                </div>
            )}
        </div>
    );
}

function HeaderEditor({ header, onChange }) {
    const [open, setOpen] = useState(true);
    const [raw, setRaw] = useState(false);
    const parsed = parseHeader(header);
    const canStructure = parsed !== null;
    const structured = canStructure && !raw;

    const update = (patch) => onChange(generateHeader({ ...parsed, ...patch }));
    const patchContact = (i, cPatch) =>
        update({ contacts: parsed.contacts.map((c, k) => (k === i ? { ...c, ...cPatch } : c)) });

    return (
        <div className="adm-sc-item">
            <div className="adm-sc-item-head">
                <button
                    type="button"
                    onClick={() => setOpen(!open)}
                    aria-expanded={open}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                    {open ? (
                        <FaChevronDown className="shrink-0 text-xs text-[var(--text-secondary)]" aria-hidden="true" />
                    ) : (
                        <FaChevronRight className="shrink-0 text-xs text-[var(--text-secondary)]" aria-hidden="true" />
                    )}
                    <FaUser className="shrink-0 text-xs text-[var(--text-secondary)]" aria-hidden="true" />
                    <span className="text-sm font-semibold text-[var(--text-bright)]">Header</span>
                    <span className="adm-help truncate">
                        {canStructure ? `${parsed.name || 'Name'} · contacts` : 'Raw LaTeX'}
                    </span>
                </button>
                {canStructure && (
                    <button
                        type="button"
                        onClick={() => setRaw((v) => !v)}
                        className="adm-btn !px-3 text-xs"
                        title="Toggle raw LaTeX editing"
                    >
                        {raw ? <FaPenToSquare aria-hidden="true" /> : <FaCode aria-hidden="true" />}
                        {raw ? 'Fields' : 'LaTeX'}
                    </button>
                )}
            </div>

            {open && (
                <div className="adm-sc-item-body">
                    {structured ? (
                        <>
                            <div className="space-y-2">
                                <input
                                    value={parsed.name}
                                    aria-label="Full name"
                                    onChange={(e) => update({ name: e.target.value })}
                                    placeholder="Full name"
                                    className="adm-input font-semibold"
                                />
                                {parsed.lines.map((line, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <input
                                            value={line}
                                            aria-label={`Subtitle line ${i + 1}`}
                                            onChange={(e) => update({ lines: parsed.lines.map((l, k) => (k === i ? e.target.value : l)) })}
                                            placeholder={i === 0 ? 'Title (e.g. Mobile Android Developer)' : 'Location or extra line'}
                                            className="adm-input flex-1"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => update({ lines: parsed.lines.filter((_, k) => k !== i) })}
                                            className="adm-icon-btn"
                                            title="Remove line"
                                            aria-label="Remove subtitle line"
                                        >
                                            <FaTrash aria-hidden="true" />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => update({ lines: ['', ...parsed.lines] })}
                                    className="adm-btn !px-3 text-xs"
                                >
                                    <FaPlus aria-hidden="true" /> Add subtitle line
                                </button>
                            </div>

                            <div className="space-y-2 border-t border-[var(--hairline)] pt-3">
                                <p className="adm-label">Contacts</p>
                                {parsed.contacts.map((c, i) => (
                                    <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[8rem_minmax(0,1fr)_minmax(0,1fr)_auto]">
                                        <select
                                            value={c.type}
                                            aria-label="Contact type"
                                            onChange={(e) => {
                                                const meta = CONTACT_TYPES.find((t) => t.type === e.target.value);
                                                patchContact(i, { type: meta.type, icon: meta.icon });
                                            }}
                                            className="adm-input"
                                        >
                                            {CONTACT_TYPES.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
                                        </select>
                                        <input
                                            value={c.label}
                                            aria-label="Contact displayed text"
                                            onChange={(e) => patchContact(i, { label: e.target.value })}
                                            placeholder="Displayed text"
                                            className="adm-input"
                                        />
                                        <input
                                            value={c.url}
                                            aria-label="Contact URL"
                                            onChange={(e) => patchContact(i, { url: e.target.value })}
                                            placeholder="Link URL (optional)"
                                            className="adm-input"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => update({ contacts: parsed.contacts.filter((_, k) => k !== i) })}
                                            className="adm-icon-btn"
                                            title="Remove contact"
                                            aria-label="Remove contact"
                                        >
                                            <FaTrash aria-hidden="true" />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => update({ contacts: [blankContact(), ...parsed.contacts] })}
                                    className="adm-btn !px-3 text-xs"
                                >
                                    <FaPlus aria-hidden="true" /> Add contact
                                </button>
                            </div>
                        </>
                    ) : (
                        <textarea
                            value={header}
                            rows={9}
                            aria-label="Raw header LaTeX"
                            onChange={(e) => onChange(e.target.value)}
                            className="adm-input font-mono"
                        />
                    )}
                </div>
            )}
        </div>
    );
}

export default function VisualEditor({ model, onChange }) {
    const [portfolio, setPortfolio] = useState([]);
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
        <div className="h-full overflow-y-auto p-3 space-y-3">
            <HeaderEditor
                header={model.header}
                onChange={(header) => onChange({ ...model, header })}
            />

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

            <div className="relative">
                <button
                    type="button"
                    onClick={() => setAddOpen(!addOpen)}
                    aria-expanded={addOpen}
                    className="adm-btn w-full"
                >
                    <FaPlus aria-hidden="true" /> Add section
                </button>
                {addOpen && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => setAddOpen(false)} />
                        <div className="adm-dialog absolute bottom-full left-1/2 z-20 mb-2 w-80 max-w-[calc(100vw-2rem)] -translate-x-1/2 p-3">
                            <p className="adm-label mb-2">Choose a section type</p>
                            <div className="grid grid-cols-3 gap-1.5">
                                {SECTION_MENU.map(({ key, label, icon: Icon, type, title }) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => {
                                            const base = blankSection(type);
                                            onChange({ ...model, sections: [{ ...base, title }, ...model.sections] });
                                            setAddOpen(false);
                                        }}
                                        className="adm-sc-choice flex-col items-center justify-center p-2 text-center"
                                        title={title}
                                    >
                                        <Icon className="text-sm text-[var(--adm-accent-ink)]" aria-hidden="true" />
                                        <span className="text-xs text-[var(--text-primary)]">{label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
