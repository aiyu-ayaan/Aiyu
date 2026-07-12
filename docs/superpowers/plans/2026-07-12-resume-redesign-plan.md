# Resume Studio UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the `/admin/resume` page (Resume Studio) to look extremely premium, clean up the cluttered toolbar, move editor view toggles into IDE-style tab panels, and fix the double-scrollbar layout issue.

**Architecture:** Lock the viewport height to `h-[calc(100vh-4rem)]` with `overflow-hidden`. Introduce a custom Settings dropdown on the toolbar to hide secondary settings. Shift the view mode selection into tab headers on the editor panel itself.

**Tech Stack:** React, Next.js 16, Tailwind CSS 4, React Icons (Fa6).

## Global Constraints
* Lock outer scrollbars: pages must not overflow the screen viewport.
* Follow the conventional commits standard.
* Run `npm run lint` after changes.

---

### Task 1: Lock Page Viewport Sizing and Layout Sockets

**Files:**
* Modify: [ResumeStudioClient.js](file:///d:/VS-Code/Next%20JS/Aiyu/src/app/components/admin/resume/ResumeStudioClient.js)

- [ ] **Step 1: Set outer page height and overflow**
  Modify the root container `div` of `ResumeStudioClient` to prevent any outer viewport scrolling. Change line 342:
  ```diff
  -        <div className="flex flex-col h-[calc(100vh-1rem)] p-3 gap-3">
  +        <div className="flex flex-col h-[calc(100vh-4rem)] p-3 gap-3 overflow-hidden select-none bg-slate-950">
  ```
  *(Note: `100vh - 4rem` corresponds to the remaining height after the 64px `AdminTopbar` layout shell).*

- [ ] **Step 2: Make the inner panels layout flex-1 and scrollable**
  Update the main split container to prevent sizing leakage:
  ```diff
  -            <div className="flex flex-1 min-h-0 gap-3">
  +            <div className="flex flex-1 min-h-0 gap-3 overflow-hidden">
  ```

- [ ] **Step 3: Modify PDF Preview wrapper to lock height and scroll internal iframe**
  Change the PDF preview container at line 441-442 to:
  ```diff
  -                <div className="flex-1 min-w-0 flex flex-col gap-3">
  -                    <div className="flex-1 min-h-0 rounded-xl border border-white/10 overflow-hidden bg-slate-900/60">
  +                <div className="flex-1 min-w-0 flex flex-col gap-3 overflow-hidden">
  +                    <div className="flex-1 min-h-0 rounded-xl border border-white/10 overflow-hidden bg-slate-900/60 relative">
  ```

- [ ] **Step 4: Commit changes**
  ```powershell
  git add src/app/components/admin/resume/ResumeStudioClient.js
  git commit -m "refactor(resume): lock editor viewport height and prevent double scrollbars"
  ```

---

### Task 2: Implement Tabbed Editor Header with Visual/Code view switches

**Files:**
* Modify: [ResumeStudioClient.js](file:///d:/VS-Code/Next%20JS/Aiyu/src/app/components/admin/resume/ResumeStudioClient.js)

- [ ] **Step 1: Update main split area to wrap editors in a single container with a tabbed header**
  Replace lines 421-439 with a unified panel that has a tab bar at the top:
  ```jsx
  {/* Editor Pane (holds both Visual and Code mode views) */}
  <div className="flex-1 min-w-0 flex flex-col rounded-xl border border-white/10 overflow-hidden bg-slate-900/40">
      {/* Pane tabs header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/45 px-3 py-2 shrink-0">
          <div className="flex gap-1.5">
              <button
                  onClick={() => switchMode('visual')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                      mode === 'visual'
                          ? 'bg-purple-500/10 border-purple-500/30 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.08)]'
                          : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                  title="Drag-and-drop visual editor"
              >
                  <FaShapes className="text-[10.5px]" /> Visual
              </button>
              <button
                  onClick={() => switchMode('code')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                      mode === 'code'
                          ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.08)]'
                          : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                  title="LaTeX code editor"
              >
                  <FaCode className="text-[10.5px]" /> Code
              </button>
          </div>
          {dirty && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/5 border border-amber-500/20 px-2 py-0.5 rounded-md animate-pulse">
                  ● unsaved
              </span>
          )}
      </div>

      {/* Pane editor canvas */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
          {/* Editor (CodeMirror stays mounted so its buffer survives mode switches) */}
          <div className={`w-full h-full bg-[#282c34] ${mode === 'visual' ? 'hidden' : ''}`}>
              <LatexEditor
                  ref={editorRef}
                  initialDoc={studio?.latex || ''}
                  onDocChanged={() => setDirty(true)}
                  onSaveShortcut={saveAndCompile}
              />
          </div>
          {mode === 'visual' && model && (
              <div className="w-full h-full overflow-auto bg-slate-950/40">
                  <VisualEditor
                      model={model}
                      onChange={(next) => { setModel(next); setDirty(true); }}
                  />
              </div>
          )}
      </div>
  </div>
  ```

- [ ] **Step 2: Commit changes**
  ```powershell
  git add src/app/components/admin/resume/ResumeStudioClient.js
  git commit -m "feat(resume): add tabbed editor pane switching between visual and code modes"
  ```

---

### Task 3: Redesign Toolbar & Implement Configure Settings Dropdown

**Files:**
* Modify: [ResumeStudioClient.js](file:///d:/VS-Code/Next%20JS/Aiyu/src/app/components/admin/resume/ResumeStudioClient.js)

- [ ] **Step 1: Setup Dropdown state and close-on-click-outside helper overlay**
  At the top of the `ResumeStudioClient` function component, declare:
  ```javascript
  const [settingsOpen, setSettingsOpen] = useState(false);
  ```

- [ ] **Step 2: Rewrite the toolbar rendering code**
  Replace lines 343-418 in `ResumeStudioClient.js` with the redesigned toolbar. Create a single-line horizontal bar, grouping elements elegantly:
  ```jsx
  {/* Redesigned Toolbar */}
  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur px-4 py-2.5 shrink-0 z-20">
      {/* Left side: Back & Title */}
      <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center justify-center w-8 h-8 rounded-lg border border-white/5 bg-white/[0.02] text-slate-400 hover:text-white hover:bg-white/5 transition-all text-xs" title="Back to Admin Panel">
              ←
          </Link>
          <div>
              <div className="flex items-center gap-2">
                  <h1 className="text-sm font-bold text-white leading-tight">
                      Resume Studio
                  </h1>
                  <span className="text-[10px] text-slate-500 font-mono">
                      (v{studio?.updatedAt ? timeLabel(studio.updatedAt) : 'never'})
                  </span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  compiled {timeLabel(studio?.lastCompiledAt)} · published {timeLabel(studio?.lastPublishedAt)}
              </p>
          </div>
      </div>

      {/* Right side: Action Triggers & Configure Dropdown */}
      <div className="flex items-center gap-2 relative">
          {/* Action Group */}
          <button onClick={() => save()} disabled={saving} className={`${toolbarBtn} bg-slate-500/10 border-slate-500/20 text-slate-300 hover:bg-slate-500/20 hover:border-slate-400/40`}>
              {saving ? <FaSpinner className="animate-spin" /> : <FaFloppyDisk />} Save
          </button>
          
          <button onClick={saveAndCompile} disabled={compiling || saving} className={`${toolbarBtn} bg-cyan-500/10 border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/40`}>
              {compiling ? <FaSpinner className="animate-spin" /> : <FaPlay />} Compile
          </button>
          
          <button onClick={publish} disabled={publishing || !pdfBase64} className={`${toolbarBtn} bg-emerald-500/10 border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-400/40`}>
              {publishing ? <FaSpinner className="animate-spin" /> : <FaUpload />} Publish
          </button>
          
          <button onClick={download} disabled={!pdfUrl} className={`${toolbarBtn} bg-purple-500/10 border-purple-500/20 text-purple-300 hover:bg-purple-500/20 hover:border-purple-400/40`} title="Download PDF">
              <FaDownload /> PDF
          </button>
          
          <button onClick={takeSnapshot} className={`${toolbarBtn} bg-amber-500/10 border-amber-500/20 text-amber-300 hover:bg-amber-500/20 hover:border-amber-400/40`} title="Backup Snapshot">
              <FaCamera /> Snapshot
          </button>

          {/* Configure Settings Popover */}
          <div className="relative">
              <button
                  onClick={() => setSettingsOpen(!settingsOpen)}
                  className={`flex items-center justify-center w-8 h-8 rounded-lg border text-slate-400 hover:text-slate-200 transition-all ${
                      settingsOpen ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' : 'border-white/10 bg-slate-800/40 hover:bg-slate-800'
                  }`}
                  title="Configure Studio Settings"
              >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
              </button>

              {settingsOpen && (
                  <>
                      {/* Click outside overlay */}
                      <div className="fixed inset-0 z-30" onClick={() => setSettingsOpen(false)} />
                      {/* Dropdown panel */}
                      <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-white/10 bg-slate-900/95 p-3.5 shadow-2xl z-40 space-y-3.5 backdrop-blur-xl">
                          <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                  LaTeX Engine
                              </label>
                              <select
                                  value={engine}
                                  onChange={(e) => { setEngine(e.target.value); setDirty(true); }}
                                  className="w-full bg-slate-950 border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-slate-300 font-mono focus:border-cyan-500/50 focus:outline-none"
                              >
                                  {RESUME_ENGINES.map((eng) => <option key={eng} value={eng}>{eng}</option>)}
                              </select>
                          </div>

                          <hr className="border-white/5" />

                          <div className="space-y-2">
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                  Edits Automation
                              </label>
                              <button
                                  onClick={() => setAutoSave((v) => !v)}
                                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
                                      autoSave 
                                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                                          : 'border-white/10 text-slate-500 hover:text-slate-300'
                                  }`}
                              >
                                  <span>Auto-Save</span>
                                  <span className={`w-1.5 h-1.5 rounded-full ${autoSave ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                              </button>
                              
                              <button
                                  onClick={() => setAutoCompile((v) => { const next = !v; if (next) setAutoSave(true); return next; })}
                                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
                                      autoCompile 
                                          ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' 
                                          : 'border-white/10 text-slate-500 hover:text-slate-300'
                                  }`}
                              >
                                  <span>Auto-Compile</span>
                                  <span className={`w-1.5 h-1.5 rounded-full ${autoCompile ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'}`} />
                              </button>
                          </div>
                      </div>
                  </>
              )}
          </div>
      </div>
  </div>
  ```

- [ ] **Step 3: Commit changes**
  ```powershell
  git add src/app/components/admin/resume/ResumeStudioClient.js
  git commit -m "feat(resume): consolidate auto-save, auto-compile, and engine select into settings dropdown"
  ```

---

### Task 4: Polish Styles and Verification

**Files:**
* Modify: [ResumeStudioClient.js](file:///d:/VS-Code/Next%20JS/Aiyu/src/app/components/admin/resume/ResumeStudioClient.js)

- [ ] **Step 1: Check imports and icons**
  Ensure all used icons are properly imported:
  ```diff
  import {
      FaFloppyDisk, FaPlay, FaUpload, FaDownload,
      FaSpinner, FaCircleExclamation, FaXmark, FaCamera,
  -   FaCode, FaShapes, FaBolt, FaArrowsRotate,
  +   FaCode, FaShapes,
  } from 'react-icons/fa6';
  ```
  *(Note: `FaBolt` and `FaArrowsRotate` are replaced by status lights inside the dropdown, so we clean them up from imports).*

- [ ] **Step 2: Run ESLint**
  Run: `npm run lint`
  Expected: Command finishes with no errors in `ResumeStudioClient.js`.

- [ ] **Step 3: Commit final changes**
  ```powershell
  git add src/app/components/admin/resume/ResumeStudioClient.js
  git commit -m "chore(resume): cleanup imports and verify code correctness"
  ```
