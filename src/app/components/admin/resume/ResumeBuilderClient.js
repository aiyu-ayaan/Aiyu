"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FaFloppyDisk, FaFileLines, FaSliders } from 'react-icons/fa6';
import ContentEditor from './ContentEditor';
import ProfilesManager from './ProfilesManager';

// Resume Tailoring Hub — top-level admin client. Loads the builder document and
// the current active-resume config, hosts the Content/Profiles tabs, and owns
// save + "set as site résumé".

export default function ResumeBuilderClient() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(0);
  const [tab, setTab] = useState('content');

  const [activeProfileId, setActiveProfileId] = useState('');
  const [isGeneratedActive, setIsGeneratedActive] = useState(false);
  const [settingActive, setSettingActive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [rRes, cRes] = await Promise.all([fetch('/api/admin/resume'), fetch('/api/config')]);
        if (!rRes.ok) throw new Error('Failed to load resume data');
        const builder = await rRes.json();
        if (cancelled) return;
        setData(builder);
        if (cRes.ok) {
          const cfg = await cRes.json();
          const r = cfg?.resume;
          setIsGeneratedActive(r?.type === 'generated');
          setActiveProfileId(r?.value?.profileId || '');
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleData = (next) => {
    setData(next);
    setDirty(true);
  };

  const save = async () => {
    if (!data) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/resume', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Save failed');
      setData(await res.json());
      setDirty(false);
      setSavedAt(Date.now());
    } catch (e) {
      setError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const setActive = async (profileId) => {
    setSettingActive(true);
    setError('');
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume: { type: 'generated', value: { profileId } } }),
      });
      if (!res.ok) throw new Error('Failed to set active resume');
      setIsGeneratedActive(true);
      setActiveProfileId(profileId);
    } catch (e) {
      setError(e.message || 'Failed to set active resume');
    } finally {
      setSettingActive(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-slate-400 font-mono text-sm animate-pulse">Loading resume builder…</div>;
  }

  if (!data) {
    return <div className="p-8 text-red-400 font-mono text-sm">{error || 'Could not load resume data.'}</div>;
  }

  const tabBtn = (id, label, Icon) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
        tab === id ? 'bg-cyan-500/15 border border-cyan-500/40 text-cyan-200' : 'border border-white/10 text-slate-400 hover:text-white hover:border-white/20'
      }`}
    >
      <Icon size={13} /> {label}
    </button>
  );

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <Link href="/admin" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors mb-4 text-sm font-mono opacity-60 hover:opacity-100">
          ← BACK_TO_COMMAND_CENTER
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">Resume &amp; PDF Tailoring Hub</h1>
            <p className="text-slate-400">One master CV, many job-specific profiles. Generated to PDF on demand.</p>
          </div>
          <div className="flex items-center gap-3">
            {dirty ? <span className="text-xs text-amber-400/80 font-mono">Unsaved</span> : savedAt ? <span className="text-xs text-emerald-400/80 font-mono">Saved</span> : null}
            <button
              type="button"
              onClick={save}
              disabled={saving || !dirty}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-500/15 border border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/25 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-all"
            >
              <FaFloppyDisk size={14} /> {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {error ? <div className="mb-6 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div> : null}

      <div className="flex items-center gap-3 mb-8">
        {tabBtn('content', 'Content', FaFileLines)}
        {tabBtn('profiles', 'Profiles', FaSliders)}
      </div>

      {tab === 'content' ? (
        <ContentEditor schema={data.schema} onSchema={(schema) => handleData({ ...data, schema })} />
      ) : (
        <ProfilesManager
          data={data}
          onData={handleData}
          activeProfileId={activeProfileId}
          isGeneratedActive={isGeneratedActive}
          onSetActive={setActive}
          settingActive={settingActive}
          dirty={dirty}
        />
      )}
    </div>
  );
}
