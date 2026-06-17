"use client";
import React from 'react';
import { genId } from '@/lib/resume/schema';
import { Field, SectionCard, ItemRow, AddButton, ReorderControls, moveItem, inputClass } from './controls';

// Master CV editor — edits schema.* (content shared by every profile). Pure
// presentational: receives the schema and an onSchema(next) setter.

function BulletEditor({ bullets, onChange, idPrefix }) {
  const list = bullets || [];
  const update = (i, text) => onChange(list.map((b, idx) => (idx === i ? { ...b, text } : b)));
  const add = () => onChange([...list, { id: genId(`${idPrefix}-b`), text: '' }]);
  const remove = (i) => onChange(list.filter((_, idx) => idx !== i));
  const move = (i, dir) => onChange(moveItem(list, i, dir));

  return (
    <div className="mt-3">
      <span className="block text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-2">Bullets</span>
      <div className="space-y-2">
        {list.map((b, i) => (
          <div key={b.id} className="flex items-start gap-2">
            <textarea
              value={b.text}
              onChange={(e) => update(i, e.target.value)}
              rows={2}
              placeholder="Achievement or responsibility…"
              className={`${inputClass} resize-y leading-relaxed flex-1`}
            />
            <div className="pt-1">
              <ReorderControls
                onUp={() => move(i, -1)}
                onDown={() => move(i, 1)}
                onDelete={() => remove(i)}
                isFirst={i === 0}
                isLast={i === list.length - 1}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2">
        <AddButton onClick={add} label="Add bullet" />
      </div>
    </div>
  );
}

export default function ContentEditor({ schema, onSchema }) {
  const setBasics = (key, val) => onSchema({ ...schema, basics: { ...schema.basics, [key]: val } });
  const setList = (key, list) => onSchema({ ...schema, [key]: list });
  const updateItem = (key, idx, patch) => setList(key, schema[key].map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const addItem = (key, item) => setList(key, [...schema[key], item]);
  const removeItem = (key, idx) => setList(key, schema[key].filter((_, i) => i !== idx));
  const moveIn = (key, idx, dir) => setList(key, moveItem(schema[key], idx, dir));

  const itemControls = (key, idx) => ({
    onUp: () => moveIn(key, idx, -1),
    onDown: () => moveIn(key, idx, 1),
    onDelete: () => removeItem(key, idx),
    isFirst: idx === 0,
    isLast: idx === schema[key].length - 1,
  });

  return (
    <div className="space-y-6">
      {/* Basics */}
      <SectionCard title="Basics" subtitle="Header shown at the top of every resume">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Full name" value={schema.basics.name} onChange={(v) => setBasics('name', v)} placeholder="Ayaan Ansari" />
          <Field label="Title / Headline" value={schema.basics.title} onChange={(v) => setBasics('title', v)} placeholder="Software Engineer" />
          <Field label="Location" value={schema.basics.location} onChange={(v) => setBasics('location', v)} placeholder="Mumbai, Maharashtra" />
          <Field label="Phone" value={schema.basics.phone} onChange={(v) => setBasics('phone', v)} placeholder="000-000-0000" />
          <Field label="Email" value={schema.basics.email} onChange={(v) => setBasics('email', v)} placeholder="you@example.com" />
          <Field label="Website" value={schema.basics.website} onChange={(v) => setBasics('website', v)} placeholder="example.com" />
          <Field label="LinkedIn" value={schema.basics.linkedin} onChange={(v) => setBasics('linkedin', v)} placeholder="linkedin.com/in/you" />
          <Field label="GitHub" value={schema.basics.github} onChange={(v) => setBasics('github', v)} placeholder="github.com/you" />
        </div>
      </SectionCard>

      {/* Summary */}
      <SectionCard title="Professional Summary" subtitle="Default summary; profiles can override it">
        <Field
          value={schema.summary}
          onChange={(v) => onSchema({ ...schema, summary: v })}
          textarea
          rows={5}
          placeholder="A short professional summary…"
        />
      </SectionCard>

      {/* Experience */}
      <SectionCard
        title="Experience"
        actions={<AddButton onClick={() => addItem('experience', { id: genId('exp'), company: '', role: '', location: '', start: '', end: '', bullets: [] })} label="Add role" />}
      >
        <div className="space-y-4">
          {schema.experience.map((it, i) => (
            <ItemRow key={it.id} {...itemControls('experience', i)}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Company" value={it.company} onChange={(v) => updateItem('experience', i, { company: v })} />
                <Field label="Role" value={it.role} onChange={(v) => updateItem('experience', i, { role: v })} />
                <Field label="Location" value={it.location} onChange={(v) => updateItem('experience', i, { location: v })} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Start" value={it.start} onChange={(v) => updateItem('experience', i, { start: v })} placeholder="Jun 2025" />
                  <Field label="End" value={it.end} onChange={(v) => updateItem('experience', i, { end: v })} placeholder="Present" />
                </div>
              </div>
              <BulletEditor bullets={it.bullets} onChange={(b) => updateItem('experience', i, { bullets: b })} idPrefix="exp" />
            </ItemRow>
          ))}
          {schema.experience.length === 0 ? <p className="text-xs text-slate-600">No experience yet.</p> : null}
        </div>
      </SectionCard>

      {/* Education */}
      <SectionCard
        title="Education"
        actions={<AddButton onClick={() => addItem('education', { id: genId('edu'), institution: '', degree: '', location: '', start: '', end: '', note: '' })} label="Add education" />}
      >
        <div className="space-y-4">
          {schema.education.map((it, i) => (
            <ItemRow key={it.id} {...itemControls('education', i)}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Institution" value={it.institution} onChange={(v) => updateItem('education', i, { institution: v })} />
                <Field label="Degree" value={it.degree} onChange={(v) => updateItem('education', i, { degree: v })} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Start" value={it.start} onChange={(v) => updateItem('education', i, { start: v })} placeholder="Aug 2023" />
                  <Field label="End" value={it.end} onChange={(v) => updateItem('education', i, { end: v })} placeholder="May 2025" />
                </div>
                <Field label="Note (e.g. CGPA)" value={it.note} onChange={(v) => updateItem('education', i, { note: v })} placeholder="CGPA: 8.1/10.0" />
              </div>
            </ItemRow>
          ))}
          {schema.education.length === 0 ? <p className="text-xs text-slate-600">No education yet.</p> : null}
        </div>
      </SectionCard>

      {/* Projects */}
      <SectionCard
        title="Projects"
        actions={<AddButton onClick={() => addItem('projects', { id: genId('prj'), name: '', stack: '', start: '', end: '', link: '', bullets: [] })} label="Add project" />}
      >
        <div className="space-y-4">
          {schema.projects.map((it, i) => (
            <ItemRow key={it.id} {...itemControls('projects', i)}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Name" value={it.name} onChange={(v) => updateItem('projects', i, { name: v })} />
                <Field label="Tech stack" value={it.stack} onChange={(v) => updateItem('projects', i, { stack: v })} placeholder="Kotlin, Compose, Firebase" />
                <Field label="Link (optional)" value={it.link} onChange={(v) => updateItem('projects', i, { link: v })} placeholder="github.com/you/project" />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Start" value={it.start} onChange={(v) => updateItem('projects', i, { start: v })} placeholder="Dec 2024" />
                  <Field label="End" value={it.end} onChange={(v) => updateItem('projects', i, { end: v })} placeholder="May 2025" />
                </div>
              </div>
              <BulletEditor bullets={it.bullets} onChange={(b) => updateItem('projects', i, { bullets: b })} idPrefix="prj" />
            </ItemRow>
          ))}
          {schema.projects.length === 0 ? <p className="text-xs text-slate-600">No projects yet.</p> : null}
        </div>
      </SectionCard>

      {/* Skills */}
      <SectionCard
        title="Technical Skills"
        actions={<AddButton onClick={() => addItem('skills', { id: genId('sk'), category: '', items: '' })} label="Add category" />}
      >
        <div className="space-y-4">
          {schema.skills.map((it, i) => (
            <ItemRow key={it.id} {...itemControls('skills', i)}>
              <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4">
                <Field label="Category" value={it.category} onChange={(v) => updateItem('skills', i, { category: v })} placeholder="Languages" />
                <Field label="Items (comma-separated)" value={it.items} onChange={(v) => updateItem('skills', i, { items: v })} placeholder="Kotlin, Java, Python" />
              </div>
            </ItemRow>
          ))}
          {schema.skills.length === 0 ? <p className="text-xs text-slate-600">No skills yet.</p> : null}
        </div>
      </SectionCard>

      {/* Certifications */}
      <SectionCard
        title="Certifications"
        actions={<AddButton onClick={() => addItem('certifications', { id: genId('cert'), name: '', issuer: '', date: '', link: '' })} label="Add certification" />}
      >
        <div className="space-y-4">
          {schema.certifications.map((it, i) => (
            <ItemRow key={it.id} {...itemControls('certifications', i)}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Name" value={it.name} onChange={(v) => updateItem('certifications', i, { name: v })} />
                <Field label="Issuer" value={it.issuer} onChange={(v) => updateItem('certifications', i, { issuer: v })} />
                <Field label="Date" value={it.date} onChange={(v) => updateItem('certifications', i, { date: v })} placeholder="2024" />
                <Field label="Link (optional)" value={it.link} onChange={(v) => updateItem('certifications', i, { link: v })} />
              </div>
            </ItemRow>
          ))}
          {schema.certifications.length === 0 ? (
            <p className="text-xs text-slate-600">No certifications yet — this section is hidden from the PDF when empty.</p>
          ) : null}
        </div>
      </SectionCard>
    </div>
  );
}
