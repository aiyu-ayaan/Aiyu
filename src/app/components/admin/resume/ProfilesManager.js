"use client";
import React, { useState } from 'react';
import { FaEye, FaDownload, FaTrash, FaPlus, FaChevronUp, FaChevronDown, FaCircleCheck } from 'react-icons/fa6';
import { createProfile, SECTION_TITLES } from '@/lib/resume/schema';
import { Field, moveItem, inputClass } from './controls';

// Manage tailored profiles: rename/add/delete, tagline & summary overrides,
// section ordering, and per-section/item/bullet visibility toggles. A profile
// only HIDES content from the master schema (see resolveProfile).

function Check({ checked, onChange, label, strong }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none py-0.5">
      <span
        onClick={onChange}
        className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
          checked ? 'bg-cyan-500/80 border-cyan-400' : 'bg-slate-950/60 border-slate-600'
        }`}
      >
        {checked ? <span className="w-2 h-2 bg-slate-950 rounded-[2px]" /> : null}
      </span>
      <span className={`text-sm ${strong ? 'text-slate-200 font-medium' : 'text-slate-400'} ${checked ? '' : 'line-through opacity-50'}`}>
        {label}
      </span>
    </label>
  );
}

export default function ProfilesManager({ data, onData, activeProfileId, isGeneratedActive, onSetActive, settingActive, dirty }) {
  const [selectedId, setSelectedId] = useState(data.profiles[0]?.id);
  const selected = data.profiles.find((p) => p.id === selectedId) || data.profiles[0];

  const updateProfile = (id, patch) =>
    onData({ ...data, profiles: data.profiles.map((p) => (p.id === id ? { ...p, ...patch } : p)) });

  const addProfile = () => {
    const p = createProfile(`Profile ${data.profiles.length + 1}`);
    onData({ ...data, profiles: [...data.profiles, p] });
    setSelectedId(p.id);
  };

  const deleteProfile = (id) => {
    if (data.profiles.length <= 1) return;
    const profiles = data.profiles.filter((p) => p.id !== id);
    const defaultProfileId = data.defaultProfileId === id ? profiles[0].id : data.defaultProfileId;
    onData({ ...data, profiles, defaultProfileId });
    if (selectedId === id) setSelectedId(profiles[0].id);
  };

  const toggleIn = (bucket, value) => {
    const set = new Set(selected.hidden[bucket]);
    set.has(value) ? set.delete(value) : set.add(value);
    updateProfile(selected.id, { hidden: { ...selected.hidden, [bucket]: [...set] } });
  };

  const moveSection = (idx, dir) =>
    updateProfile(selected.id, { sectionOrder: moveItem(selected.sectionOrder, idx, dir) });

  const sectionItems = (key) => {
    switch (key) {
      case 'experience':
        return data.schema.experience.map((it) => ({ id: it.id, label: `${it.company} — ${it.role}`, bullets: it.bullets }));
      case 'projects':
        return data.schema.projects.map((it) => ({ id: it.id, label: it.name, bullets: it.bullets }));
      case 'education':
        return data.schema.education.map((it) => ({ id: it.id, label: `${it.institution} — ${it.degree}` }));
      case 'skills':
        return data.schema.skills.map((it) => ({ id: it.id, label: it.category }));
      case 'certifications':
        return data.schema.certifications.map((it) => ({ id: it.id, label: it.name }));
      default:
        return [];
    }
  };

  const previewUrl = `/api/resume?profile=${encodeURIComponent(selected.id)}`;
  const isLive = isGeneratedActive && activeProfileId === selected.id;
  const hiddenSections = new Set(selected.hidden.sections);
  const hiddenItems = new Set(selected.hidden.items);
  const hiddenBullets = new Set(selected.hidden.bullets);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
      {/* Profile list */}
      <div className="bg-slate-900/40 rounded-2xl border border-white/10 p-4 h-fit">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-mono text-cyan-400/80 uppercase tracking-widest">Profiles</h3>
          <button type="button" onClick={addProfile} title="New profile" className="p-1.5 rounded-md border border-cyan-500/20 text-cyan-400 hover:border-cyan-500/40 transition-all">
            <FaPlus size={11} />
          </button>
        </div>
        <div className="space-y-1.5">
          {data.profiles.map((p) => {
            const live = isGeneratedActive && activeProfileId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all flex items-center justify-between gap-2 ${
                  selectedId === p.id ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-200' : 'bg-slate-950/40 border-white/10 text-slate-300 hover:border-white/20'
                }`}
              >
                <span className="truncate text-sm">{p.name}</span>
                {live ? <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded px-1.5 py-0.5">Live</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected profile editor */}
      {selected ? (
        <div className="space-y-6">
          <div className="bg-slate-900/40 rounded-2xl border border-white/10 p-4 md:p-6">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
              <div className="flex-1 min-w-[220px]">
                <Field label="Profile name" value={selected.name} onChange={(v) => updateProfile(selected.id, { name: v })} placeholder="AI Engineer" />
              </div>
              <div className="flex items-center gap-2">
                <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:border-white/30 text-xs font-mono uppercase tracking-wider transition-all">
                  <FaEye size={12} /> Preview
                </a>
                <a href={previewUrl} download className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:border-white/30 text-xs font-mono uppercase tracking-wider transition-all">
                  <FaDownload size={12} /> PDF
                </a>
                <button
                  type="button"
                  onClick={() => deleteProfile(selected.id)}
                  disabled={data.profiles.length <= 1}
                  title={data.profiles.length <= 1 ? 'At least one profile is required' : 'Delete profile'}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-red-500/20 text-red-400 hover:border-red-500/40 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-mono uppercase tracking-wider transition-all"
                >
                  <FaTrash size={12} />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-5">
              <button
                type="button"
                onClick={() => onSetActive(selected.id)}
                disabled={settingActive || isLive}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all ${
                  isLive ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 cursor-default' : 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:border-cyan-500/50'
                } disabled:opacity-60`}
              >
                <FaCircleCheck size={12} /> {isLive ? 'Live site résumé' : settingActive ? 'Setting…' : 'Set as site résumé'}
              </button>
              {dirty ? <span className="text-xs text-amber-400/80">Unsaved edits — Save to refresh the preview/PDF.</span> : null}
            </div>

            <div className="grid grid-cols-1 gap-4">
              <Field label="Tagline override (optional)" value={selected.tagline} onChange={(v) => updateProfile(selected.id, { tagline: v })} placeholder="Falls back to your Basics title" />
              <label className="block">
                <span className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-1">Summary override (optional)</span>
                <textarea
                  value={selected.summary || ''}
                  onChange={(e) => updateProfile(selected.id, { summary: e.target.value })}
                  rows={4}
                  placeholder="Leave blank to use the master Professional Summary"
                  className={`${inputClass} resize-y leading-relaxed`}
                />
              </label>
            </div>
          </div>

          {/* Sections: order + visibility tree */}
          <div className="bg-slate-900/40 rounded-2xl border border-white/10 p-4 md:p-6">
            <h3 className="text-sm font-mono text-cyan-400/80 uppercase tracking-widest mb-1">Sections &amp; Visibility</h3>
            <p className="text-xs text-slate-500 mb-5">Reorder with the arrows. Uncheck anything you want hidden from this profile&apos;s PDF.</p>

            <div className="space-y-3">
              {selected.sectionOrder.map((key, idx) => {
                const items = sectionItems(key);
                const sectionVisible = !hiddenSections.has(key);
                return (
                  <div key={key} className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <Check checked={sectionVisible} onChange={() => toggleIn('sections', key)} label={SECTION_TITLES[key]} strong />
                      <div className="flex items-center gap-1.5">
                        <button type="button" onClick={() => moveSection(idx, -1)} disabled={idx === 0} className="p-1.5 rounded-md border border-white/10 text-slate-400 hover:text-white hover:border-white/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                          <FaChevronUp size={11} />
                        </button>
                        <button type="button" onClick={() => moveSection(idx, 1)} disabled={idx === selected.sectionOrder.length - 1} className="p-1.5 rounded-md border border-white/10 text-slate-400 hover:text-white hover:border-white/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                          <FaChevronDown size={11} />
                        </button>
                      </div>
                    </div>

                    {sectionVisible && items.length > 0 ? (
                      <div className="mt-3 pl-6 space-y-2 border-l border-white/5">
                        {items.map((it) => {
                          const itemVisible = !hiddenItems.has(it.id);
                          return (
                            <div key={it.id}>
                              <Check checked={itemVisible} onChange={() => toggleIn('items', it.id)} label={it.label || '(untitled)'} />
                              {itemVisible && it.bullets && it.bullets.length > 0 ? (
                                <div className="pl-6 mt-1 space-y-0.5 border-l border-white/5">
                                  {it.bullets.map((b) => (
                                    <Check
                                      key={b.id}
                                      checked={!hiddenBullets.has(b.id)}
                                      onChange={() => toggleIn('bullets', b.id)}
                                      label={b.text || '(empty bullet)'}
                                    />
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
