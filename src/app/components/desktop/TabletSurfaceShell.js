"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Wifi, Battery, Volume2, Search, Grid, X, Maximize, Columns, LayoutTemplate,
    Sun, MonitorSmartphone, Smartphone, Monitor, Tablet, Settings, User, FileText,
    AppWindow, Plus, Minus
} from "lucide-react";
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

const accentColors = [
    { id: "lumia-cyan", name: "Cyan", color: "#00abf0" },
    { id: "crimson", name: "Crimson", color: "#e51400" },
    { id: "cobalt", name: "Cobalt", color: "#0050ef" },
    { id: "emerald", name: "Emerald", color: "#008a00" },
    { id: "magenta", name: "Magenta", color: "#d80073" },
    { id: "amber", name: "Amber", color: "#f0a30a" },
    { id: "violet", name: "Violet", color: "#76608a" },
];

export default function TabletSurfaceShell({ apps, windows, activeWindowId, openApp, closeWin, focusWindow, config, wallpaper }) {
    const { deviceMode, setDeviceMode, accentColor, setAccentColor } = useDeviceMode();
    const [time, setTime] = useState(new Date());
    const [startOpen, setStartOpen] = useState(false);
    const [quickActionOpen, setQuickActionOpen] = useState(false);
    const [snapState, setSnapState] = useState({}); // { [windowId]: 'maximized' | 'left' | 'right' }

    const accentClass = accentThemeMap[accentColor] || accentThemeMap["lumia-cyan"];

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const timeString = time.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

    const handleWindowAction = (winId, action) => {
        setSnapState(prev => ({
            ...prev,
            [winId]: action
        }));
    };

    const toggleStart = () => {
        setStartOpen(!startOpen);
        if (quickActionOpen) setQuickActionOpen(false);
    };

    const toggleQuickAction = () => {
        setQuickActionOpen(!quickActionOpen);
        if (startOpen) setStartOpen(false);
    };

    const handleAppLaunch = (appId) => {
        openApp(appId);
        setStartOpen(false);
    };

    return (
        <div className="w-full h-full flex flex-col bg-gray-900 text-white font-sans overflow-hidden relative">
            {wallpaper && (
                <div 
                    className="absolute inset-0 w-full h-full bg-cover bg-center pointer-events-none"
                    style={{ backgroundImage: `url(${wallpaper})` }}
                />
            )}

            {/* Main Desktop Area */}
            <div className="flex-1 relative overflow-hidden">
                {/* Windows */}
                {windows.map((win) => {
                    const app = apps.find(a => a.id === win.appId);
                    if (!app) return null;

                    const state = snapState[win.id] || 'maximized';
                    const isActive = activeWindowId === win.id;

                    let layoutClasses = "absolute inset-0 transition-all duration-300 ease-in-out";
                    let zIndex = isActive ? 20 : 10;

                    if (state === 'left') {
                        layoutClasses = "absolute top-0 left-0 h-full w-1/2 border-r border-gray-700/50 shadow-xl transition-all duration-300 ease-in-out";
                    } else if (state === 'right') {
                        layoutClasses = "absolute top-0 right-0 h-full w-1/2 border-l border-gray-700/50 shadow-xl transition-all duration-300 ease-in-out";
                    }

                    return (
                        <div 
                            key={win.id}
                            className={`${layoutClasses} flex flex-col bg-white text-black`}
                            style={{ zIndex }}
                            onClick={() => focusWindow(win.id)}
                        >
                            {/* Touch Title Bar */}
                            <div className={`h-12 flex items-center justify-between px-3 shrink-0 ${isActive ? 'bg-gray-100' : 'bg-gray-50'}`}>
                                <div className="flex items-center gap-2">
                                    {app.icon && typeof app.icon === "string" ? (
                                        <img src={app.icon} alt={app.name} className="w-6 h-6" />
                                    ) : (
                                        <AppWindow size={20} className="text-gray-500" />
                                    )}
                                    <span className="font-semibold text-sm">{app.name}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => handleWindowAction(win.id, 'left')} className="p-2 hover:bg-gray-200 rounded text-gray-600" title="Snap Left">
                                        <LayoutTemplate size={18} className="rotate-90" />
                                    </button>
                                    <button onClick={() => handleWindowAction(win.id, 'right')} className="p-2 hover:bg-gray-200 rounded text-gray-600" title="Snap Right">
                                        <LayoutTemplate size={18} className="-rotate-90" />
                                    </button>
                                    <button onClick={() => handleWindowAction(win.id, 'maximized')} className="p-2 hover:bg-gray-200 rounded text-gray-600" title="Maximize">
                                        <Maximize size={18} />
                                    </button>
                                    <button onClick={() => closeWin(win.id)} className="p-2 hover:bg-red-500 hover:text-white rounded text-gray-600" title="Close">
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>
                            {/* App Content */}
                            <div className="flex-1 relative overflow-hidden">
                                {app.component ? React.createElement(app.component, {
                                    windowId: win.id,
                                    app,
                                    config,
                                    isMobile: false
                                }) : (
                                    <div className="p-4">Content for {app.name}</div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* Touch Start Menu Overlay */}
                <AnimatePresence>
                    {startOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 50 }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl h-[70vh] bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden text-white"
                        >
                            <div className="p-6">
                                <div className="flex items-center gap-4 bg-black/40 rounded-full px-4 py-3 mb-8 border border-white/10">
                                    <Search size={20} className="text-gray-400" />
                                    <input 
                                        type="text" 
                                        placeholder="Search apps, settings, and web..." 
                                        className="bg-transparent border-none outline-none flex-1 text-lg"
                                    />
                                </div>

                                <h3 className="text-sm font-semibold mb-4 px-2">Pinned</h3>
                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-4">
                                    {apps.slice(0, 12).map((app) => (
                                        <button 
                                            key={app.id}
                                            onClick={() => handleAppLaunch(app.id)}
                                            className="flex flex-col items-center gap-2 p-2 hover:bg-white/10 rounded-xl transition-colors"
                                        >
                                            <div className={`w-14 h-14 rounded-lg flex items-center justify-center shadow-sm ${accentClass}`}>
                                                {app.icon && typeof app.icon === "string" ? (
                                                    <img src={app.icon} alt={app.name} className="w-8 h-8" />
                                                ) : (
                                                    <Grid size={24} />
                                                )}
                                            </div>
                                            <span className="text-xs text-center truncate w-full">{app.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="mt-auto p-4 border-t border-white/10 flex items-center justify-between bg-black/20">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                                        <User size={20} />
                                    </div>
                                    <span className="font-semibold text-sm">User</span>
                                </div>
                                <button className="p-2 hover:bg-white/10 rounded-full">
                                    <Settings size={20} />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Quick Action Center Sheet */}
                <AnimatePresence>
                    {quickActionOpen && (
                        <>
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-black/20 z-40"
                                onClick={() => setQuickActionOpen(false)}
                            />
                            <motion.div
                                initial={{ x: "100%" }}
                                animate={{ x: 0 }}
                                exit={{ x: "100%" }}
                                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                                className="absolute top-0 right-0 h-full w-80 bg-gray-900/95 backdrop-blur-xl border-l border-gray-700/50 shadow-2xl flex flex-col z-50 overflow-y-auto text-white p-6 space-y-8"
                            >
                                <div>
                                    <h2 className="text-xl font-semibold mb-6">Quick Actions</h2>
                                    
                                    <div className="grid grid-cols-2 gap-3 mb-6">
                                        <button className={`p-4 rounded-xl flex flex-col items-start gap-2 ${accentClass}`}>
                                            <Wifi size={20} />
                                            <span className="text-sm font-semibold">Wi-Fi</span>
                                        </button>
                                        <button className="p-4 rounded-xl flex flex-col items-start gap-2 bg-gray-800 hover:bg-gray-700">
                                            <Battery size={20} />
                                            <span className="text-sm font-semibold">Battery saver</span>
                                        </button>
                                        <button className="p-4 rounded-xl flex flex-col items-start gap-2 bg-gray-800 hover:bg-gray-700">
                                            <Sun size={20} />
                                            <span className="text-sm font-semibold">Night light</span>
                                        </button>
                                        <button className={`p-4 rounded-xl flex flex-col items-start gap-2 ${accentClass}`}>
                                            <Volume2 size={20} />
                                            <span className="text-sm font-semibold">Volume</span>
                                        </button>
                                    </div>

                                    <div className="space-y-4 mb-8">
                                        <div>
                                            <div className="flex items-center gap-4">
                                                <Sun size={20} className="text-gray-400" />
                                                <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                                                    <div className={`h-full w-[70%] ${accentClass}`} />
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-4">
                                                <Volume2 size={20} className="text-gray-400" />
                                                <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                                                    <div className={`h-full w-[50%] ${accentClass}`} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Device Mode</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['auto', 'mobile', 'tablet', 'desktop'].map(mode => (
                                            <button 
                                                key={mode}
                                                onClick={() => setDeviceMode(mode)}
                                                className={`p-3 rounded-lg flex items-center justify-center gap-2 text-sm capitalize ${deviceMode === mode ? accentClass : 'bg-gray-800 hover:bg-gray-700'}`}
                                            >
                                                {mode === 'mobile' && <Smartphone size={16} />}
                                                {mode === 'tablet' && <Tablet size={16} />}
                                                {mode === 'desktop' && <Monitor size={16} />}
                                                {mode === 'auto' && <MonitorSmartphone size={16} />}
                                                {mode}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Accent Color</h3>
                                    <div className="flex flex-wrap gap-3">
                                        {accentColors.map(c => (
                                            <button
                                                key={c.id}
                                                onClick={() => setAccentColor(c.id)}
                                                className={`w-10 h-10 rounded-full transition-transform ${accentColor === c.id ? 'ring-2 ring-white scale-110' : 'scale-100 hover:scale-105'}`}
                                                style={{ backgroundColor: c.color }}
                                                title={c.name}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-auto pt-6 border-t border-gray-800 flex items-center gap-4">
                                    <MonitorSmartphone size={24} className="text-gray-400" />
                                    <div>
                                        <div className="font-semibold text-sm">{config?.deviceName || "AIYU-TABLET"}</div>
                                        <div className="text-xs text-gray-400">Connected to network</div>
                                    </div>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>

            {/* Touch Taskbar */}
            <div className="h-[52px] bg-black/60 backdrop-blur-2xl border-t border-white/10 flex items-center justify-between px-4 z-50 relative shrink-0">
                {/* Left: Empty for balance or widgets */}
                <div className="flex items-center w-32">
                    <button className="text-gray-300 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-colors flex items-center gap-2">
                        <Grid size={20} />
                        <span className="text-sm">Widgets</span>
                    </button>
                </div>

                {/* Center: App Icons */}
                <div className="flex items-center justify-center flex-1 gap-2">
                    <button 
                        onClick={toggleStart}
                        className={`w-11 h-11 flex items-center justify-center rounded-lg transition-colors ${startOpen ? 'bg-white/20' : 'hover:bg-white/10'}`}
                    >
                        <Grid size={24} className="text-[#00abf0]" />
                    </button>
                    
                    <button className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors">
                        <Search size={22} className="text-gray-300" />
                    </button>

                    <div className="w-[1px] h-6 bg-white/20 mx-1" />

                    {/* Open Apps */}
                    {windows.map(win => {
                        const app = apps.find(a => a.id === win.appId);
                        const isActive = activeWindowId === win.id;
                        return (
                            <button
                                key={win.id}
                                onClick={() => focusWindow(win.id)}
                                className={`w-11 h-11 flex items-center justify-center rounded-lg transition-colors relative ${isActive ? 'bg-white/10' : 'hover:bg-white/10'}`}
                                title={app?.name}
                            >
                                {app?.icon && typeof app?.icon === "string" ? (
                                    <img src={app.icon} alt={app.name} className="w-6 h-6" />
                                ) : (
                                    <AppWindow size={22} className="text-gray-300" />
                                )}
                                {/* Active indicator */}
                                <div className={`absolute bottom-0 w-3 h-1 rounded-t-full transition-all ${isActive ? accentClass.split(' ')[0] : 'bg-gray-400'}`} />
                            </button>
                        );
                    })}
                </div>

                {/* Right: System Tray */}
                <div className="flex items-center justify-end gap-1 w-32">
                    <button 
                        onClick={toggleQuickAction}
                        className={`flex items-center gap-3 px-3 h-10 rounded-lg transition-colors ${quickActionOpen ? 'bg-white/20' : 'hover:bg-white/10'}`}
                    >
                        <div className="flex items-center gap-2 text-gray-300">
                            <Wifi size={16} />
                            <Volume2 size={16} />
                            <Battery size={16} />
                        </div>
                        <div className="flex flex-col items-end text-xs font-semibold leading-tight text-white">
                            <span>{timeString.split(' ')[0]}</span>
                            <span>{timeString.split(' ')[1]}</span>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}
