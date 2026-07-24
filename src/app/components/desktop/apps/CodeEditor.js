"use client";
import React, { useEffect, useState } from 'react';
import {
    ChevronRight,
    ChevronDown,
    File as FileIcon,
    Folder,
    FolderOpen,
    Lock,
    Loader2,
    Files,
    Search,
    GitBranch,
    Settings as SettingsIcon,
    X,
} from 'lucide-react';

// Read-only VS Code style viewer. Reads the tree + file contents from
// /api/desktop/source (strict server-side allowlist — nothing is editable).
export default function CodeEditor() {
    const [tree, setTree] = useState([]);
    const [expanded, setExpanded] = useState({});
    const [openTabs, setOpenTabs] = useState([]);
    const [activePath, setActivePath] = useState(null);
    const [cache, setCache] = useState({});
    const [loadingFile, setLoadingFile] = useState(false);

    useEffect(() => {
        fetch('/api/desktop/source')
            .then((r) => r.json())
            .then((d) => {
                setTree(d.tree || []);
                // Auto-expand top-level dirs.
                const exp = {};
                (d.tree || []).forEach((n) => {
                    if (n.type === 'dir') exp[n.name] = true;
                });
                setExpanded(exp);
            })
            .catch(() => setTree([]));
    }, []);

    const openFile = async (path) => {
        setActivePath(path);
        setOpenTabs((tabs) => (tabs.includes(path) ? tabs : [...tabs, path]));
        if (cache[path]) return;
        setLoadingFile(true);
        try {
            const d = await fetch(`/api/desktop/source?path=${encodeURIComponent(path)}`).then((r) => r.json());
            setCache((c) => ({ ...c, [path]: d }));
        } catch {
            setCache((c) => ({ ...c, [path]: { error: 'Failed to load', readOnly: true } }));
        } finally {
            setLoadingFile(false);
        }
    };

    const closeTab = (path, e) => {
        e.stopPropagation();
        setOpenTabs((tabs) => {
            const next = tabs.filter((t) => t !== path);
            if (activePath === path) setActivePath(next[next.length - 1] || null);
            return next;
        });
    };

    const active = activePath ? cache[activePath] : null;

    return (
        <div className="flex h-full w-full bg-[#1e1e1e] font-mono text-[13px] text-[#cccccc]">
            {/* Activity bar */}
            <div className="flex w-11 shrink-0 flex-col items-center gap-4 border-r border-black/40 bg-[#333333] py-3">
                <Files className="h-5 w-5 text-white" />
                <Search className="h-5 w-5 opacity-60" />
                <GitBranch className="h-5 w-5 opacity-60" />
                <div className="mt-auto">
                    <SettingsIcon className="h-5 w-5 opacity-60" />
                </div>
            </div>

            {/* Explorer */}
            <aside className="hidden w-56 shrink-0 flex-col overflow-y-auto border-r border-black/40 bg-[#252526] sm:flex">
                <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider opacity-60">Explorer — Aiyu</div>
                <div className="pb-4 text-xs">
                    <TreeView
                        nodes={tree}
                        depth={0}
                        expanded={expanded}
                        setExpanded={setExpanded}
                        onOpen={openFile}
                        activePath={activePath}
                    />
                </div>
            </aside>

            {/* Editor area */}
            <div className="flex min-w-0 flex-1 flex-col">
                {/* Tabs */}
                <div className="flex h-9 shrink-0 items-stretch overflow-x-auto border-b border-black/40 bg-[#252526]">
                    {openTabs.map((path) => (
                        <button
                            key={path}
                            onClick={() => setActivePath(path)}
                            className={`group flex items-center gap-2 border-r border-black/40 px-3 text-xs ${
                                activePath === path ? 'bg-[#1e1e1e] text-white' : 'bg-[#2d2d2d] opacity-70'
                            }`}
                        >
                            <FileIcon className="h-3.5 w-3.5" />
                            <span className="whitespace-nowrap">{path.split('/').pop()}</span>
                            <span onClick={(e) => closeTab(path, e)} className="rounded p-0.5 opacity-0 hover:bg-white/10 group-hover:opacity-70">
                                <X className="h-3 w-3" />
                            </span>
                        </button>
                    ))}
                    <div className="ml-auto flex items-center gap-1 pr-3 text-[11px] text-amber-400">
                        <Lock className="h-3 w-3" /> Read Only
                    </div>
                </div>

                {/* Editor */}
                <div className="relative min-h-0 flex-1 overflow-auto">
                    {!activePath ? (
                        <Welcome />
                    ) : loadingFile && !active ? (
                        <div className="flex h-full items-center justify-center opacity-60">
                            <Loader2 className="h-5 w-5 animate-spin" />
                        </div>
                    ) : active?.error ? (
                        <div className="p-6 text-sm text-red-400">{active.error}</div>
                    ) : (
                        <CodePane content={active?.content || ''} />
                    )}
                </div>

                {/* Status bar */}
                <div className="flex h-6 shrink-0 items-center justify-between bg-[#007acc] px-3 text-[11px] text-white">
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                            <GitBranch className="h-3 w-3" /> master
                        </span>
                        <span className="flex items-center gap-1">
                            <Lock className="h-3 w-3" /> Read-only
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span>{active?.language || 'text'}</span>
                        <span>UTF-8</span>
                        <span>Aiyu OS</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function TreeView({ nodes, depth, expanded, setExpanded, onOpen, activePath }) {
    return (
        <ul>
            {nodes.map((node) => {
                const key = node.path || node.name;
                if (node.type === 'dir') {
                    const isOpen = expanded[node.name];
                    return (
                        <li key={key}>
                            <button
                                onClick={() => setExpanded((e) => ({ ...e, [node.name]: !e[node.name] }))}
                                className="flex w-full items-center gap-1 py-0.5 pr-2 hover:bg-white/5"
                                style={{ paddingLeft: 8 + depth * 12 }}
                            >
                                {isOpen ? <ChevronDown className="h-3 w-3 opacity-60" /> : <ChevronRight className="h-3 w-3 opacity-60" />}
                                {isOpen ? <FolderOpen className="h-3.5 w-3.5 text-[#dcb67a]" /> : <Folder className="h-3.5 w-3.5 text-[#dcb67a]" />}
                                <span className="truncate">{node.name}</span>
                            </button>
                            {isOpen && node.children && (
                                <TreeView
                                    nodes={node.children}
                                    depth={depth + 1}
                                    expanded={expanded}
                                    setExpanded={setExpanded}
                                    onOpen={onOpen}
                                    activePath={activePath}
                                />
                            )}
                        </li>
                    );
                }
                return (
                    <li key={key}>
                        <button
                            onClick={() => onOpen(node.path)}
                            className={`flex w-full items-center gap-1.5 py-0.5 pr-2 hover:bg-white/5 ${
                                activePath === node.path ? 'bg-white/10 text-white' : ''
                            }`}
                            style={{ paddingLeft: 14 + depth * 12 }}
                        >
                            <FileIcon className="h-3.5 w-3.5 text-[#75beff]" />
                            <span className="truncate">{node.name}</span>
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}

function CodePane({ content }) {
    const lines = content.split('\n');
    return (
        <div className="flex min-w-max text-[13px] leading-[1.5]">
            <div className="select-none border-r border-white/5 bg-[#1e1e1e] px-3 py-3 text-right text-[#858585]">
                {lines.map((_, i) => (
                    <div key={i}>{i + 1}</div>
                ))}
            </div>
            <pre className="flex-1 overflow-visible px-4 py-3">
                <code className="whitespace-pre text-[#d4d4d4]">{content}</code>
            </pre>
        </div>
    );
}

function Welcome() {
    return (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-center opacity-60">
            <Files className="h-10 w-10" />
            <p className="text-sm">Select a file from the Explorer</p>
            <p className="text-xs">Browsing the source of this portfolio — read only</p>
        </div>
    );
}
