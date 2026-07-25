"use client";
import React, { useState } from 'react';
import { Compass, BookOpen, Terminal, Sparkles, Monitor, Command, ArrowRight, CheckCircle } from 'lucide-react';
import { useDeviceMode } from '../../../context/DeviceModeContext';
import { APP_VERSION } from '@/lib/version';

const getWikiSections = (isMobile, openApp) => [
    {
        id: 'overview',
        title: 'Welcome to Aiyu OS',
        icon: Compass,
        content: (
            <div className="space-y-4">
                <div className="rounded-xl border border-blue-500/20 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 p-5 backdrop-blur">
                    <h3 className="text-lg font-bold text-white mb-1">Aiyu Web Desktop OS</h3>
                    <p className="text-xs text-white/70 leading-relaxed">
                        An interactive, high-performance web-based desktop environment simulating Windows 11 built with Next.js, React, Tailwind CSS, and Framer Motion.
                    </p>
                </div>

                <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
                    <div className="rounded-lg border border-white/10 bg-white/5 p-3.5">
                        <div className="flex items-center gap-2 font-semibold text-white mb-1 text-xs">
                            <Sparkles className="h-4 w-4 text-amber-400" />
                            <span>Fluid Motion & Physics</span>
                        </div>
                        <p className="text-[11px] text-white/60">
                            Smooth open, close, minimize, and restore window spring transitions with hardware acceleration.
                        </p>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-white/5 p-3.5">
                        <div className="flex items-center gap-2 font-semibold text-white mb-1 text-xs">
                            <Monitor className="h-4 w-4 text-cyan-400" />
                            <span>Native Desktop Apps</span>
                        </div>
                        <p className="text-[11px] text-white/60">
                            Includes File Explorer, Code Editor, Photos, Task Manager, Notepad, Calculator, Whiteboard, and Terminal.
                        </p>
                    </div>
                </div>
            </div>
        ),
    },
    {
        id: 'apps',
        title: 'Built-in Applications',
        icon: BookOpen,
        content: (
            <div className="space-y-3">
                <h4 className="text-xs font-semibold text-white/80 uppercase tracking-wider">Available Desktop Suite</h4>
                <div className="grid grid-cols-1 gap-2.5">
                    {[
                        { title: 'Google Chrome', desc: 'Browse live portfolio projects, web apps, and web links.' },
                        { title: 'File Explorer', desc: 'Browse pictures, documents, and system file hierarchy.' },
                        { title: 'Notepad', desc: 'Full-featured text editor with line numbers, word wrap, and TXT save/export.' },
                        { title: 'Calculator', desc: 'Standard calculator with math operations, memory storage, and history.' },
                        { title: 'Whiteboard', desc: 'Interactive HTML5 Canvas drawing board with pen, highlighter, eraser, and PNG export.' },
                        { title: 'Terminal', desc: 'Command-line interface with interactive PowerShell-like commands.' },
                        { title: 'Task Manager', desc: 'Monitor active running window tasks, system resource metrics, and close windows.' },
                        { title: 'Photos', desc: 'High-definition media gallery viewer with zoom and controls.' },
                    ].map((app, i) => (
                        <div key={i} className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/5 p-3">
                            <CheckCircle className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                            <div>
                                <div className="text-xs font-semibold text-white">{app.title}</div>
                                <div className="text-[11px] text-white/60">{app.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        ),
    },
    {
        id: 'shortcuts',
        title: 'Shortcuts & Controls',
        icon: Command,
        content: (
            <div className="space-y-3">
                <h4 className="text-xs font-semibold text-white/80 uppercase tracking-wider">Keyboard & Window Controls</h4>
                <div className="space-y-2">
                    {[
                        { key: 'Double Click Icon', desc: 'Launch desktop application' },
                        { key: 'Double Click Titlebar', desc: 'Toggle window maximize / restore' },
                        { key: 'Escape Key', desc: 'Restore maximized window to normal size' },
                        { key: 'Taskbar Click', desc: 'Focus window or minimize/toggle active window' },
                        { key: 'Right Click Desktop', desc: 'Open desktop context menu' },
                        { key: 'Start Menu Search', desc: 'Type to filter apps and press Enter to launch top result' },
                    ].map((s, i) => (
                        <div key={i} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-xs">
                            <span className="font-mono text-blue-400 font-semibold">{s.key}</span>
                            <span className="text-white/70">{s.desc}</span>
                        </div>
                    ))}
                </div>
            </div>
        ),
    },
    {
        id: 'terminal',
        title: 'Terminal Commands',
        icon: Terminal,
        content: (
            <div className="space-y-3">
                <h4 className="text-xs font-semibold text-white/80 uppercase tracking-wider">Available CLI Commands</h4>
                <div className="space-y-2 font-mono text-xs">
                    {[
                        { cmd: 'help', desc: 'List all available terminal commands' },
                        { cmd: 'open <app>', desc: 'Launch app (e.g. open photos, open notepad, open calculator)' },
                        { cmd: 'cls / clear', desc: 'Clear terminal output stream' },
                        { cmd: 'sysinfo', desc: 'Display hardware and OS system specifications' },
                        { cmd: 'ls / dir', desc: 'List files in current directory' },
                        { cmd: 'cat <file>', desc: 'Display text content of target file' },
                    ].map((c, i) => (
                        <div key={i} className="flex items-center justify-between rounded-lg border border-white/5 bg-[#121215] p-2.5">
                            <span className="text-emerald-400 font-semibold">{c.cmd}</span>
                            <span className="text-white/60 text-[11px] font-sans">{c.desc}</span>
                        </div>
                    ))}
                </div>
            </div>
        ),
    },
];

export default function GetStarted({ openApp }) {
    const { isMobile, isTablet } = useDeviceMode();
    const [activeSection, setActiveSection] = useState('overview');
    
    const WIKI_SECTIONS = getWikiSections(isMobile, openApp);
    const section = WIKI_SECTIONS.find((s) => s.id === activeSection) || WIKI_SECTIONS[0];

    return (
        <div className={`flex h-full w-full bg-[#18181c] text-white select-none overflow-hidden font-sans ${isMobile ? 'flex-col' : ''}`}>
            {/* Sidebar Navigation */}
            <div className={`${isMobile ? 'w-full overflow-x-auto border-b p-2 flex-row' : 'w-52 shrink-0 border-r p-3 flex-col'} border-white/10 bg-[#1f1f24] flex justify-between`}>
                <div className={isMobile ? 'flex gap-2 w-full' : ''}>
                    {!isMobile && (
                        <div className="flex items-center gap-2 px-2 py-3 mb-2 border-b border-white/10">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow">
                                <Compass className="h-4 w-4" />
                            </div>
                            <div>
                                <div className="text-xs font-bold leading-tight">Get Started</div>
                                <div className="text-[10px] text-white/50">Wiki & Guide</div>
                            </div>
                        </div>
                    )}

                    <div className={`space-y-1 ${isMobile ? 'flex gap-2 w-full whitespace-nowrap overflow-x-auto no-scrollbar' : ''}`}>
                        {WIKI_SECTIONS.map((s) => {
                            const Icon = s.icon;
                            const isActive = s.id === activeSection;
                            return (
                                <button
                                    key={s.id}
                                    onClick={() => setActiveSection(s.id)}
                                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-colors ${
                                        isActive
                                            ? 'bg-blue-600/25 text-blue-400 border border-blue-500/30'
                                            : 'text-white/70 hover:bg-white/10 hover:text-white'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Icon className="h-4 w-4 shrink-0" />
                                        <span>{s.title}</span>
                                    </div>
                                    {!isMobile && <ArrowRight className={`h-3 w-3 transition-transform ${isActive ? 'translate-x-0' : 'opacity-0'}`} />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {!isMobile && (
                    <div className="rounded-lg border border-white/10 bg-black/20 p-2.5 text-center text-[10px] text-white/50">
                        <div>Aiyu OS v{APP_VERSION}</div>
                        <div>Windows 11 Web Edition</div>
                    </div>
                )}
            </div>

            {/* Main Section Content */}
            <div className={`flex-1 overflow-y-auto ${isMobile ? 'p-3' : 'p-5'} custom-scrollbar`}>
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/10">
                    <section.icon className="h-5 w-5 text-blue-400" />
                    <h2 className="text-base font-bold text-white">{section.title}</h2>
                </div>

                {section.content}
            </div>
        </div>
    );
}
