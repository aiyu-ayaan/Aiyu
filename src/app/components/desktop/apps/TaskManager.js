"use client";
import React, { useState, useEffect, useMemo } from 'react';
import {
    Activity,
    Cpu,
    HardDrive,
    Wifi,
    Play,
    XSquare,
    RefreshCw,
    Search,
    Clock,
    Shield,
    Sliders,
    Zap,
    Plus,
    Monitor,
} from 'lucide-react';

import { useDeviceName } from '../useDeviceName';
import { useDeviceMode } from '../../../context/DeviceModeContext';

const TABS = [
    { key: 'processes', label: 'Processes', icon: Activity },
    { key: 'performance', label: 'Performance', icon: Cpu },
    { key: 'history', label: 'App history', icon: Clock },
    { key: 'startup', label: 'Startup apps', icon: Zap },
];

const BACKGROUND_SERVICES = [
    { id: 'sys-shell', name: 'Aiyu Desktop Shell', cpu: 0.8, mem: 48.2, disk: 0.1, net: 0.0, category: 'System' },
    { id: 'sys-wm', name: 'Window Manager (Compositor)', cpu: 1.4, mem: 34.5, disk: 0.0, net: 0.0, category: 'System' },
    { id: 'sys-audio', name: 'Audio Engine Host', cpu: 0.2, mem: 12.1, disk: 0.0, net: 0.0, category: 'System' },
    { id: 'sys-net', name: 'Network Protocol Adapter', cpu: 0.1, mem: 18.7, disk: 0.0, net: 0.2, category: 'System' },
    { id: 'sys-search', name: 'Indexer & Search Host', cpu: 0.4, mem: 24.0, disk: 0.2, net: 0.0, category: 'System' },
    { id: 'sys-security', name: 'Aiyu Defender Service', cpu: 0.3, mem: 56.4, disk: 0.0, net: 0.0, category: 'System' },
];

const STARTUP_APPS = [
    { name: 'Aiyu OS Desktop Shell', publisher: 'Aiyu Core', status: 'Enabled', impact: 'High' },
    { name: 'Window Manager', publisher: 'Aiyu Core', status: 'Enabled', impact: 'Medium' },
    { name: 'Audio Service Host', publisher: 'Aiyu Audio', status: 'Enabled', impact: 'Low' },
    { name: 'Network Adapter', publisher: 'Aiyu Network', status: 'Enabled', impact: 'Low' },
    { name: 'GitHub Desktop Service', publisher: 'GitHub, Inc.', status: 'Disabled', impact: 'None' },
];

