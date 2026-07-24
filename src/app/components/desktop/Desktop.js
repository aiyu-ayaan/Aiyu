"use client";
import React, { useCallback, useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Loader2, Power, RotateCcw } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { ExplorerIcon, VSCodeIcon, ChromeIcon, SettingsIcon, ThisPCIcon, EdgeIcon, PhotosIcon, GitHubIcon, TaskManagerIcon, TerminalIcon, NotepadIcon, CalculatorIcon, WhiteboardIcon, GetStartedIcon } from './icons';
import Window from './Window';
import Taskbar from './Taskbar';
import StartMenu from './StartMenu';
import WidgetsPanel from './WidgetsPanel';
import FileExplorer from './apps/FileExplorer';
import CodeEditor from './apps/CodeEditor';
import Browser from './apps/Browser';
import Settings from './apps/Settings';
import AboutThisPC from './apps/AboutThisPC';
import Photos from './apps/Photos';
import GitHub from './apps/GitHub';
import TaskManager from './apps/TaskManager';
import Terminal from './apps/Terminal';
import Notepad from './apps/Notepad';
import Calculator from './apps/Calculator';
import Whiteboard from './apps/Whiteboard';
import GetStarted from './apps/GetStarted';
import MarkdownViewer from './apps/MarkdownViewer';
import { FileText } from 'lucide-react';

// App registry. `render` receives a desktop context: { wallpaper, config,
// openApp, payload }. `payload` is per-window data (e.g. the image list Photos
// should show). Apps with `hidden: true` are launchable but not shown as a
// desktop icon (they open via other apps, e.g. Photos from File Explorer).
const buildApps = () => [
    {
        key: 'explorer',
        title: 'File Explorer',
        icon: ExplorerIcon,
        w: 820,
        h: 540,
        render: (ctx) => <FileExplorer openApp={ctx.openApp} />,
    },
    {
        key: 'photos',
        title: 'Photos',
        icon: PhotosIcon,
        w: 860,
        h: 600,
        render: (ctx) => <Photos payload={ctx.payload} />,
    },
    {
        key: 'code',
        title: 'Visual Studio Code',
        icon: VSCodeIcon,
        w: 900,
        h: 580,
        render: () => <CodeEditor />,
    },
    {
        key: 'notepad',
        title: 'Notepad',
        icon: NotepadIcon,
        w: 720,
        h: 500,
        render: () => <Notepad />,
    },
    {
        key: 'calculator',
        title: 'Calculator',
        icon: CalculatorIcon,
        w: 360,
        h: 520,
        render: () => <Calculator />,
    },
    {
        key: 'whiteboard',
        title: 'Whiteboard',
        icon: WhiteboardIcon,
        w: 880,
        h: 580,
        render: () => <Whiteboard />,
    },
    {
        key: 'browser',
        title: 'Google Chrome',
        icon: ChromeIcon,
        w: 940,
        h: 600,
        render: (ctx) => <Browser payload={ctx.payload} closeWin={ctx.closeWin} />,
    },
    {
        key: 'markdown',
        title: 'Markdown Viewer',
        icon: FileText,
        w: 920,
        h: 620,
        render: (ctx) => <MarkdownViewer payload={ctx.payload} openApp={ctx.openApp} />,
    },
    {
        key: 'github',
        title: 'GitHub',
        icon: GitHubIcon,
        w: 900,
        h: 600,
        render: () => <GitHub />,
    },
    {
        key: 'terminal',
        title: 'Terminal',
        icon: TerminalIcon,
        w: 800,
        h: 500,
        render: (ctx) => <Terminal openApp={ctx.openApp} config={ctx.config} />,
    },
    {
        key: 'taskmanager',
        title: 'Task Manager',
        icon: TaskManagerIcon,
        w: 840,
        h: 560,
        render: (ctx) => (
            <TaskManager
                windows={ctx.windows}
                closeWin={ctx.closeWin}
                openApp={ctx.openApp}
                config={ctx.config}
            />
        ),
    },
    {
        key: 'settings',
        title: 'Settings',
        icon: SettingsIcon,
        w: 760,
        h: 520,
        render: (ctx) => <Settings wallpaper={ctx.wallpaper} config={ctx.config} />,
    },
    {
        key: 'about',
        title: 'This PC',
        icon: ThisPCIcon,
        w: 620,
        h: 520,
        render: () => <AboutThisPC />,
    },
    {
        key: 'getstarted',
        title: 'Get Started',
        icon: GetStartedIcon,
        w: 780,
        h: 540,
        render: (ctx) => <GetStarted openApp={ctx.openApp} />,
    },
];

