"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Battery,
    Wifi,
    Signal,
    ChevronLeft,
    ChevronRight,
    Search,
    X,
    Image as ImageIcon,
    FileText,
    Code,
    Globe,
    Settings,
    TerminalSquare,
    Activity,
    Calculator,
    PenTool,
    Layout,
    Home,
    Layers,
    ArrowRight
} from "lucide-react";
import { GitHubIcon } from "./icons";
import { useDeviceMode } from "../../context/DeviceModeContext";

const accentThemeMap = {
    "lumia-cyan": "bg-[#00abf0] text-white",
    "crimson": "bg-[#e51400] text-white",
    "cobalt": "bg-[#0050ef] text-white",
    "emerald": "bg-[#008a00] text-white",
    "magenta": "bg-[#d80073] text-white",
    "amber": "bg-[#f0a30a] text-white",
    "violet": "bg-[#76608a] text-white",
};

const defaultAccentClass = "bg-[#00abf0] text-white";

function LiveTile({ title, icon: Icon, onClick, accentClass, wide = false, flipContent = null }) {
    const [isFlipped, setIsFlipped] = useState(false);

    useEffect(() => {
        if (!flipContent) return;
        const interval = setInterval(() => {
            setIsFlipped((prev) => !prev);
        }, 4000 + Math.random() * 2000); // 4-6 seconds
        return () => clearInterval(interval);
    }, [flipContent]);

    return (
        <motion.div
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className={`relative overflow-hidden cursor-pointer ${accentClass} p-3 flex flex-col justify-between ${
                wide ? "col-span-2 aspect-[2/1]" : "aspect-square col-span-1"
            }`}
            style={{ perspective: 1000 }}
        >
            <motion.div
                className="absolute inset-0 w-full h-full p-3 flex flex-col justify-between"
                initial={false}
                animate={{ rotateX: isFlipped ? 180 : 0, opacity: isFlipped ? 0 : 1 }}
                transition={{ duration: 0.6, type: "spring", bounce: 0 }}
                style={{ backfaceVisibility: "hidden" }}
            >
                {Icon && <Icon size={wide ? 32 : 24} className="mb-2" />}
                {!Icon && <div className="flex-1" />}
                <span className="text-xs font-semibold tracking-wide uppercase">{title}</span>
            </motion.div>
            
            {flipContent && (
                <motion.div
                    className="absolute inset-0 w-full h-full p-3 flex flex-col justify-center items-center bg-black/20"
                    initial={false}
                    animate={{ rotateX: isFlipped ? 0 : -180, opacity: isFlipped ? 1 : 0 }}
                    transition={{ duration: 0.6, type: "spring", bounce: 0 }}
                    style={{ backfaceVisibility: "hidden" }}
                >
                    {flipContent}
                </motion.div>
            )}
        </motion.div>
    );
}

