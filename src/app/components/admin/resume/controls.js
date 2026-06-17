"use client";
import React from 'react';
import { FaChevronUp, FaChevronDown, FaTrash, FaPlus } from 'react-icons/fa6';

// Shared admin form primitives for the Resume Tailoring Hub, styled to match the
// existing slate/cyan admin panels (see ConfigForm/HomeForm).

export const inputClass =
  'w-full bg-slate-950/50 border border-white/10 rounded-lg p-2.5 text-sm text-slate-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/40 outline-none transition-all placeholder:text-slate-600';

/** Immutable array move; returns the same array if the move is out of bounds. */
export function moveItem(arr, index, dir) {
  const j = index + dir;
  if (j < 0 || j >= arr.length) return arr;
  const next = [...arr];
  [next[index], next[j]] = [next[j], next[index]];
  return next;
}

export function Field({ label, value, onChange, placeholder, type = 'text', textarea = false, rows = 3, className = '' }) {
  return (
    <label className={`block ${className}`}>
      {label ? (
        <span className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1">{label}</span>
      ) : null}
      {textarea ? (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={`${inputClass} resize-y leading-relaxed`}
        />
      ) : (
        <input
          type={type}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputClass}
        />
      )}
    </label>
  );
}

export function ReorderControls({ onUp, onDown, onDelete, isFirst, isLast }) {
  const btn = 'p-1.5 rounded-md border border-white/10 text-slate-400 hover:text-white hover:border-white/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all';
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" title="Move up" onClick={onUp} disabled={isFirst} className={btn}>
        <FaChevronUp size={11} />
      </button>
      <button type="button" title="Move down" onClick={onDown} disabled={isLast} className={btn}>
        <FaChevronDown size={11} />
      </button>
      <button
        type="button"
        title="Delete"
        onClick={onDelete}
        className="p-1.5 rounded-md border border-red-500/20 text-red-400 hover:text-red-300 hover:border-red-500/40 transition-all"
      >
        <FaTrash size={11} />
      </button>
    </div>
  );
}

export function AddButton({ onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-cyan-400 hover:text-cyan-300 border border-cyan-500/20 hover:border-cyan-500/40 rounded-lg px-3 py-2 transition-all"
    >
      <FaPlus size={11} /> {label}
    </button>
  );
}

export function SectionCard({ title, subtitle, children, actions }) {
  return (
    <div className="bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-white/10 p-4 md:p-6">
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <h3 className="text-sm font-mono text-cyan-400/80 uppercase tracking-widest">{title}</h3>
          {subtitle ? <p className="text-xs text-slate-500 mt-1">{subtitle}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

/** A draggable-feeling item wrapper (arrow reordering, not true DnD in v1). */
export function ItemRow({ children, onUp, onDown, onDelete, isFirst, isLast }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
      <div className="flex justify-end mb-3">
        <ReorderControls onUp={onUp} onDown={onDown} onDelete={onDelete} isFirst={isFirst} isLast={isLast} />
      </div>
      {children}
    </div>
  );
}