const BLOOM =
    'radial-gradient(140% 120% at 28% 18%, #58a6ff 0%, #2f7be0 28%, #1e4fb0 52%, #122a7a 74%, #0a1550 100%)';

let uid = 1;

export default function Desktop({ wallpaper, config = {} }) {
    const apps = React.useMemo(() => buildApps(), []);
    const appMap = React.useMemo(() => Object.fromEntries(apps.map((a) => [a.key, a])), [apps]);

    const [windows, setWindows] = useState([]);
    const [activeId, setActiveId] = useState(null);
    const [topZ, setTopZ] = useState(10);
    const [startOpen, setStartOpen] = useState(false);
    const [widgetsOpen, setWidgetsOpen] = useState(false);
    const [menu, setMenu] = useState(null); // { x, y } desktop context menu
    const [systemState, setSystemState] = useState('normal'); // 'normal' | 'restarting' | 'shutting_down' | 'powered_off'
    const [countdown, setCountdown] = useState(5);

    const handleRestart = useCallback(() => {
        setSystemState('restarting');
        try {
            if (typeof window !== 'undefined') {
                sessionStorage.clear();
            }
        } catch {
            // ignore session storage clearance errors
        }
        setTimeout(() => {
            if (typeof window !== 'undefined') {
                window.location.reload();
            }
        }, 1800);
    }, []);

    const handleShutdown = useCallback(() => {
        setSystemState('shutting_down');
        setCountdown(5);
    }, []);

    useEffect(() => {
        if (systemState !== 'shutting_down') return;
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    try {
                        window.close();
                    } catch {
                        // ignore tab close block
                    }
                    setSystemState('powered_off');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [systemState]);

    const focus = useCallback((id) => {
        setTopZ((z) => {
            const next = z + 1;
            setWindows((ws) => ws.map((w) => (w.id === id ? { ...w, z: next, minimized: false } : w)));
            return next;
        });
        setActiveId(id);
    }, []);

    const openApp = useCallback(
        (key, payload) => {
            const app = appMap[key];
            if (!app) return;
            setStartOpen(false);
            setWidgetsOpen(false);
            // If already open, focus the existing window (and refresh its payload
            // so e.g. opening a new image reuses the running Photos window).
            setWindows((ws) => {
                const existing = ws.find((w) => w.appKey === key);
                if (existing) {
                    setActiveId(existing.id);
                    setTopZ((z) => {
                        const next = z + 1;
                        setWindows((cur) =>
                            cur.map((w) =>
                                w.id === existing.id
                                    ? { ...w, z: next, minimized: false, payload: payload ?? w.payload }
                                    : w
                            )
                        );
                        return next;
                    });
                    return ws;
                }
                const id = uid++;
                const offset = (ws.length % 5) * 28;
                const nextZ = topZ + 1;
                setTopZ(nextZ);
                setActiveId(id);
                const maxWorkW = typeof window !== 'undefined' ? window.innerWidth - 30 : app.w;
                const maxWorkH = typeof window !== 'undefined' ? window.innerHeight - 48 - 30 : app.h;
                const w = Math.min(app.w, maxWorkW);
                const h = Math.min(app.h, maxWorkH);
                const y = Math.min(40 + offset, Math.max(0, maxWorkH - h));
                return [
                    ...ws,
                    {
                        id,
                        appKey: key,
                        title: app.title,
                        icon: app.icon,
                        x: 80 + offset,
                        y,
                        w,
                        h,
                        z: nextZ,
                        minimized: false,
                        maximized: false,
                        payload,
                    },
                ];
            });
        },
        [appMap, topZ]
    );

    const closeWin = useCallback((id) => {
        setWindows((ws) => ws.filter((w) => w.id !== id));
    }, []);

    const minimizeWin = useCallback((id) => {
        setWindows((ws) => ws.map((w) => (w.id === id ? { ...w, minimized: true } : w)));
        setActiveId(null);
    }, []);

    const toggleMax = useCallback((id) => {
        setWindows((ws) => ws.map((w) => (w.id === id ? { ...w, maximized: !w.maximized } : w)));
    }, []);

    const moveWin = useCallback((id, x, y) => {
        setWindows((ws) => ws.map((w) => (w.id === id ? { ...w, x, y } : w)));
    }, []);

    const [snapAssist, setSnapAssist] = useState(null); // { targetZone, snappedId }
    const [snapFlyoutTarget, setSnapFlyoutTarget] = useState(null); // { winId, rect }
    const snapFlyoutTimerRef = useRef(null);

    const openSnapFlyout = useCallback((winId, rect) => {
        if (snapFlyoutTimerRef.current) clearTimeout(snapFlyoutTimerRef.current);
        setSnapFlyoutTarget({ winId, rect });
    }, []);

    const closeSnapFlyout = useCallback(() => {
        snapFlyoutTimerRef.current = setTimeout(() => {
            setSnapFlyoutTarget(null);
        }, 300);
    }, []);

    const keepSnapFlyout = useCallback(() => {
        if (snapFlyoutTimerRef.current) clearTimeout(snapFlyoutTimerRef.current);
    }, []);

    const resizeWin = useCallback((id, x, y, w, h) => {
        setWindows((ws) => ws.map((win) => (win.id === id ? { ...win, x, y, w, h, maximized: false } : win)));
    }, []);

    const snapWin = useCallback((id, zone) => {
        if (typeof window === 'undefined') return;
        const workW = window.innerWidth;
        const workH = window.innerHeight - 48;

        let x = 0, y = 0, w = workW, h = workH;

        switch (zone) {
            case 'left-50':
                x = 0; y = 0; w = Math.floor(workW * 0.5); h = workH;
                break;
            case 'right-50':
                x = Math.floor(workW * 0.5); y = 0; w = Math.floor(workW * 0.5); h = workH;
                break;
            case 'left-60':
                x = 0; y = 0; w = Math.floor(workW * 0.6); h = workH;
                break;
            case 'right-40':
                x = Math.floor(workW * 0.6); y = 0; w = Math.floor(workW * 0.4); h = workH;
                break;
            case 'col3-left':
                x = 0; y = 0; w = Math.floor(workW / 3); h = workH;
                break;
            case 'col3-center':
                x = Math.floor(workW / 3); y = 0; w = Math.floor(workW / 3); h = workH;
                break;
            case 'col3-right':
                x = Math.floor((workW / 3) * 2); y = 0; w = Math.floor(workW / 3); h = workH;
                break;
            case 'grid-tl':
                x = 0; y = 0; w = Math.floor(workW * 0.5); h = Math.floor(workH * 0.5);
                break;
            case 'grid-tr':
                x = Math.floor(workW * 0.5); y = 0; w = Math.floor(workW * 0.5); h = Math.floor(workH * 0.5);
                break;
            case 'grid-bl':
                x = 0; y = Math.floor(workH * 0.5); w = Math.floor(workW * 0.5); h = Math.floor(workH * 0.5);
                break;
            case 'grid-br':
                x = Math.floor(workW * 0.5); y = Math.floor(workH * 0.5); w = Math.floor(workW * 0.5); h = Math.floor(workH * 0.5);
                break;
            case 'top-50':
                x = 0; y = 0; w = workW; h = Math.floor(workH * 0.5);
                break;
            case 'bottom-50':
                x = 0; y = Math.floor(workH * 0.5); w = workW; h = Math.floor(workH * 0.5);
                break;
            case 'priority-left':
                x = 0; y = 0; w = Math.floor(workW * 0.6); h = workH;
                break;
            case 'priority-tr':
                x = Math.floor(workW * 0.6); y = 0; w = Math.floor(workW * 0.4); h = Math.floor(workH * 0.5);
                break;
            case 'priority-br':
                x = Math.floor(workW * 0.6); y = Math.floor(workH * 0.5); w = Math.floor(workW * 0.4); h = Math.floor(workH * 0.5);
                break;
            default:
                break;
        }

        setWindows((ws) => {
            const nextWs = ws.map((win) => (win.id === id ? { ...win, x, y, w, h, maximized: false } : win));
            const others = nextWs.filter((win) => win.id !== id && !win.minimized);

            if (others.length > 0) {
                const compMap = {
                    'left-50': 'right-50',
                    'right-50': 'left-50',
                    'left-60': 'right-40',
                    'right-40': 'left-60',
                    'col3-left': 'col3-center',
                    'col3-center': 'col3-right',
                    'col3-right': 'col3-left',
                    'grid-tl': 'grid-tr',
                    'grid-tr': 'grid-tl',
                    'grid-bl': 'grid-br',
                    'grid-br': 'grid-bl',
                    'top-50': 'bottom-50',
                    'bottom-50': 'top-50',
                    'priority-left': 'priority-tr',
                    'priority-tr': 'priority-br',
                    'priority-br': 'priority-tr',
                };
                const targetZone = compMap[zone] || 'right-50';
                setSnapAssist({ targetZone, snappedId: id });
            } else {
                setSnapAssist(null);
            }

            return nextWs;
        });
    }, []);

    // Taskbar click: toggle minimize if active, else focus.
    const taskClick = useCallback(
        (key) => {
            setWindows((ws) => {
                const win = ws.find((w) => w.appKey === key);
                if (!win) return ws;
                if (win.id === activeId && !win.minimized) {
                    setActiveId(null);
                    return ws.map((w) => (w.id === win.id ? { ...w, minimized: true } : w));
                }
                setActiveId(win.id);
                setTopZ((z) => {
                    const next = z + 1;
                    setWindows((cur) => cur.map((w) => (w.id === win.id ? { ...w, z: next, minimized: false } : w)));
                    return next;
                });
                return ws;
            });
        },
        [activeId]
    );

    const desktopIcons = [
        { key: 'explorer', label: 'File Explorer', icon: ExplorerIcon },
        { key: 'photos', label: 'Photos', icon: PhotosIcon },
        { key: 'code', label: 'Visual Studio Code', icon: VSCodeIcon },
        { key: 'browser', label: 'Google Chrome', icon: ChromeIcon },
        { key: 'github', label: 'GitHub', icon: GitHubIcon },
        { key: 'settings', label: 'Settings', icon: SettingsIcon },
        { key: 'about', label: 'This PC', icon: ThisPCIcon },
    ];

    const snapAssistOthers = useMemo(() => {
        if (!snapAssist) return [];
        return windows.filter((w) => w.id !== snapAssist.snappedId && !w.minimized);
    }, [snapAssist, windows]);

    const snapFlyoutOthers = useMemo(() => {
        if (!snapFlyoutTarget) return [];
        return windows.filter((w) => w.id !== snapFlyoutTarget.winId && !w.minimized);
    }, [snapFlyoutTarget, windows]);

    return (
        <div
            className="relative h-screen w-screen select-none overflow-hidden text-white"
            style={wallpaper ? { backgroundImage: `url(${wallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: BLOOM }}
            onContextMenu={(e) => {
                e.preventDefault();
                setMenu({ x: e.clientX, y: e.clientY });
                setStartOpen(false);
            }}
            onClick={() => setMenu(null)}
        >
            {/* Desktop icons */}
            <div className="absolute left-3 top-3 grid w-20 auto-rows-max gap-1">
                {desktopIcons.map((d) => (
                    <button
                        key={d.key}
                        onDoubleClick={() => openApp(d.key)}
                        onClick={(e) => {
                            e.stopPropagation();
                            // On touch/coarse pointers a single tap opens.
                            if (window.matchMedia?.('(pointer: coarse)').matches) openApp(d.key);
                        }}
                        className="flex flex-col items-center gap-1 rounded p-2 text-center hover:bg-white/10 focus:bg-white/15 transition-transform active:scale-95"
                    >
                        <d.icon className="h-8 w-8 drop-shadow" />
                        <span className="text-[11px] leading-tight drop-shadow [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]">{d.label}</span>
                    </button>
                ))}
                <Link
                    href="/"
                    onClick={(e) => e.stopPropagation()}
                    className="flex flex-col items-center gap-1 rounded p-2 text-center hover:bg-white/10 transition-transform active:scale-95"
                >
                    <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full drop-shadow">
                        <img
                            src={config?.hasCustomFavicon ? '/api/favicon' : '/favicon.ico'}
                            alt="Portfolio"
                            className="h-full w-full object-cover"
                            onError={(e) => {
                                e.currentTarget.src = '/favicon.ico';
                            }}
                        />
                    </div>
                    <span className="text-[11px] leading-tight [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]">Portfolio</span>
                </Link>
            </div>

            {/* Windows */}
            <AnimatePresence>
                {windows.map((win) => (
                    <Window
                        key={win.id}
                        win={win}
                        active={win.id === activeId}
                        onFocus={focus}
                        onClose={closeWin}
                        onMinimize={minimizeWin}
                        onToggleMaximize={toggleMax}
                        onMove={moveWin}
                        onResize={resizeWin}
                        onSnap={snapWin}
                        onOpenSnapFlyout={openSnapFlyout}
                        onCloseSnapFlyout={closeSnapFlyout}
                        windows={windows}
                    >
                        {appMap[win.appKey]?.render({ wallpaper, config, openApp, windows, closeWin: () => closeWin(win.id), payload: win.payload })}
                    </Window>
                ))}
            </AnimatePresence>

            {/* Desktop Root Level Windows 11 Snap Layouts Flyout (fixed z-[9999]) */}
            <AnimatePresence>
                {snapFlyoutTarget && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -6 }}
                        transition={{ duration: 0.12 }}
                        className="fixed z-[9999] w-64 rounded-xl border border-white/20 bg-[#25252b]/98 p-3 shadow-2xl backdrop-blur-2xl text-white select-none"
                        style={{
                            left: Math.min(
                                snapFlyoutTarget.rect.right - 256,
                                (typeof window !== 'undefined' ? window.innerWidth : 1000) - 270
                            ),
                            top: snapFlyoutTarget.rect.bottom + 4,
                        }}
                        onMouseEnter={keepSnapFlyout}
                        onMouseLeave={closeSnapFlyout}
                    >
                        <div className="text-[11px] font-semibold text-white/60 mb-2 px-1">
                            Snap Layouts
                        </div>

                        <div className="grid grid-cols-3 gap-2.5">
                            {/* Preset 1: 50/50 Split */}
                            <div className="flex flex-col gap-1 rounded-lg border border-white/10 p-1.5 bg-black/20 hover:border-blue-400/50 transition">
                                <div className="grid grid-cols-2 gap-1 h-9">
                                    <button
                                        onClick={() => {
                                            snapWin(snapFlyoutTarget.winId, 'left-50');
                                            setSnapFlyoutTarget(null);
                                        }}
                                        className="rounded bg-white/15 hover:bg-blue-600 transition"
                                        title="Snap Left 50%"
                                    />
                                    <button
                                        onClick={() => {
                                            snapWin(snapFlyoutTarget.winId, 'right-50');
                                            setSnapFlyoutTarget(null);
                                        }}
                                        className="rounded bg-white/15 hover:bg-blue-600 transition"
                                        title="Snap Right 50%"
                                    />
                                </div>
                                <span className="text-[9px] text-center text-white/40">50 / 50</span>
                            </div>

                            {/* Preset 2: 60/40 Split */}
                            <div className="flex flex-col gap-1 rounded-lg border border-white/10 p-1.5 bg-black/20 hover:border-blue-400/50 transition">
                                <div className="flex gap-1 h-9">
                                    <button
                                        onClick={() => {
                                            snapWin(snapFlyoutTarget.winId, 'left-60');
                                            setSnapFlyoutTarget(null);
                                        }}
                                        className="w-[60%] rounded bg-white/15 hover:bg-blue-600 transition"
                                        title="Snap Left 60%"
                                    />
                                    <button
                                        onClick={() => {
                                            snapWin(snapFlyoutTarget.winId, 'right-40');
                                            setSnapFlyoutTarget(null);
                                        }}
                                        className="w-[40%] rounded bg-white/15 hover:bg-blue-600 transition"
                                        title="Snap Right 40%"
                                    />
                                </div>
                                <span className="text-[9px] text-center text-white/40">60 / 40</span>
                            </div>

                            {/* Preset 3: 3 Columns */}
                            <div className="flex flex-col gap-1 rounded-lg border border-white/10 p-1.5 bg-black/20 hover:border-blue-400/50 transition">
                                <div className="grid grid-cols-3 gap-1 h-9">
                                    <button
                                        onClick={() => {
                                            snapWin(snapFlyoutTarget.winId, 'col3-left');
                                            setSnapFlyoutTarget(null);
                                        }}
                                        className="rounded bg-white/15 hover:bg-blue-600 transition"
                                        title="Snap Left Column"
                                    />
                                    <button
                                        onClick={() => {
                                            snapWin(snapFlyoutTarget.winId, 'col3-center');
                                            setSnapFlyoutTarget(null);
                                        }}
                                        className="rounded bg-white/15 hover:bg-blue-600 transition"
                                        title="Snap Center Column"
                                    />
                                    <button
                                        onClick={() => {
                                            snapWin(snapFlyoutTarget.winId, 'col3-right');
                                            setSnapFlyoutTarget(null);
                                        }}
                                        className="rounded bg-white/15 hover:bg-blue-600 transition"
                                        title="Snap Right Column"
                                    />
                                </div>
                                <span className="text-[9px] text-center text-white/40">3 Columns</span>
                            </div>

                            {/* Preset 4: 2x2 Grid */}
                            <div className="flex flex-col gap-1 rounded-lg border border-white/10 p-1.5 bg-black/20 hover:border-blue-400/50 transition">
                                <div className="grid grid-cols-2 gap-1 h-9">
                                    <button
                                        onClick={() => {
                                            snapWin(snapFlyoutTarget.winId, 'grid-tl');
                                            setSnapFlyoutTarget(null);
                                        }}
                                        className="rounded bg-white/15 hover:bg-blue-600 transition h-4"
                                        title="Top Left"
                                    />
                                    <button
                                        onClick={() => {
                                            snapWin(snapFlyoutTarget.winId, 'grid-tr');
                                            setSnapFlyoutTarget(null);
                                        }}
                                        className="rounded bg-white/15 hover:bg-blue-600 transition h-4"
                                        title="Top Right"
                                    />
                                    <button
                                        onClick={() => {
                                            snapWin(snapFlyoutTarget.winId, 'grid-bl');
                                            setSnapFlyoutTarget(null);
                                        }}
                                        className="rounded bg-white/15 hover:bg-blue-600 transition h-4"
                                        title="Bottom Left"
                                    />
                                    <button
                                        onClick={() => {
                                            snapWin(snapFlyoutTarget.winId, 'grid-br');
                                            setSnapFlyoutTarget(null);
                                        }}
                                        className="rounded bg-white/15 hover:bg-blue-600 transition h-4"
                                        title="Bottom Right"
                                    />
                                </div>
                                <span className="text-[9px] text-center text-white/40">2 x 2 Grid</span>
                            </div>

                            {/* Preset 5: Priority Split */}
                            <div className="flex flex-col gap-1 rounded-lg border border-white/10 p-1.5 bg-black/20 hover:border-blue-400/50 transition">
                                <div className="flex gap-1 h-9">
                                    <button
                                        onClick={() => {
                                            snapWin(snapFlyoutTarget.winId, 'priority-left');
                                            setSnapFlyoutTarget(null);
                                        }}
                                        className="w-[60%] rounded bg-white/15 hover:bg-blue-600 transition"
                                        title="Priority Main"
                                    />
                                    <div className="w-[40%] flex flex-col gap-1">
                                        <button
                                            onClick={() => {
                                                snapWin(snapFlyoutTarget.winId, 'priority-tr');
                                                setSnapFlyoutTarget(null);
                                            }}
                                            className="h-4 rounded bg-white/15 hover:bg-blue-600 transition"
                                            title="Side Top"
                                        />
                                        <button
                                            onClick={() => {
                                                snapWin(snapFlyoutTarget.winId, 'priority-br');
                                                setSnapFlyoutTarget(null);
                                            }}
                                            className="h-4 rounded bg-white/15 hover:bg-blue-600 transition"
                                            title="Side Bottom"
                                        />
                                    </div>
                                </div>
                                <span className="text-[9px] text-center text-white/40">Priority</span>
                            </div>

                            {/* Preset 6: Top / Bottom */}
                            <div className="flex flex-col gap-1 rounded-lg border border-white/10 p-1.5 bg-black/20 hover:border-blue-400/50 transition">
                                <div className="flex flex-col gap-1 h-9">
                                    <button
                                        onClick={() => {
                                            snapWin(snapFlyoutTarget.winId, 'top-50');
                                            setSnapFlyoutTarget(null);
                                        }}
                                        className="h-4 rounded bg-white/15 hover:bg-blue-600 transition"
                                        title="Top 50%"
                                    />
                                    <button
                                        onClick={() => {
                                            snapWin(snapFlyoutTarget.winId, 'bottom-50');
                                            setSnapFlyoutTarget(null);
                                        }}
                                        className="h-4 rounded bg-white/15 hover:bg-blue-600 transition"
                                        title="Bottom 50%"
                                    />
                                </div>
                                <span className="text-[9px] text-center text-white/40">Top / Bottom</span>
                            </div>
                        </div>

                        {/* Open Windows Suggestions */}
                        {snapFlyoutOthers.length > 0 && (
                            <div className="mt-2.5 pt-2 border-t border-white/10">
                                <div className="text-[10px] font-semibold text-white/50 mb-1.5 px-0.5">
                                    Open Windows ({snapFlyoutOthers.length})
                                </div>
                                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar" data-lenis-prevent>
                                    {snapFlyoutOthers.map((other) => {
                                        const OtherIcon = other.icon;
                                        return (
                                            <button
                                                key={other.id}
                                                onClick={() => {
                                                    setSnapFlyoutTarget(null);
                                                    focus(other.id);
                                                }}
                                                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1 hover:bg-blue-600/30 hover:border-blue-400/50 transition shrink-0"
                                                title={`Switch to ${other.title}`}
                                            >
                                                {OtherIcon && <OtherIcon className="h-3.5 w-3.5 text-blue-400" />}
                                                <span className="text-[10px] font-medium truncate max-w-[90px] text-white/90">{other.title}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Windows 11 Snap Assist Overlay */}
            <AnimatePresence>
                {snapAssist && snapAssistOthers.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="absolute z-[9999] flex flex-col items-center justify-center p-6 bg-[#1a1a20]/90 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden"
                        style={{
                            left: getZoneRect(snapAssist.targetZone).left + 12,
                            top: getZoneRect(snapAssist.targetZone).top + 12,
                            width: Math.max(280, getZoneRect(snapAssist.targetZone).width - 24),
                            height: Math.max(200, getZoneRect(snapAssist.targetZone).height - 24),
                        }}
                    >
                        <div className="flex items-center justify-between w-full mb-4 px-1 shrink-0">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                                    Snap Assist
                                </span>
                                <span className="text-[10px] text-white/60">• Select an open app to snap side-by-side</span>
                            </div>
                            <button
                                onClick={() => setSnapAssist(null)}
                                className="text-[11px] font-medium text-white/60 hover:text-white px-2 py-0.5 rounded-md hover:bg-white/10 transition"
                            >
                                Skip (Esc)
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full flex-1 overflow-y-auto custom-scrollbar p-1" data-lenis-prevent>
                            {snapAssistOthers.map((w) => {
                                const Icon = w.icon;
                                const category = getAppCategoryLabel(w.appKey);
                                return (
                                    <button
                                        key={w.id}
                                        onClick={() => {
                                            snapWin(w.id, snapAssist.targetZone);
                                            setSnapAssist(null);
                                        }}
                                        className="group flex flex-col justify-between rounded-xl border border-white/15 bg-white/10 p-3.5 hover:border-blue-400 hover:bg-blue-600/30 transition shadow-lg text-left h-28"
                                    >
                                        <div className="flex items-center gap-3 w-full">
                                            {Icon && <Icon className="h-6 w-6 text-blue-400 group-hover:scale-110 transition shrink-0" />}
                                            <div className="min-w-0 flex-1">
                                                <div className="text-xs font-bold truncate text-white">{w.title}</div>
                                                <div className="text-[10px] text-white/50 truncate font-medium">{category}</div>
                                            </div>
                                        </div>
                                        <div className="w-full mt-2 rounded-lg bg-black/40 border border-white/10 py-1 text-center text-[10px] text-white/60 group-hover:text-white group-hover:bg-blue-600/40 font-medium transition">
                                            Snap to layout
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Desktop right-click menu */}
            {menu && (
                <div
                    className="absolute z-[60] w-48 rounded-lg border border-white/15 bg-[#f3f3f3]/95 py-1 text-sm text-neutral-800 shadow-xl backdrop-blur-xl dark:bg-[#2a2a2e]/95 dark:text-neutral-100 animate-in fade-in zoom-in-95 duration-100"
                    style={{ left: Math.min(menu.x, (typeof window !== 'undefined' ? window.innerWidth : 9999) - 200), top: menu.y }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <MenuItem label="Open File Explorer" onClick={() => { openApp('explorer'); setMenu(null); }} />
                    <MenuItem label="View source (VS Code)" onClick={() => { openApp('code'); setMenu(null); }} />
                    <div className="my-1 h-px bg-black/10 dark:bg-white/10" />
                    <MenuItem label="Personalize" onClick={() => { openApp('settings'); setMenu(null); }} />
                    <MenuItem label="Refresh" onClick={() => { setMenu(null); if (typeof window !== 'undefined') window.location.reload(); }} />
                </div>
            )}

            {/* Start menu */}
            <AnimatePresence>
                {startOpen && (
                    <StartMenu
                        apps={apps}
                        onOpen={openApp}
                        onClose={() => setStartOpen(false)}
                        config={config}
                        onRestart={handleRestart}
                        onShutdown={handleShutdown}
                    />
                )}
            </AnimatePresence>

            {/* Widgets Panel */}
            <AnimatePresence>
                {widgetsOpen && <WidgetsPanel open={widgetsOpen} onClose={() => setWidgetsOpen(false)} openApp={openApp} />}
            </AnimatePresence>

            {/* Taskbar */}
            <Taskbar
                apps={apps}
                windows={windows}
                activeId={activeId}
                startOpen={startOpen}
                widgetsOpen={widgetsOpen}
                onToggleWidgets={() => setWidgetsOpen((v) => !v)}
                onStart={() => setStartOpen((v) => !v)}
                onOpen={openApp}
                onTaskClick={taskClick}
            />

            {/* Fullscreen System Overlays */}
            {systemState === 'restarting' && (
                <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#005a9e] text-white animate-in fade-in duration-200">
                    <Loader2 className="h-12 w-12 animate-spin text-white mb-4" />
                    <div className="text-xl font-bold tracking-tight">Restarting</div>
                    <div className="mt-2 text-xs text-white/70">Cleaning cache & rebooting Aiyu OS...</div>
                </div>
            )}

            {systemState === 'shutting_down' && (
                <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0d0d11] text-white animate-in fade-in duration-200">
                    <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 border border-red-500/30">
                        <Power className="h-8 w-8 text-red-500 animate-pulse" />
                        <div className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 font-bold text-xs shadow">
                            {countdown}
                        </div>
                    </div>
                    <div className="text-xl font-bold tracking-tight">Shutting down</div>
                    <div className="mt-2 text-xs text-white/60">Stopping desktop processes in {countdown} seconds...</div>
                </div>
            )}

            {systemState === 'powered_off' && (
                <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black text-neutral-300 animate-in fade-in duration-300 p-6 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-900 border border-neutral-800 text-neutral-500">
                        <Power className="h-8 w-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Aiyu OS is Shut Down</h2>
                    <p className="max-w-md text-xs text-neutral-400 leading-relaxed mb-8">
                        It is now safe to close your browser tab. All desktop processes have ended.
                    </p>
                    <button
                        onClick={() => setSystemState('normal')}
                        className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-500 transition-colors shadow-lg"
                    >
                        <RotateCcw className="h-4 w-4" />
                        <span>Power On / Reboot</span>
                    </button>
                </div>
            )}
        </div>
    );
}

function MenuItem({ label, onClick }) {
    return (
        <button onClick={onClick} className="block w-full px-3 py-1.5 text-left hover:bg-blue-500/15">
            {label}
        </button>
    );
}

function getZoneRect(zone) {
    if (typeof window === 'undefined') return { left: 10, top: 10, width: 300, height: 300 };
    const workW = window.innerWidth;
    const workH = window.innerHeight - 48;

    switch (zone) {
        case 'right-50': return { left: Math.floor(workW * 0.5), top: 0, width: Math.floor(workW * 0.5), height: workH };
        case 'left-50': return { left: 0, top: 0, width: Math.floor(workW * 0.5), height: workH };
        case 'right-40': return { left: Math.floor(workW * 0.6), top: 0, width: Math.floor(workW * 0.4), height: workH };
        case 'left-60': return { left: 0, top: 0, width: Math.floor(workW * 0.6), height: workH };
        case 'col3-center': return { left: Math.floor(workW / 3), top: 0, width: Math.floor(workW / 3), height: workH };
        case 'col3-right': return { left: Math.floor((workW / 3) * 2), top: 0, width: Math.floor(workW / 3), height: workH };
        case 'col3-left': return { left: 0, top: 0, width: Math.floor(workW / 3), height: workH };
        case 'grid-tr': return { left: Math.floor(workW * 0.5), top: 0, width: Math.floor(workW * 0.5), height: Math.floor(workH * 0.5) };
        case 'grid-tl': return { left: 0, top: 0, width: Math.floor(workW * 0.5), height: Math.floor(workH * 0.5) };
        case 'grid-br': return { left: Math.floor(workW * 0.5), top: Math.floor(workH * 0.5), width: Math.floor(workW * 0.5), height: Math.floor(workH * 0.5) };
        case 'grid-bl': return { left: 0, top: Math.floor(workH * 0.5), width: Math.floor(workW * 0.5), height: Math.floor(workH * 0.5) };
        case 'bottom-50': return { left: 0, top: Math.floor(workH * 0.5), width: workW, height: Math.floor(workH * 0.5) };
        case 'top-50': return { left: 0, top: 0, width: workW, height: Math.floor(workH * 0.5) };
        case 'priority-tr': return { left: Math.floor(workW * 0.6), top: 0, width: Math.floor(workW * 0.4), height: Math.floor(workH * 0.5) };
        case 'priority-br': return { left: Math.floor(workW * 0.6), top: Math.floor(workH * 0.5), width: Math.floor(workW * 0.4), height: Math.floor(workH * 0.5) };
        default: return { left: Math.floor(workW * 0.5), top: 0, width: Math.floor(workW * 0.5), height: workH };
    }
}

function getAppCategoryLabel(appKey) {
    const map = {
        browser: 'Web Browser',
        markdown: 'Document Reader',
        code: 'Code Editor',
        explorer: 'File Manager',
        photos: 'Image Gallery',
        terminal: 'Terminal Shell',
        notepad: 'Text Editor',
        calculator: 'Calculator Utility',
        whiteboard: 'Canvas & Board',
        getstarted: 'Getting Started',
        taskmanager: 'System Manager',
        settings: 'System Settings',
        github: 'GitHub Client',
    };
    return map[appKey] || 'Application';
}

