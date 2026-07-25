"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Battery,
    Wifi,
    WifiOff,
    Signal,
    ChevronLeft,
    ChevronDown,
    ChevronUp,
    Search,
    X,
    Image as ImageIcon,
    FileText,
    Settings as SettingsLucideIcon,
    Home,
    Layers,
    ArrowRight,
    Sparkles,
    Moon,
    Smartphone,
    Bell,
    Trash2
} from "lucide-react";
import {
    ExplorerIcon,
    VSCodeIcon,
    ChromeIcon,
    SettingsIcon,
    PhotosIcon,
    GitHubIcon,
    TaskManagerIcon,
    TerminalIcon,
    NotepadIcon,
    CalculatorIcon,
    WhiteboardIcon
} from "./icons";
import { useDeviceMode } from "../../context/DeviceModeContext";
import { ShellClock } from "./ShellClock";

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
        }, 4000 + Math.random() * 2000);
        return () => clearInterval(interval);
    }, [flipContent]);

    return (
        <motion.div
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className={`relative overflow-hidden cursor-pointer ${accentClass} p-3 flex flex-col justify-between rounded-none shadow-md ${
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
                <div>
                    {Icon && typeof Icon === "function" ? (
                        <Icon className={wide ? "w-8 h-8 mb-2" : "w-6 h-6 mb-2"} />
                    ) : Icon ? (
                        <Icon size={wide ? 32 : 24} className="mb-2" />
                    ) : null}
                </div>
                <span className="text-[11px] font-medium tracking-wide uppercase truncate">{title}</span>
            </motion.div>
            
            {flipContent && (
                <motion.div
                    className="absolute inset-0 w-full h-full p-3 flex flex-col justify-center items-center bg-black/20 text-center"
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
    const { accentColor, setAccentColor, setDeviceMode, effectiveMode } = useDeviceMode();
    const [view, setView] = useState("start"); // "start", "apps", "task_switcher"
    const [searchQuery, setSearchQuery] = useState("");
    const [letterPickerOpen, setLetterPickerOpen] = useState(false);
    const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);
    const [showAlphaBanner, setShowAlphaBanner] = useState(true);
    const [wifi, setWifi] = useState(true);
    const [cellular, setCellular] = useState(true);
    const [notifications, setNotifications] = useState([
        { id: 'alpha-notice', title: "System Notice", body: "Mobile UI is currently in Alpha phase.", time: "Just now" },
        { id: 1, title: "Welcome to Aiyu OS", body: "Windows Phone Metro theme active", time: "Just now" },
        { id: 2, title: "Photos", body: "3 new portfolio photos available", time: "5m ago" },
        { id: 3, title: "System", body: "All desktop processes running smooth", time: "12m ago" }
    ]);

    const accentClass = accentThemeMap[accentColor] || defaultAccentClass;

    const activeAppWindow = activeWindowId ? windows.find((w) => w.id === activeWindowId) : null;
    const activeApp = activeAppWindow ? apps.find((a) => (a.key || a.id) === (activeAppWindow.appKey || activeAppWindow.appId)) : null;

    // Derived variables for Apps View
    const sortedApps = useMemo(() => {
        return [...(apps || [])].sort((a, b) => {
            const nameA = a.title || a.name || '';
            const nameB = b.title || b.name || '';
            return nameA.localeCompare(nameB);
        });
    }, [apps]);

    const filteredApps = useMemo(() => {
        if (!searchQuery.trim()) return sortedApps;
        return sortedApps.filter((a) => {
            const name = (a.title || a.name || '').toLowerCase();
            return name.includes(searchQuery.toLowerCase());
        });
    }, [sortedApps, searchQuery]);

    const groupedApps = useMemo(() => {
        return filteredApps.reduce((acc, app) => {
            const name = app.title || app.name || 'App';
            const firstLetter = name[0] ? name[0].toUpperCase() : '#';
            if (!acc[firstLetter]) acc[firstLetter] = [];
            acc[firstLetter].push(app);
            return acc;
        }, {});
    }, [filteredApps]);

    const letters = useMemo(() => Object.keys(groupedApps).sort(), [groupedApps]);

    const handleBack = () => {
        if (activeWindowId) {
            closeWin(activeWindowId);
            if (focusWindow) focusWindow(null);
        } else if (view === "apps" || view === "task_switcher") {
            setView("start");
        }
    };

    const handleHome = () => {
        if (focusWindow) focusWindow(null);
        setView("start");
    };

    const handleTaskSwitcher = () => {
        if (view === "task_switcher") {
            setView("start");
        } else {
            if (focusWindow) focusWindow(null);
            setView("task_switcher");
        }
    };

    const handleAppClick = (appKey) => {
        openApp(appKey);
        setView("start");
    };

    return (
        <div className="fixed inset-0 w-screen h-screen flex flex-col bg-black text-white font-sans overflow-hidden z-50">
            {/* Background wallpaper overlay */}
            {wallpaper && (
                <div 
                    className="absolute inset-0 w-full h-full opacity-25 bg-cover bg-center pointer-events-none"
                    style={{ backgroundImage: `url(${wallpaper})` }}
                />
            )}

            {/* Top Phone Status Bar (Clickable Notification Bar) */}
            <div 
                onClick={() => setNotificationDrawerOpen((prev) => !prev)}
                className="h-7 flex items-center justify-between px-3 text-[10px] font-medium z-50 bg-black/90 shrink-0 border-b border-white/10 cursor-pointer hover:bg-white/5 transition-colors select-none"
                title="Tap to toggle Notification Center"
            >
                <div className="flex flex-row items-center space-x-2">
                    <ShellClock />
                    <span className="text-white/60 font-semibold">{config?.deviceName || "AIYU-PHONE"}</span>
                </div>
                <div className="flex flex-row items-center space-x-2 text-white/80">
                    {wifi ? <Wifi size={12} /> : <WifiOff size={12} className="text-red-400" />}
                    <Signal size={12} />
                    <Battery size={12} />
                    <ChevronDown size={12} className="text-white/40" />
                </div>
            </div>

            {/* Alpha Phase Notification Banner */}
            {showAlphaBanner && (
                <div className="relative z-40 bg-amber-500/20 border-b border-amber-500/30 px-3 py-1.5 text-[11px] text-amber-200 flex items-center justify-between backdrop-blur-md shrink-0">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0 animate-pulse" />
                        <span><strong>Mobile UI Alpha:</strong> Mobile UI is currently in Alpha phase.</span>
                    </div>
                    <button 
                        onClick={() => setShowAlphaBanner(false)}
                        className="p-1 hover:bg-white/10 rounded text-amber-300 hover:text-white transition-colors"
                        title="Dismiss notice"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Slide-Down Notification Drawer / Action Center */}
            <AnimatePresence>
                {notificationDrawerOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/65 backdrop-blur-sm z-40"
                            onClick={() => setNotificationDrawerOpen(false)}
                        />
                        <motion.div
                            initial={{ y: "-100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "-100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 220 }}
                            className="absolute top-7 left-0 right-0 z-50 bg-neutral-900/95 border-b border-white/15 p-4 shadow-2xl rounded-b-2xl text-white max-h-[80vh] overflow-y-auto"
                        >
                            {/* Drawer Header */}
                            <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10 text-xs">
                                <div className="flex items-center gap-2 font-semibold text-gray-300">
                                    <Bell size={14} className="text-blue-400" />
                                    <span>Action Center & Notifications</span>
                                </div>
                                <button 
                                    onClick={() => setNotificationDrawerOpen(false)} 
                                    className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white"
                                >
                                    <ChevronUp size={18} />
                                </button>
                            </div>

                            {/* Quick Toggles */}
                            <div className="grid grid-cols-4 gap-2 mb-4">
                                <button 
                                    onClick={() => setWifi(!wifi)} 
                                    className={`p-2.5 rounded-xl flex flex-col items-center gap-1 text-[11px] font-medium transition-all ${
                                        wifi ? accentClass : 'bg-neutral-800 text-gray-400'
                                    }`}
                                >
                                    {wifi ? <Wifi size={18} /> : <WifiOff size={18} />}
                                    <span>Wi-Fi</span>
                                </button>

                                <button 
                                    onClick={() => setCellular(!cellular)} 
                                    className={`p-2.5 rounded-xl flex flex-col items-center gap-1 text-[11px] font-medium transition-all ${
                                        cellular ? accentClass : 'bg-neutral-800 text-gray-400'
                                    }`}
                                >
                                    <Signal size={18} />
                                    <span>Signal</span>
                                </button>

                                <button 
                                    onClick={() => setDeviceMode('tablet')} 
                                    className="p-2.5 rounded-xl flex flex-col items-center gap-1 text-[11px] font-medium bg-neutral-800 text-gray-300 hover:bg-neutral-700 transition-colors"
                                >
                                    <Smartphone size={18} />
                                    <span>Tablet</span>
                                </button>

                                <button 
                                    onClick={() => setDeviceMode('desktop')} 
                                    className="p-2.5 rounded-xl flex flex-col items-center gap-1 text-[11px] font-medium bg-neutral-800 text-gray-300 hover:bg-neutral-700 transition-colors"
                                >
                                    <Moon size={18} />
                                    <span>Desktop</span>
                                </button>
                            </div>

                            {/* Accent Color Quick Select */}
                            <div className="mb-4 bg-neutral-950/60 p-3 rounded-xl border border-white/5">
                                <div className="text-[11px] font-medium text-gray-400 mb-2">Accent Theme</div>
                                <div className="flex gap-2.5 overflow-x-auto pb-1 hide-scrollbar">
                                    {['lumia-cyan', 'crimson', 'cobalt', 'emerald', 'magenta', 'amber', 'violet'].map((color) => (
                                        <button
                                            key={color}
                                            onClick={() => setAccentColor(color)}
                                            className={`w-7 h-7 rounded-full border-2 transition-transform ${
                                                accentColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-80 hover:opacity-100'
                                            }`}
                                            style={{
                                                backgroundColor: color === 'lumia-cyan' ? '#00abf0' :
                                                                 color === 'crimson' ? '#e51400' :
                                                                 color === 'cobalt' ? '#0050ef' :
                                                                 color === 'emerald' ? '#008a00' :
                                                                 color === 'magenta' ? '#d80073' :
                                                                 color === 'amber' ? '#f0a30a' : '#76608a'
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* System Notifications */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-[11px] text-gray-400 font-medium px-1">
                                    <span>Notifications ({notifications.length})</span>
                                    {notifications.length > 0 && (
                                        <button 
                                            onClick={() => setNotifications([])} 
                                            className="hover:text-white flex items-center gap-1 text-xs"
                                        >
                                            <Trash2 size={12} />
                                            <span>Clear All</span>
                                        </button>
                                    )}
                                </div>
                                {notifications.length === 0 ? (
                                    <div className="text-xs text-gray-500 py-4 text-center">No new notifications</div>
                                ) : (
                                    notifications.map((n) => (
                                        <div key={n.id} className="p-3 rounded-xl bg-neutral-800/80 border border-white/5 flex items-start justify-between text-xs">
                                            <div>
                                                <div className="font-semibold text-white mb-0.5">{n.title}</div>
                                                <div className="text-gray-400 text-[11px]">{n.body}</div>
                                            </div>
                                            <span className="text-[10px] text-gray-500 shrink-0 ml-2">{n.time}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content Area */}
            <div className="flex-1 relative overflow-hidden">
                <AnimatePresence mode="wait">
                    {/* START SCREEN (Windows Phone Live Tiles Grid) */}
                    {!activeAppWindow && view === "start" && (
                        <motion.div
                            key="start"
                            initial={{ opacity: 0, x: -60 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -60 }}
                            transition={{ type: "spring", damping: 25, stiffness: 220 }}
                            className="absolute inset-0 overflow-y-auto px-4 pb-16 pt-2 hide-scrollbar"
                        >
                            <div className="flex items-center justify-between mt-4 mb-6 px-1">
                                <div className="flex items-baseline gap-2.5">
                                    <h1 className="text-4xl font-light tracking-tight text-white/90">start</h1>
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                        Alpha Phase
                                    </span>
                                </div>
                                <button 
                                    onClick={() => setView("apps")} 
                                    className="p-2 rounded-full hover:bg-white/10 text-white/80 transition-colors"
                                    title="All Apps"
                                >
                                    <ArrowRight size={24} />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2.5 max-w-sm mx-auto">
                                <LiveTile 
                                    title="Photos" 
                                    icon={PhotosIcon} 
                                    onClick={() => handleAppClick("photos")} 
                                    accentClass={accentClass}
                                    flipContent={<div className="text-xs font-medium">Gallery & Photos</div>}
                                />
                                <LiveTile 
                                    title="Notepad" 
                                    icon={NotepadIcon} 
                                    onClick={() => handleAppClick("notepad")} 
                                    accentClass={accentClass}
                                    flipContent={<div className="text-xs font-medium">Quick Notes</div>}
                                />
                                <LiveTile 
                                    title="VS Code" 
                                    icon={VSCodeIcon} 
                                    wide={true} 
                                    onClick={() => handleAppClick("code")} 
                                    accentClass={accentClass}
                                    flipContent={<div className="text-xs font-mono">index.js — Code Editor</div>}
                                />
                                <LiveTile 
                                    title="GitHub" 
                                    icon={GitHubIcon} 
                                    onClick={() => handleAppClick("github")} 
                                    accentClass={accentClass}
                                    flipContent={<div className="text-xs font-medium">Projects & Repos</div>}
                                />
                                <LiveTile 
                                    title="Browser" 
                                    icon={ChromeIcon} 
                                    onClick={() => handleAppClick("browser")} 
                                    accentClass={accentClass}
                                />
                                <LiveTile 
                                    title="Terminal" 
                                    icon={TerminalIcon} 
                                    wide={true} 
                                    onClick={() => handleAppClick("terminal")} 
                                    accentClass={accentClass}
                                    flipContent={<div className="text-xs font-mono">bash / zsh shell</div>}
                                />
                                <LiveTile title="File Explorer" icon={ExplorerIcon} onClick={() => handleAppClick("explorer")} accentClass={accentClass} />
                                <LiveTile title="Settings" icon={SettingsIcon} onClick={() => handleAppClick("settings")} accentClass={accentClass} />
                                <LiveTile title="Task Manager" icon={TaskManagerIcon} onClick={() => handleAppClick("taskmanager")} accentClass={accentClass} />
                                <LiveTile title="Calculator" icon={CalculatorIcon} onClick={() => handleAppClick("calculator")} accentClass={accentClass} />
                                <LiveTile title="Whiteboard" icon={WhiteboardIcon} onClick={() => handleAppClick("whiteboard")} accentClass={accentClass} />
                                <LiveTile title="Markdown" icon={FileText} onClick={() => handleAppClick("markdown")} accentClass={accentClass} />
                            </div>
                        </motion.div>
                    )}

                    {/* APPS LIST VIEW (Windows Phone Alphabetical Metro App List) */}
                    {!activeAppWindow && view === "apps" && (
                        <motion.div
                            key="apps"
                            initial={{ opacity: 0, x: 60 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 60 }}
                            transition={{ type: "spring", damping: 25, stiffness: 220 }}
                            className="absolute inset-0 overflow-y-auto px-4 pb-16 pt-2 hide-scrollbar"
                        >
                            <div className="flex items-center gap-3 mt-4 mb-6">
                                <button onClick={() => setView("start")} className="p-2 rounded-full hover:bg-white/10 text-white/80">
                                    <ChevronLeft size={24} />
                                </button>
                                <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 flex-1 border border-white/10">
                                    <Search size={18} className="text-gray-400 shrink-0" />
                                    <input 
                                        type="text" 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search apps" 
                                        className="bg-transparent border-none outline-none text-base w-full text-white placeholder-gray-400 font-light"
                                    />
                                </div>
                            </div>

                            {letters.map((letter) => (
                                <div key={letter} className="mb-6">
                                    <button 
                                        onClick={() => setLetterPickerOpen(true)}
                                        className={`w-10 h-10 flex items-center justify-center text-lg font-bold mb-3 ${accentClass}`}
                                    >
                                        {letter}
                                    </button>
                                    <div className="space-y-4 pl-2">
                                        {groupedApps[letter].map((app) => {
                                            const appKey = app.key || app.id;
                                            const appName = app.title || app.name || 'App';
                                            const AppIcon = app.icon;
                                            return (
                                                <div 
                                                    key={appKey} 
                                                    className="flex items-center gap-4 cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-colors"
                                                    onClick={() => handleAppClick(appKey)}
                                                >
                                                    <div className={`w-10 h-10 flex items-center justify-center shrink-0 ${accentClass}`}>
                                                        {AppIcon && typeof AppIcon === "function" ? (
                                                            <AppIcon className="w-6 h-6" />
                                                        ) : AppIcon && typeof AppIcon === "string" ? (
                                                            <img src={AppIcon} alt={appName} className="w-6 h-6" />
                                                        ) : (
                                                            <Sparkles className="w-5 h-5 text-white" />
                                                        )}
                                                    </div>
                                                    <span className="text-lg font-light text-white tracking-wide">{appName}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    )}

                    {/* TASK SWITCHER VIEW (Card Deck Snapshots) */}
                    {!activeAppWindow && view === "task_switcher" && (
                        <motion.div
                            key="task_switcher"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute inset-0 flex items-center overflow-x-auto px-8 space-x-6 bg-black/85 backdrop-blur-md hide-scrollbar"
                        >
                            {windows.length === 0 && (
                                <div className="text-gray-400 w-full text-center font-light text-lg">No running apps</div>
                            )}
                            {windows.map((win) => {
                                const appKey = win.appKey || win.appId;
                                const app = apps.find(a => (a.key || a.id) === appKey);
                                const appTitle = win.title || app?.title || app?.name || "App";
                                const AppIcon = win.icon || app?.icon;
                                return (
                                    <motion.div 
                                        key={win.id}
                                        className="shrink-0 w-64 h-96 bg-neutral-900 border border-white/20 flex flex-col relative rounded-2xl overflow-hidden shadow-2xl cursor-pointer"
                                        drag="y"
                                        dragConstraints={{ top: 0, bottom: 0 }}
                                        onDragEnd={(e, info) => {
                                            if (info.offset.y < -60) closeWin(win.id);
                                        }}
                                        onClick={() => {
                                            if (focusWindow) focusWindow(win.id);
                                            setView("start");
                                        }}
                                    >
                                        <div className="p-3.5 flex justify-between items-center bg-neutral-800 border-b border-white/10">
                                            <div className="flex items-center gap-2 min-w-0">
                                                {AppIcon && typeof AppIcon === "function" ? (
                                                    <AppIcon className="w-5 h-5 text-blue-400 shrink-0" />
                                                ) : null}
                                                <span className="font-medium text-sm truncate text-white">{appTitle}</span>
                                            </div>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); closeWin(win.id); }} 
                                                className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>
                                        <div className="flex-1 p-4 flex flex-col items-center justify-center bg-neutral-950 text-gray-400 text-xs text-center space-y-2">
                                            <span>Active Window Process #{win.id}</span>
                                            <span className="text-[10px] text-gray-500">Tap to switch • Swipe up to close</span>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    )}

                    {/* ACTIVE APP VIEW (Full Screen WP Pivot Navigation) */}
                    {activeAppWindow && (
                        <motion.div
                            key="active_app"
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 40 }}
                            transition={{ duration: 0.25 }}
                            className="absolute inset-0 bg-black flex flex-col z-20"
                        >
                            {/* WP Pivot Header */}
                            <div className="px-4 py-3 shrink-0 bg-black border-b border-white/10 flex items-center justify-between">
                                <div>
                                    <h2 className="text-[11px] font-bold uppercase tracking-widest text-blue-400">
                                        {activeAppWindow.title || activeApp?.title || activeApp?.name || "App"}
                                    </h2>
                                </div>
                                <div className="flex gap-4 text-xs font-light text-white/60">
                                    <span className="text-white font-medium">main</span>
                                    <span>details</span>
                                    <span>settings</span>
                                </div>
                            </div>
                            {/* App Content Area */}
                            <div className="flex-1 relative overflow-hidden bg-[#1b1b1b] text-white">
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
                                    <div className="p-4 text-white">App Content</div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Letter Picker Modal */}
                {letterPickerOpen && (
                    <div className="absolute inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
                        <div className="grid grid-cols-4 gap-2.5 w-full max-w-xs">
                            {Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ").map((l) => (
                                <button 
                                    key={l}
                                    onClick={() => setLetterPickerOpen(false)}
                                    className={`aspect-square flex items-center justify-center text-xl font-bold transition-all ${
                                        letters.includes(l) ? accentClass : "bg-neutral-800 text-neutral-600 opacity-40"
                                    }`}
                                    disabled={!letters.includes(l)}
                                >
                                    {l}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Circular WP AppBar */}
            <div className="h-14 flex items-center justify-around px-6 pb-1 z-50 bg-black border-t border-white/10 shrink-0">
                <button onClick={handleBack} className="p-2 rounded-full hover:bg-white/10 text-white transition-colors" title="Back">
                    <ChevronLeft size={24} />
                </button>
                <button onClick={handleHome} className="p-2 rounded-full hover:bg-white/10 text-white transition-colors" title="Start Home">
                    <Home size={24} />
                </button>
                <button onClick={handleTaskSwitcher} className="p-2 rounded-full hover:bg-white/10 text-white transition-colors" title="Task Switcher">
                    <Layers size={24} />
                </button>
            </div>
        </div>
    );
}
