"use client";
import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence } from 'framer-motion';
import { ExplorerIcon, VSCodeIcon, ChromeIcon, SettingsIcon, ThisPCIcon, EdgeIcon, PhotosIcon, GitHubIcon, TaskManagerIcon, TerminalIcon, NotepadIcon } from './icons';
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
        key: 'browser',
        title: 'Google Chrome',
        icon: ChromeIcon,
        w: 940,
        h: 600,
        render: () => <Browser />,
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
                    <EdgeIcon className="h-8 w-8 drop-shadow" />
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
                    >
                        {appMap[win.appKey]?.render({ wallpaper, config, openApp, windows, closeWin, payload: win.payload })}
                    </Window>
                ))}
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
                {startOpen && <StartMenu apps={apps} onOpen={openApp} onClose={() => setStartOpen(false)} />}
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