export default function MobilePhoneShell({ apps, windows, activeWindowId, openApp, closeWin, focusWindow, config, wallpaper }) {
    const { accentColor } = useDeviceMode();
    const [time, setTime] = useState(new Date());
    const [view, setView] = useState("start"); // "start", "apps", "task_switcher"
    const [letterPickerOpen, setLetterPickerOpen] = useState(false);

    const accentClass = accentThemeMap[accentColor] || defaultAccentClass;

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const timeString = time.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

    const activeAppWindow = activeWindowId ? windows.find((w) => w.id === activeWindowId) : null;
    const activeApp = activeAppWindow ? apps.find((a) => (a.key || a.id) === (activeAppWindow.appKey || activeAppWindow.appId)) : null;

    // Derived variables for Apps View
    const sortedApps = [...(apps || [])].sort((a, b) => {
        const nameA = a.title || a.name || '';
        const nameB = b.title || b.name || '';
        return nameA.localeCompare(nameB);
    });
    const groupedApps = sortedApps.reduce((acc, app) => {
        const name = app.title || app.name || 'App';
        const firstLetter = name[0] ? name[0].toUpperCase() : '#';
        if (!acc[firstLetter]) acc[firstLetter] = [];
        acc[firstLetter].push(app);
        return acc;
    }, {});
    const letters = Object.keys(groupedApps).sort();

    const handleBack = () => {
        if (activeWindowId) {
            // Close or hide current app
            closeWin(activeWindowId);
        } else if (view === "apps" || view === "task_switcher") {
            setView("start");
        }
    };

    const handleHome = () => {
        if (activeWindowId) focusWindow(null); // Just minimize/blur
        setView("start");
    };

    const handleTaskSwitcher = () => {
        if (view === "task_switcher") setView("start");
        else setView("task_switcher");
    };

    const handleAppClick = (appId) => {
        openApp(appId);
        setView("start"); // Reset view for background
    };

    return (
        <div className="fixed inset-0 w-screen h-screen flex flex-col bg-black text-white font-sans overflow-hidden z-50">
            {/* Background image if provided, else solid black is typical WP */}
            {wallpaper && (
                <div 
                    className="absolute inset-0 w-full h-full opacity-30 bg-cover bg-center pointer-events-none"
                    style={{ backgroundImage: `url(${wallpaper})` }}
                />
            )}

            {/* Top Phone Status Bar */}
            <div className="h-6 flex items-center justify-between px-2 text-[10px] font-semibold z-50 bg-black">
                <div className="flex flex-row items-center space-x-2">
                    <span>{timeString}</span>
                    <span>{config?.deviceName || "AIYU-PHONE"}</span>
                </div>
                <div className="flex flex-row items-center space-x-1">
                    <Signal size={12} />
                    <Wifi size={12} />
                    <Battery size={12} />
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 relative overflow-hidden">
                <AnimatePresence>
                    {!activeAppWindow && view === "start" && (
                        <motion.div
                            key="start"
                            initial={{ opacity: 0, x: -50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="absolute inset-0 overflow-y-auto px-4 pb-16"
                        >
                            <div className="flex items-center justify-between mt-8 mb-6">
                                <h1 className="text-4xl font-light tracking-tight">start</h1>
                                <button onClick={() => setView("apps")} className="p-2 rounded-full hover:bg-white/10">
                                    <ArrowRight size={24} />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2 max-w-sm">
                                <LiveTile 
                                    title="Photos" 
                                    icon={ImageIcon} 
                                    onClick={() => handleAppClick("photos")} 
                                    accentClass={accentClass}
                                    flipContent={<div className="text-sm">3 New Photos</div>}
                                />
                                <LiveTile 
                                    title="Notepad" 
                                    icon={FileText} 
                                    onClick={() => handleAppClick("notepad")} 
                                    accentClass={accentClass}
                                    flipContent={<div className="text-sm">Notes: 5</div>}
                                />
                                <LiveTile 
                                    title="VS Code" 
                                    icon={Code} 
                                    wide={true} 
                                    onClick={() => handleAppClick("vscode")} 
                                    accentClass={accentClass}
                                    flipContent={<div className="text-sm truncate">Recent: index.js</div>}
                                />
                                <LiveTile 
                                    title="GitHub" 
                                    icon={GitHubIcon} 
                                    onClick={() => handleAppClick("github")} 
                                    accentClass={accentClass}
                                    flipContent={<div className="text-sm">2 PRs</div>}
                                />
                                <LiveTile 
                                    title="Browser" 
                                    icon={Globe} 
                                    onClick={() => handleAppClick("browser")} 
                                    accentClass={accentClass}
                                />
                                <LiveTile 
                                    title="Terminal" 
                                    icon={TerminalSquare} 
                                    wide={true} 
                                    onClick={() => handleAppClick("terminal")} 
                                    accentClass={accentClass}
                                />
                                <LiveTile title="Settings" icon={Settings} onClick={() => handleAppClick("settings")} accentClass={accentClass} />
                                <LiveTile title="Task Manager" icon={Activity} onClick={() => handleAppClick("taskmgr")} accentClass={accentClass} />
                                <LiveTile title="Calculator" icon={Calculator} onClick={() => handleAppClick("calc")} accentClass={accentClass} />
                                <LiveTile title="Whiteboard" icon={PenTool} onClick={() => handleAppClick("whiteboard")} accentClass={accentClass} />
                            </div>
                        </motion.div>
                    )}

                    {!activeAppWindow && view === "apps" && (
                        <motion.div
                            key="apps"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 50 }}
                            className="absolute inset-0 overflow-y-auto px-4 pb-16"
                        >
                            <div className="flex items-center gap-4 mt-8 mb-6">
                                <Search size={24} className="text-gray-400" />
                                <input 
                                    type="text" 
                                    placeholder="Search apps" 
                                    className="bg-transparent border-none outline-none text-xl w-full"
                                />
                            </div>

                            {letters.map((letter) => (
                                <div key={letter} className="mb-4">
                                    <button 
                                        onClick={() => setLetterPickerOpen(true)}
                                        className={`w-12 h-12 flex items-center justify-center text-xl font-bold mb-2 ${accentClass}`}
                                    >
                                        {letter}
                                    </button>
                                    <div className="space-y-4 ml-14">
                                        {groupedApps[letter].map((app) => {
                                            const appKey = app.key || app.id;
                                            const appName = app.title || app.name || 'App';
                                            const AppIcon = app.icon;
                                            return (
                                                <div 
                                                    key={appKey} 
                                                    className="flex items-center gap-4 cursor-pointer text-xl font-light hover:text-gray-300"
                                                    onClick={() => handleAppClick(appKey)}
                                                >
                                                    {AppIcon && typeof AppIcon === "function" ? (
                                                        <AppIcon className="w-8 h-8" />
                                                    ) : AppIcon && typeof AppIcon === "string" ? (
                                                        <img src={AppIcon} alt={appName} className="w-8 h-8" />
                                                    ) : (
                                                        <div className={`w-8 h-8 ${accentClass}`} />
                                                    )}
                                                    <span>{appName}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    )}

                    {!activeAppWindow && view === "task_switcher" && (
                        <motion.div
                            key="task_switcher"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="absolute inset-0 flex items-center overflow-x-auto px-8 space-x-6 bg-black/80 backdrop-blur-sm"
                        >
                            {windows.length === 0 && (
                                <div className="text-gray-500 w-full text-center">No recent apps</div>
                            )}
                            {windows.map((win) => {
                                const appKey = win.appKey || win.appId;
                                const app = apps.find(a => (a.key || a.id) === appKey);
                                const appTitle = win.title || app?.title || app?.name || "App";
                                const AppIcon = win.icon || app?.icon;
                                return (
                                    <motion.div 
                                        key={win.id}
                                        className="shrink-0 w-64 h-96 bg-gray-900 border border-gray-700 flex flex-col relative rounded-xl overflow-hidden shadow-2xl"
                                        drag="y"
                                        dragConstraints={{ top: 0, bottom: 0 }}
                                        onDragEnd={(e, info) => {
                                            if (info.offset.y < -50) closeWin(win.id);
                                        }}
                                        onClick={() => {
                                            focusWindow(win.id);
                                            setView("start");
                                        }}
                                    >
                                        <div className="p-3 flex justify-between items-center bg-gray-800 border-b border-gray-700">
                                            <div className="flex items-center gap-2">
                                                {AppIcon && typeof AppIcon === "function" ? (
                                                    <AppIcon className="w-5 h-5 text-blue-400" />
                                                ) : null}
                                                <span className="font-semibold text-sm truncate text-white">{appTitle}</span>
                                            </div>
                                            <button onClick={(e) => { e.stopPropagation(); closeWin(win.id); }} className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white">
                                                <X size={16} />
                                            </button>
                                        </div>
                                        <div className="flex-1 p-4 flex items-center justify-center bg-gray-950/80 text-gray-500 text-xs">
                                            Tap to view / Swipe up to close
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    )}

                    {activeAppWindow && (
                        <motion.div
                            key="active_app"
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 50 }}
                            className="absolute inset-0 bg-black flex flex-col z-20"
                        >
                            {/* WP Pivot Header */}
                            <div className="px-4 py-4 shrink-0 bg-black">
                                <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">
                                    {activeAppWindow.title || activeApp?.title || activeApp?.name || "App"}
                                </h2>
                                <div className="flex gap-4 text-2xl font-light overflow-x-auto whitespace-nowrap hide-scrollbar">
                                    <span className="text-white">main</span>
                                    <span className="text-gray-500">details</span>
                                    <span className="text-gray-500">settings</span>
                                </div>
                            </div>
                            {/* App Content Area */}
                            <div className="flex-1 relative overflow-hidden bg-white dark:bg-[#1b1b1b]">
                                {typeof activeAppWindow.render === "function" ? activeAppWindow.render({
                                    openApp,
                                    closeWin: () => closeWin(activeAppWindow.id),
                                    config,
                                    wallpaper,
                                    payload: activeAppWindow.payload,
                                    isMobile: true,
                                    isTablet: false,
                                }) : typeof activeApp?.render === "function" ? activeApp.render({
                                    openApp,
                                    closeWin: () => closeWin(activeAppWindow.id),
                                    config,
                                    wallpaper,
                                    payload: activeAppWindow.payload,
                                    isMobile: true,
                                    isTablet: false,
                                }) : (
                                    <div className="p-4 text-black dark:text-white">App Content</div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Letter Picker Modal */}
                {letterPickerOpen && (
                    <div className="absolute inset-0 bg-black z-50 flex items-center justify-center p-4">
                        <div className="grid grid-cols-4 gap-2 w-full max-w-sm">
                            {Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ").map(l => (
                                <button 
                                    key={l}
                                    onClick={() => setLetterPickerOpen(false)}
                                    className={`aspect-square flex items-center justify-center text-xl font-bold ${letters.includes(l) ? accentClass : "bg-gray-800 text-gray-600"}`}
                                    disabled={!letters.includes(l)}
                                >
                                    {l}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom WP AppBar */}
            <div className="h-14 flex items-center justify-around px-6 pb-2 z-50 bg-black">
                <button onClick={handleBack} className="p-2 rounded-full hover:bg-white/10 text-white">
                    <ChevronLeft size={24} />
                </button>
                <button onClick={handleHome} className="p-2 rounded-full hover:bg-white/10 text-white">
                    <Home size={24} />
                </button>
                <button onClick={handleTaskSwitcher} className="p-2 rounded-full hover:bg-white/10 text-white">
                    <Layers size={24} />
                </button>
            </div>
        </div>
    );
}
