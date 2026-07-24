"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    Monitor,
    Palette,
    Info,
    Cpu,
    HardDrive,
    Wifi,
    Battery,
    ExternalLink,
    Gauge,
    Globe,
} from 'lucide-react';

const SECTIONS = [
    { key: 'system', label: 'System', icon: Monitor },
    { key: 'personalization', label: 'Personalization', icon: Palette },
    { key: 'about', label: 'About', icon: Info },
];

// Full Windows 11 style Settings: System (live device info), Personalization
// (wallpaper preview + admin link) and About. Device name / OS labels come from
// the desktop config; live metrics are read from the browser at runtime.
export default function Settings({ wallpaper, config = {} }) {
    const [pane, setPane] = useState('system');
    const sys = useSystemInfo();
    const deviceName = config.deviceName || 'AIYU-PORTFOLIO';
    const osVersion = config.osVersion || '4.9.2';

    return (
        <div className="flex h-full w-full bg-[#f3f3f3] text-neutral-800 dark:bg-[#202020] dark:text-neutral-100">
            {/* Sidebar */}
            <aside className="hidden w-52 shrink-0 overflow-y-auto border-r border-black/10 p-3 dark:border-white/10 sm:block">
                <div className="mb-4 px-2">
                    <div className="text-sm font-semibold">Settings</div>
                    <div className="text-[11px] opacity-50">{deviceName}</div>
                </div>
                {SECTIONS.map((s) => (
                    <button
                        key={s.key}
                        onClick={() => setPane(s.key)}
                        className={`mb-0.5 flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm ${
                            pane === s.key ? 'bg-blue-500/15 text-blue-600 dark:text-blue-300' : 'hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                    >
                        <s.icon className="h-4 w-4" /> {s.label}
                    </button>
                ))}
            </aside>

            <div className="min-w-0 flex-1 overflow-y-auto p-6">
                {/* Mobile pane switcher */}
                <div className="mb-4 flex gap-2 sm:hidden">
                    {SECTIONS.map((s) => (
                        <button
                            key={s.key}
                            onClick={() => setPane(s.key)}
                            className={`rounded-full px-3 py-1 text-xs ${pane === s.key ? 'bg-blue-600 text-white' : 'bg-black/5 dark:bg-white/10'}`}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>

                {pane === 'system' && <SystemPane sys={sys} deviceName={deviceName} osVersion={osVersion} />}
                {pane === 'personalization' && <PersonalizationPane wallpaper={wallpaper} />}
                {pane === 'about' && <AboutPane sys={sys} deviceName={deviceName} osVersion={osVersion} />}
            </div>
        </div>
    );
}

function SystemPane({ sys, deviceName, osVersion }) {
    const tiles = [
        { icon: Cpu, label: 'Processor', value: `Web Runtime · ${sys.cores} logical cores` },
        { icon: HardDrive, label: 'Installed RAM', value: sys.memory },
        { icon: Monitor, label: 'Display', value: sys.screen, sub: `${sys.dpr}× scaling · ${sys.colorDepth}-bit color` },
        { icon: Gauge, label: 'Graphics', value: sys.gpu },
        { icon: Wifi, label: 'Network', value: sys.online ? `Online${sys.connection ? ` · ${sys.connection}` : ''}` : 'Offline' },
        { icon: Battery, label: 'Battery', value: sys.battery },
    ];

    return (
        <div>
            <h2 className="mb-1 text-xl font-semibold">System</h2>
            <p className="mb-6 text-sm opacity-60">
                {deviceName} · Aiyu OS {osVersion}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
                {tiles.map((t) => (
                    <div key={t.label} className="rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-wide opacity-50">
                            <t.icon className="h-3.5 w-3.5" /> {t.label}
                        </div>
                        <div className="mt-1 text-sm font-medium">{t.value}</div>
                        {t.sub && <div className="text-xs opacity-50">{t.sub}</div>}
                    </div>
                ))}
            </div>
        </div>
    );
}

function PersonalizationPane({ wallpaper }) {
    return (
        <div>
            <h2 className="mb-1 text-xl font-semibold">Personalization</h2>
            <p className="mb-6 text-sm opacity-60">Background</p>

            <div className="mb-6 overflow-hidden rounded-lg border border-black/10 dark:border-white/10">
                <div
                    className="flex h-44 items-end bg-cover bg-center p-3"
                    style={
                        wallpaper
                            ? { backgroundImage: `url(${wallpaper})` }
                            : { background: 'radial-gradient(120% 120% at 30% 20%, #4a9eff 0%, #2b6fd6 35%, #1b3a8f 70%, #0b1d54 100%)' }
                    }
                >
                    <span className="rounded bg-black/40 px-2 py-1 text-xs text-white">Current background</span>
                </div>
            </div>

            <div className="rounded-lg border border-black/10 bg-white p-4 text-sm dark:border-white/10 dark:bg-white/5">
                <p className="mb-3 opacity-80">
                    The desktop wallpaper and device details are managed from the admin Desktop panel. Set an image URL
                    there to personalize this background.
                </p>
                <Link
                    href="/admin/desktop"
                    className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                >
                    Open Desktop Settings <ExternalLink className="h-3.5 w-3.5" />
                </Link>
            </div>
        </div>
    );
}

function AboutPane({ sys, deviceName, osVersion }) {
    const rows = [
        ['Device name', deviceName],
        ['Processor', `Web Runtime · ${sys.cores} logical cores`],
        ['Installed RAM', sys.memory],
        ['Display', sys.screen],
        ['Edition', 'Aiyu OS 11 Pro (Portfolio Edition)'],
        ['Version', osVersion],
        ['Platform', sys.platform],
        ['Rendered by', 'Next.js + React'],
    ];
    return (
        <div>
            <div className="mb-6 flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                    <Cpu className="h-7 w-7" />
                </div>
                <div>
                    <h2 className="text-xl font-semibold">About</h2>
                    <p className="text-sm opacity-60">Aiyu OS — a Windows 11 tribute built into the portfolio</p>
                </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-black/10 bg-white dark:border-white/10 dark:bg-white/5">
                {rows.map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between border-b border-black/5 px-4 py-2.5 text-sm last:border-0 dark:border-white/5">
                        <span className="opacity-60">{k}</span>
                        <span className="text-right font-medium">{v}</span>
                    </div>
                ))}
            </div>

            <div className="mt-6 rounded-lg border border-black/10 bg-white p-4 text-xs dark:border-white/10 dark:bg-white/5">
                <div className="mb-1 flex items-center gap-1.5 font-medium">
                    <Globe className="h-3.5 w-3.5" /> User agent
                </div>
                <code className="break-all opacity-60">{sys.ua}</code>
            </div>
        </div>
    );
}

// Collects best-effort live system info from browser APIs.
function useSystemInfo() {
    const [info, setInfo] = useState({
        ua: '',
        cores: '—',
        memory: 'Streamed from the cloud',
        screen: '—',
        dpr: 1,
        colorDepth: 24,
        gpu: 'Hardware accelerated',
        platform: '—',
        online: true,
        connection: '',
        battery: '—',
    });

    useEffect(() => {
        const next = {
            ua: navigator.userAgent,
            cores: String(navigator.hardwareConcurrency || '—'),
            memory: navigator.deviceMemory ? `${navigator.deviceMemory} GB (approx.)` : 'Streamed from the cloud',
            screen: `${window.screen.width} × ${window.screen.height}`,
            dpr: window.devicePixelRatio || 1,
            colorDepth: window.screen.colorDepth || 24,
            gpu: readGpu(),
            platform: navigator.platform || '—',
            online: navigator.onLine,
            connection: navigator.connection?.effectiveType?.toUpperCase() || '',
            battery: '—',
        };
        setInfo((prev) => ({ ...prev, ...next }));

        navigator.getBattery?.().then((b) => {
            setInfo((prev) => ({
                ...prev,
                battery: `${Math.round(b.level * 100)}%${b.charging ? ' · charging' : ''}`,
            }));
        }).catch(() => {});

        const onNet = () => setInfo((prev) => ({ ...prev, online: navigator.onLine }));
        window.addEventListener('online', onNet);
        window.addEventListener('offline', onNet);
        return () => {
            window.removeEventListener('online', onNet);
            window.removeEventListener('offline', onNet);
        };
    }, []);

    return info;
}

function readGpu() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        const ext = gl?.getExtension('WEBGL_debug_renderer_info');
        const renderer = ext && gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
        return renderer || 'Hardware accelerated';
    } catch {
        return 'Hardware accelerated';
    }
}