export default function TaskManager({ windows = [], closeWin, openApp, config = {}, toggleStart, openStartMenu }) {
    const { isMobile, isTablet } = useDeviceMode();
    const [deviceName] = useDeviceName(config);
    const [tab, setTab] = useState('processes');
    const [selectedId, setSelectedId] = useState(null);
    const [filterQuery, setFilterQuery] = useState('');
    const [perfSubTab, setPerfSubTab] = useState('cpu');

    // Live performance metrics state
    const [cpuHistory, setCpuHistory] = useState([15, 22, 18, 30, 25, 19, 12, 28, 20, 16, 24, 18]);
    const [memHistory, setMemHistory] = useState([42, 43, 42, 44, 45, 44, 43, 45, 46, 45, 45, 46]);
    const [currentCpu, setCurrentCpu] = useState(18);
    const [currentMem, setCurrentMem] = useState(45);
    const [coresCount, setCoresCount] = useState(8);

    useEffect(() => {
        if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) {
            setCoresCount(navigator.hardwareConcurrency);
        }
    }, []);

    // Periodic live performance graph updates. Only the Performance pane reads
    // these, so the timer stays parked while another tab is showing or the
    // browser tab is in the background — otherwise it re-rendered Task Manager
    // every 1.5s for the entire life of the window.
    useEffect(() => {
        if (tab !== 'performance') return;

        let interval = null;
        const tick = () => {
            const nextCpu = Math.floor(12 + Math.random() * 25);
            const nextMem = Math.floor(42 + Math.random() * 8);

            setCurrentCpu(nextCpu);
            setCurrentMem(nextMem);

            setCpuHistory((prev) => [...prev.slice(1), nextCpu]);
            setMemHistory((prev) => [...prev.slice(1), nextMem]);
        };

        const start = () => {
            if (interval) return;
            interval = setInterval(tick, 1500);
        };
        const stop = () => {
            if (!interval) return;
            clearInterval(interval);
            interval = null;
        };
        const onVisibility = () => (document.hidden ? stop() : start());

        onVisibility();
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            stop();
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [tab]);

    // Map open window instances into process entries. The per-process figures
    // are derived from the window id rather than Math.random(), so they stay put
    // instead of re-rolling (and re-rendering the whole table) every time a
    // window is moved, focused or minimized.
    const runningAppProcesses = useMemo(() => {
        return windows.map((w) => {
            const seed = (w.id * 2654435761) % 1000 / 1000;
            return {
                id: w.id,
                isWindow: true,
                name: w.title || 'App Window',
                appKey: w.appKey,
                icon: w.icon,
                cpu: (seed * 2.5 + 0.3).toFixed(1),
                mem: (seed * 60 + 80).toFixed(1),
                disk: 0.0,
                net: 0.1,
                category: 'Apps',
            };
        });
    }, [windows]);

    const handleEndTask = () => {
        if (!selectedId) return;
        const target = runningAppProcesses.find((p) => p.id === selectedId);
        if (target && target.isWindow && closeWin) {
            closeWin(selectedId);
            setSelectedId(null);
        }
    };

    const totalAppCpu = useMemo(() => {
        const appSum = runningAppProcesses.reduce((acc, p) => acc + parseFloat(p.cpu), 0);
        return (appSum + 4.2).toFixed(1);
    }, [runningAppProcesses]);

    const totalAppMem = useMemo(() => {
        const appSum = runningAppProcesses.reduce((acc, p) => acc + parseFloat(p.mem), 0);
        return (appSum + 180).toFixed(0);
    }, [runningAppProcesses]);

    return (
        <div className={`flex h-full w-full flex-col bg-[#f3f3f3] text-neutral-800 dark:bg-[#202020] dark:text-neutral-100 select-none ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
            {/* Command Bar Header */}
            <div className={`flex items-center justify-between border-b border-black/10 bg-white/70 py-2 backdrop-blur dark:border-white/10 dark:bg-[#262626] ${isMobile ? 'px-2' : 'px-4'}`}>
                <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-white">
                        <Activity className="h-4 w-4" />
                    </div>
                    <div>
                        <div className="font-semibold text-sm">Task Manager</div>
                        <div className="text-[10px] opacity-60">
                            {deviceName} · {runningAppProcesses.length} active apps
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            if (openStartMenu) {
                                openStartMenu();
                            } else if (toggleStart) {
                                toggleStart();
                            } else {
                                openApp?.('explorer');
                            }
                        }}
                        className="flex items-center gap-1.5 rounded border border-black/10 bg-black/5 px-2.5 py-1 font-medium hover:bg-black/10 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                    >
                        <Plus className="h-3.5 w-3.5" /> Run new task
                    </button>
                    {tab === 'processes' && (
                        <button
                            onClick={handleEndTask}
                            disabled={!selectedId || !runningAppProcesses.some((p) => p.id === selectedId)}
                            className="flex items-center gap-1.5 rounded bg-red-600 px-3 py-1 font-medium text-white hover:bg-red-700 disabled:opacity-40"
                        >
                            <XSquare className="h-3.5 w-3.5" /> End task
                        </button>
                    )}
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className={`flex border-b border-black/10 bg-[#eaeeea] px-2 dark:border-white/10 dark:bg-[#27272a] ${isMobile ? 'overflow-x-auto scrollbar-hide' : ''}`}>
                {TABS.map((t) => {
                    const Icon = t.icon;
                    const isActive = tab === t.key;
                    return (
                        <button
                            key={t.key}
                            onClick={() => {
                                setTab(t.key);
                                setSelectedId(null);
                            }}
                            className={`flex items-center gap-2 border-b-2 px-3 py-2 font-medium transition ${
                                isActive
                                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                                    : 'border-transparent opacity-60 hover:opacity-100'
                            }`}
                        >
                            <Icon className="h-4 w-4" /> {t.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Body */}
            <div className="min-h-0 flex-1 overflow-hidden">
                {tab === 'processes' && (
                    <ProcessesPane
                        runningApps={runningAppProcesses}
                        services={BACKGROUND_SERVICES}
                        selectedId={selectedId}
                        onSelect={setSelectedId}
                        filterQuery={filterQuery}
                        setFilterQuery={setFilterQuery}
                        totalCpu={totalAppCpu}
                        totalMem={totalAppMem}
                        isMobile={isMobile}
                    />
                )}

                {tab === 'performance' && (
                    <PerformancePane
                        subTab={perfSubTab}
                        setSubTab={setPerfSubTab}
                        currentCpu={currentCpu}
                        currentMem={currentMem}
                        cpuHistory={cpuHistory}
                        memHistory={memHistory}
                        coresCount={coresCount}
                        deviceName={deviceName}
                        isMobile={isMobile}
                        isTablet={isTablet}
                    />
                )}

                {tab === 'history' && <AppHistoryPane apps={runningAppProcesses} />}

                {tab === 'startup' && <StartupAppsPane items={STARTUP_APPS} />}
            </div>

            {/* Status Footer */}
            <div className="flex items-center justify-between border-t border-black/10 bg-white px-3 py-1 text-[11px] opacity-70 dark:border-white/10 dark:bg-[#1e1e1e]">
                <div className="flex gap-4">
                    <span>Processes: {runningAppProcesses.length + BACKGROUND_SERVICES.length}</span>
                    <span>CPU: {totalAppCpu}%</span>
                    <span>Memory: {totalAppMem} MB</span>
                </div>
                <span>Aiyu OS Task Manager</span>
            </div>
        </div>
    );
}

// 1. PROCESSES TAB PANE
function ProcessesPane({
    runningApps,
    services,
    selectedId,
    onSelect,
    filterQuery,
    setFilterQuery,
    totalCpu,
    totalMem,
    isMobile,
}) {
    const filteredApps = runningApps.filter((a) =>
        a.name.toLowerCase().includes(filterQuery.toLowerCase())
    );
    const filteredServices = services.filter((s) =>
        s.name.toLowerCase().includes(filterQuery.toLowerCase())
    );

    return (
        <div className="flex h-full flex-col">
            {/* Filter Search */}
            <div className="flex items-center gap-2 border-b border-black/10 bg-white px-3 py-1.5 dark:border-white/10 dark:bg-[#1e1e1e]">
                <Search className="h-3.5 w-3.5 opacity-50" />
                <input
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    placeholder="Type name to filter processes"
                    className="w-full bg-transparent outline-none placeholder:opacity-50"
                />
            </div>

            {/* Process Table */}
            <div className={`min-h-0 flex-1 overflow-y-auto ${isMobile ? 'overflow-x-auto' : ''}`}>
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-[#e5e5e5] dark:bg-[#2a2a2a] text-[11px] font-semibold opacity-80 border-b border-black/10 dark:border-white/10 z-10">
                        <tr>
                            <th className="py-1.5 px-3">Name</th>
                            <th className="py-1.5 px-3 w-20 text-right">CPU ({totalCpu}%)</th>
                            <th className="py-1.5 px-3 w-28 text-right">Memory ({totalMem} MB)</th>
                            <th className="py-1.5 px-3 w-20 text-right">Disk</th>
                            <th className="py-1.5 px-3 w-24 text-right">Network</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                        {/* Apps Header */}
                        <tr className="bg-black/5 dark:bg-white/5 font-semibold text-[10px] uppercase opacity-60">
                            <td colSpan={5} className="py-1 px-3">
                                Apps ({filteredApps.length})
                            </td>
                        </tr>

                        {filteredApps.map((app) => {
                            const isSelected = selectedId === app.id;
                            const Icon = app.icon || Monitor;
                            return (
                                <tr
                                    key={app.id}
                                    onClick={() => onSelect(app.id)}
                                    className={`cursor-pointer transition ${
                                        isSelected
                                            ? 'bg-blue-500/20 text-blue-600 dark:text-blue-300 font-medium'
                                            : 'hover:bg-black/5 dark:hover:bg-white/5'
                                    }`}
                                >
                                    <td className="py-1.5 px-3 flex items-center gap-2">
                                        <Icon className="h-4 w-4 text-blue-500 shrink-0" />
                                        <span className="truncate">{app.name}</span>
                                    </td>
                                    <td className="py-1.5 px-3 text-right tabular-nums opacity-80">{app.cpu}%</td>
                                    <td className="py-1.5 px-3 text-right tabular-nums opacity-80">{app.mem} MB</td>
                                    <td className="py-1.5 px-3 text-right tabular-nums opacity-50">0.0 MB/s</td>
                                    <td className="py-1.5 px-3 text-right tabular-nums opacity-50">0.1 Mbps</td>
                                </tr>
                            );
                        })}

                        {filteredApps.length === 0 && (
                            <tr>
                                <td colSpan={5} className="py-4 text-center opacity-40">
                                    No active app windows open
                                </td>
                            </tr>
                        )}

                        {/* Background Processes Header */}
                        <tr className="bg-black/5 dark:bg-white/5 font-semibold text-[10px] uppercase opacity-60">
                            <td colSpan={5} className="py-1 px-3">
                                Background processes ({filteredServices.length})
                            </td>
                        </tr>

                        {filteredServices.map((srv) => {
                            const isSelected = selectedId === srv.id;
                            return (
                                <tr
                                    key={srv.id}
                                    onClick={() => onSelect(srv.id)}
                                    className={`cursor-pointer transition ${
                                        isSelected
                                            ? 'bg-blue-500/20 text-blue-600 dark:text-blue-300 font-medium'
                                            : 'hover:bg-black/5 dark:hover:bg-white/5'
                                    }`}
                                >
                                    <td className="py-1.5 px-3 flex items-center gap-2 opacity-80">
                                        <Shield className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                                        <span className="truncate">{srv.name}</span>
                                    </td>
                                    <td className="py-1.5 px-3 text-right tabular-nums opacity-60">{srv.cpu}%</td>
                                    <td className="py-1.5 px-3 text-right tabular-nums opacity-60">{srv.mem} MB</td>
                                    <td className="py-1.5 px-3 text-right tabular-nums opacity-40">{srv.disk} MB/s</td>
                                    <td className="py-1.5 px-3 text-right tabular-nums opacity-40">{srv.net} Mbps</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// 2. PERFORMANCE TAB PANE
function PerformancePane({ subTab, setSubTab, currentCpu, currentMem, cpuHistory, memHistory, coresCount, deviceName, isMobile, isTablet }) {
    const subItems = [
        { key: 'cpu', label: 'CPU', val: `${currentCpu}%`, icon: Cpu },
        { key: 'mem', label: 'Memory', val: `${(currentMem / 100 * 8).toFixed(1)}/8.0 GB (${currentMem}%)`, icon: HardDrive },
        { key: 'disk', label: 'Disk (C:)', val: '0%', icon: Activity },
        { key: 'net', label: 'Ethernet', val: '0.1 Mbps', icon: Wifi },
    ];

    return (
        <div className={`flex h-full w-full ${isMobile || isTablet ? 'flex-col' : ''}`}>
            {/* Left Nav */}
            <div className={`${isMobile || isTablet ? 'w-full flex overflow-x-auto border-b' : 'w-48 shrink-0 overflow-y-auto border-r'} border-black/10 bg-[#e8e8e8] p-2 dark:border-white/10 dark:bg-[#242424] custom-scrollbar`}>
                {subItems.map((s) => {
                    const Icon = s.icon;
                    const isActive = subTab === s.key;
                    return (
                        <button
                            key={s.key}
                            onClick={() => setSubTab(s.key)}
                            className={`mb-1 flex ${isMobile || isTablet ? 'w-auto px-4 mr-2 min-w-[120px] flex-col items-center justify-center gap-1' : 'w-full items-center justify-between'} rounded p-2 text-left transition ${
                                isActive ? 'bg-blue-600 text-white shadow' : 'hover:bg-black/5 dark:hover:bg-white/5'
                            }`}
                        >
                            <div className={`flex items-center gap-2 ${isMobile || isTablet ? 'flex-col' : ''}`}>
                                <Icon className="h-4 w-4" />
                                <span className={`font-medium ${isMobile || isTablet ? 'text-[11px]' : ''}`}>{s.label}</span>
                            </div>
                            <span className="text-[10px] tabular-nums opacity-80">{s.val}</span>
                        </button>
                    );
                })}
            </div>

            {/* Right Graph Stage */}
            <div className={`flex min-w-0 flex-1 flex-col overflow-y-auto ${isMobile ? 'p-2' : 'p-4'}`}>
                <div className="flex items-center justify-between mb-4 border-b border-black/10 pb-2 dark:border-white/10">
                    <div>
                        <h2 className="text-base font-semibold">
                            {subTab === 'cpu' ? 'Central Processing Unit (CPU)' : 'Memory (RAM)'}
                        </h2>
                        <p className="text-[11px] opacity-60">{deviceName} · Virtual Web Concurrency Engine</p>
                    </div>
                    <div className="text-right">
                        <div className="text-xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
                            {subTab === 'cpu' ? `${currentCpu}%` : `${currentMem}%`}
                        </div>
                        <div className="text-[10px] opacity-50">Overall utilization</div>
                    </div>
                </div>

                {/* Animated SVG Graph */}
                <div className="relative h-44 w-full rounded-lg border border-black/10 bg-black/5 p-3 dark:border-white/10 dark:bg-black/30">
                    <svg className="h-full w-full overflow-visible" viewBox="0 0 100 50" preserveAspectRatio="none">
                        <defs>
                            <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                            </linearGradient>
                        </defs>
                        {/* Grid lines */}
                        <line x1="0" y1="12.5" x2="100" y2="12.5" stroke="currentColor" opacity="0.1" strokeDasharray="2" />
                        <line x1="0" y1="25" x2="100" y2="25" stroke="currentColor" opacity="0.1" strokeDasharray="2" />
                        <line x1="0" y1="37.5" x2="100" y2="37.5" stroke="currentColor" opacity="0.1" strokeDasharray="2" />

                        {/* Line path */}
                        {(() => {
                            const data = subTab === 'cpu' ? cpuHistory : memHistory;
                            const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${50 - (v / 100) * 45}`);
                            const pathStr = `M ${pts.join(' L ')}`;
                            const areaStr = `${pathStr} L 100,50 L 0,50 Z`;
                            return (
                                <>
                                    <path d={areaStr} fill="url(#perfGrad)" />
                                    <path d={pathStr} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
                                </>
                            );
                        })()}
                    </svg>
                </div>

                {/* Specs Details */}
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
                    <SpecTile label="Utilization" val={`${subTab === 'cpu' ? currentCpu : currentMem}%`} />
                    <SpecTile label="Speed / Speed" val="2.80 GHz" />
                    <SpecTile label="Logical Processors" val={`${coresCount} Cores`} />
                    <SpecTile label="System Architecture" val="WebAssembly 64-bit" />
                </div>
            </div>
        </div>
    );
}

// 3. APP HISTORY TAB PANE
function AppHistoryPane({ apps }) {
    return (
        <div className="p-4 overflow-y-auto h-full">
            <h3 className="mb-3 font-semibold text-xs opacity-70">Resource usage since last reboot</h3>
            <div className="rounded-lg border border-black/10 dark:border-white/10 overflow-hidden bg-white dark:bg-[#1b1b1b]">
                <table className="w-full text-left">
                    <thead className="bg-[#e5e5e5] dark:bg-[#2a2a2a] text-[11px] font-semibold opacity-80">
                        <tr>
                            <th className="py-2 px-3">App Name</th>
                            <th className="py-2 px-3 text-right">CPU time</th>
                            <th className="py-2 px-3 text-right">Network</th>
                            <th className="py-2 px-3 text-right">Tile updates</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                        {apps.map((a) => (
                            <tr key={a.id} className="hover:bg-black/5 dark:hover:bg-white/5">
                                <td className="py-2 px-3 font-medium">{a.name}</td>
                                <td className="py-2 px-3 text-right tabular-nums opacity-70">0:00:12</td>
                                <td className="py-2 px-3 text-right tabular-nums opacity-70">1.4 MB</td>
                                <td className="py-2 px-3 text-right tabular-nums opacity-70">Low</td>
                            </tr>
                        ))}
                        {apps.length === 0 && (
                            <tr>
                                <td colSpan={4} className="py-6 text-center opacity-40">
                                    No app history recorded yet
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// 4. STARTUP APPS TAB PANE
function StartupAppsPane({ items }) {
    return (
        <div className="p-4 overflow-y-auto h-full">
            <h3 className="mb-3 font-semibold text-xs opacity-70">Apps configured to launch at login</h3>
            <div className="rounded-lg border border-black/10 dark:border-white/10 overflow-hidden bg-white dark:bg-[#1b1b1b]">
                <table className="w-full text-left">
                    <thead className="bg-[#e5e5e5] dark:bg-[#2a2a2a] text-[11px] font-semibold opacity-80">
                        <tr>
                            <th className="py-2 px-3">App Name</th>
                            <th className="py-2 px-3">Publisher</th>
                            <th className="py-2 px-3">Status</th>
                            <th className="py-2 px-3 text-right">Startup Impact</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                        {items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-black/5 dark:hover:bg-white/5">
                                <td className="py-2 px-3 font-medium">{item.name}</td>
                                <td className="py-2 px-3 opacity-60">{item.publisher}</td>
                                <td className="py-2 px-3">
                                    <span
                                        className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold ${
                                            item.status === 'Enabled'
                                                ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                                                : 'bg-black/10 text-neutral-500 dark:bg-white/10 dark:text-neutral-400'
                                        }`}
                                    >
                                        {item.status}
                                    </span>
                                </td>
                                <td className="py-2 px-3 text-right tabular-nums opacity-70">{item.impact}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function SpecTile({ label, val }) {
    return (
        <div className="rounded border border-black/10 bg-black/5 p-2 dark:border-white/10 dark:bg-white/5">
            <div className="text-[10px] opacity-50 uppercase">{label}</div>
            <div className="font-semibold text-xs mt-0.5">{val}</div>
        </div>
    );
}
