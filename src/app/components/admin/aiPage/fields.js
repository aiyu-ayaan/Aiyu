"use client";

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

/** Shared field primitives for the AI Hub editor — dark admin styling. */

export function Field({ label, hint, children }) {
    return (
        <label className="block">
            <span className="mb-1.5 block font-mono text-[0.7rem] uppercase tracking-wider text-slate-400">{label}</span>
            {children}
            {hint && <span className="mt-1 block text-xs text-slate-600">{hint}</span>}
        </label>
    );
}

const inputClass =
    'w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none transition-colors focus:border-cyan-400/50';

export function TextInput({ value, onChange, placeholder }) {
    return (
        <input
            type="text"
            value={value ?? ''}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            className={inputClass}
        />
    );
}

export function TextArea({ value, onChange, placeholder, rows = 4 }) {
    return (
        <textarea
            value={value ?? ''}
            placeholder={placeholder}
            rows={rows}
            onChange={(e) => onChange(e.target.value)}
            className={`${inputClass} resize-y font-mono leading-relaxed`}
        />
    );
}

export function NumberInput({ value, onChange, min = 0, max = 100 }) {
    return (
        <input
            type="number"
            value={Number.isFinite(value) ? value : 0}
            min={min}
            max={max}
            onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || 0)))}
            className={inputClass}
        />
    );
}

export function SwitchRow({ label, checked, onChange }) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className="flex items-center gap-2.5 text-sm text-slate-300"
        >
            <span
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                    checked ? 'bg-cyan-500/80' : 'bg-white/10'
                }`}
            >
                <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        checked ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                />
            </span>
            <span className="font-mono text-[0.7rem] uppercase tracking-wider">{label}</span>
        </button>
    );
}

const ACCENTS = [
    { label: 'cyan', value: 'var(--accent-cyan)', swatch: '#2997ff' },
    { label: 'purple', value: 'var(--accent-purple)', swatch: '#bf5af2' },
    { label: 'orange', value: 'var(--accent-orange)', swatch: '#ff9f0a' },
    { label: 'pink', value: 'var(--accent-pink)', swatch: '#ff375f' },
    { label: 'teal', value: 'var(--accent-teal)', swatch: '#30b0c7' },
    { label: 'green', value: 'var(--accent-green)', swatch: '#30d158' },
];

export function AccentPicker({ value, onChange }) {
    return (
        <div className="flex gap-2">
            {ACCENTS.map((a) => (
                <button
                    key={a.value}
                    type="button"
                    title={a.label}
                    onClick={() => onChange(a.value)}
                    className={`h-7 w-7 rounded-full border-2 transition-transform ${
                        value === a.value ? 'scale-110 border-white' : 'border-transparent'
                    }`}
                    style={{ background: a.swatch }}
                />
            ))}
        </div>
    );
}

/** Editor for a `string[]` (tags). */
export function StringListEditor({ items, onChange, placeholder = 'value' }) {
    const list = Array.isArray(items) ? items : [];
    const update = (i, v) => onChange(list.map((x, idx) => (idx === i ? v : x)));
    const remove = (i) => onChange(list.filter((_, idx) => idx !== i));
    const add = () => onChange([...list, '']);

    return (
        <div className="space-y-2">
            {list.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                    <TextInput value={item} onChange={(v) => update(i, v)} placeholder={placeholder} />
                    <RemoveButton onClick={() => remove(i)} />
                </div>
            ))}
            <AddButton label="Add" onClick={add} />
        </div>
    );
}

export function RemoveButton({ onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="shrink-0 rounded-md border border-red-500/20 bg-red-500/10 p-2 text-red-400 transition-colors hover:bg-red-500/20"
            title="Remove"
        >
            <Trash2 className="h-4 w-4" />
        </button>
    );
}

export function AddButton({ label, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex items-center gap-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-cyan-400 transition-colors hover:bg-cyan-500/20"
        >
            <Plus className="h-3.5 w-3.5" /> {label}
        </button>
    );
}

/** Generate a reasonably-unique id for new list items. */
export function newId(prefix = 'item') {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
