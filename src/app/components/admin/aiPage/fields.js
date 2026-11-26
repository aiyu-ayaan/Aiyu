"use client";

import React from 'react';
import { FaPlus, FaTrash } from 'react-icons/fa6';

/** Shared field primitives for the AI hub editor — theme CSS variables & adm-* classes only. */

export function Field({ label, hint, children }) {
    return (
        <label className="adm-field">
            <span className="adm-label">{label}</span>
            {children}
            {hint && <span className="adm-help">{hint}</span>}
        </label>
    );
}

export function TextInput({ value, onChange, placeholder }) {
    return (
        <input
            type="text"
            value={value ?? ''}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            className="adm-input"
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
            className="adm-input font-mono"
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
            className="adm-input font-mono"
        />
    );
}

export function SwitchRow({ label, checked, onChange }) {
    return (
        <div className="flex items-center gap-3">
            <button
                type="button"
                role="switch"
                aria-checked={!!checked}
                aria-label={label}
                onClick={() => onChange(!checked)}
                className="adm-switch"
            />
            <span className="text-sm text-[var(--text-primary)]">{label}</span>
        </div>
    );
}

const ACCENTS = [
    { label: 'Cyan', value: 'var(--accent-cyan)' },
    { label: 'Purple', value: 'var(--accent-purple)' },
    { label: 'Orange', value: 'var(--accent-orange)' },
    { label: 'Pink', value: 'var(--accent-pink)' },
    { label: 'Teal', value: 'var(--accent-teal)' },
    { label: 'Green', value: 'var(--accent-green)' },
];

export function AccentPicker({ value, onChange }) {
    return (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Accent colour">
            {ACCENTS.map((a) => (
                <button
                    key={a.value}
                    type="button"
                    title={a.label}
                    aria-label={`${a.label} accent`}
                    aria-pressed={value === a.value}
                    onClick={() => onChange(a.value)}
                    className="adm-sc-swatch"
                    style={{ background: a.value }}
                />
            ))}
        </div>
    );
}

/** Editor for a `string[]` (tags). */
export function StringListEditor({ items, onChange, placeholder = 'Value' }) {
    const list = Array.isArray(items) ? items : [];
    const update = (i, v) => onChange(list.map((x, idx) => (idx === i ? v : x)));
    const remove = (i) => onChange(list.filter((_, idx) => idx !== i));
    const add = () => onChange(['', ...list]);

    return (
        <div className="space-y-2">
            {list.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                    <TextInput value={item} onChange={(v) => update(i, v)} placeholder={placeholder} />
                    <RemoveButton onClick={() => remove(i)} />
                </div>
            ))}
            <AddButton label="Add item" onClick={add} />
        </div>
    );
}

export function RemoveButton({ onClick, label = 'Remove item' }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="adm-icon-btn"
            title={label}
            aria-label={label}
        >
            <FaTrash aria-hidden="true" />
        </button>
    );
}

export function AddButton({ label, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="adm-btn"
        >
            <FaPlus aria-hidden="true" /> {label}
        </button>
    );
}

/** Generate a reasonably-unique id for new list items. */
export function newId(prefix = 'item') {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
