"use client";
import React, { useEffect, useState, useRef } from 'react';
import { Wifi, WifiOff, Volume2, VolumeX, BatteryFull, Search, Bluetooth, Moon, Sun, Settings, Plane, ChevronLeft, ChevronRight, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { StartIcon, WidgetsIcon } from './icons';

// Windows 11 style bottom taskbar: centered app icons, Start button, and a
// system tray with live clock.
export default function Taskbar({
    apps,
    windows,
    activeId,
    onStart,
    startOpen,
    widgetsOpen,
    onToggleWidgets,
    onOpen,
    onTaskClick,
    systemSettings: extSystemSettings,
    onUpdateSystemSettings,
}) {
    // Starts null: rendering the real clock during SSR made the server HTML
    // disagree with the client on every load ("12:15 PM" vs "12:16 PM"), and
    // React responded by throwing away and regenerating the tray subtree.
    const [now, setNow] = useState(null);
    const [quickOpen, setQuickOpen] = useState(false);
    const [calendarOpen, setCalendarOpen] = useState(false);
    const trayRef = useRef(null);

    // Fallback internal states
    const [localSettings, setLocalSettings] = useState({
        wifiOn: true,
        btOn: true,
        nightLightOn: false,
        focusOn: false,
        airplaneOn: false,
        volume: 80,
        brightness: 100,
        isMuted: false,
    });

    const settings = extSystemSettings || localSettings;
    const updateSettings = (updates) => {
        if (onUpdateSystemSettings) {
            onUpdateSystemSettings(updates);
        } else {
            setLocalSettings((prev) => ({ ...prev, ...updates }));
        }
    };

    const handleToggleWifi = () => {
        const next = !settings.wifiOn;
        if (next) {
            updateSettings({ wifiOn: true, airplaneOn: false });
        } else {
            updateSettings({ wifiOn: false });
        }
    };

    const handleToggleAirplane = () => {
        const next = !settings.airplaneOn;
        if (next) {
            updateSettings({ airplaneOn: true, wifiOn: false });
        } else {
            updateSettings({ airplaneOn: false });
        }
    };

    // Calendar state
    const [calDate, setCalDate] = useState(() => new Date());

    useEffect(() => {
        setNow(new Date());
        const t = setInterval(() => setNow(new Date()), 1000 * 20);
        return () => clearInterval(t);
    }, []);

    // Dismiss flyouts when clicking outside
    useEffect(() => {
        if (!quickOpen && !calendarOpen) return;

        const handleClickOutside = (e) => {
            if (trayRef.current && !trayRef.current.contains(e.target)) {
                setQuickOpen(false);
                setCalendarOpen(false);
            }
        };

        window.addEventListener('pointerdown', handleClickOutside);
        return () => window.removeEventListener('pointerdown', handleClickOutside);
    }, [quickOpen, calendarOpen]);

    const time = now ? now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
    const date = now ? now.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: 'numeric' }) : '--/--/----';

    // Pinned apps always show; open windows get an "active" underline.
    const pinned = apps.filter((a) => a.key !== 'start');

    return (
        <div className="absolute inset-x-0 bottom-0 z-50 flex h-12 items-center justify-between px-2 win-acrylic win-acrylic-noise win-acrylic-highlight bg-[#e8e8ee]/65 dark:bg-[#1a1a1f]/70 border-t border-white/25 dark:border-white/8">
            {/* Left cluster: Widgets & Winget button */}
            <div className="flex w-40 items-center justify-start pl-1">
                <motion.button
                    whileTap={{ scale: 0.92 }}
                    whileHover={{ scale: 1.04 }}
                    onClick={onToggleWidgets}
                    className={`flex h-10 items-center gap-2 rounded-md px-2.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${
                        widgetsOpen ? 'bg-black/5 dark:bg-white/10' : ''
                    }`}
                    aria-label="Widgets & Winget"
                    title="Widgets & Winget"
                >
                    <WidgetsIcon className="h-5 w-5 drop-shadow-sm" />
                    <span className="hidden text-xs font-medium opacity-80 sm:inline">Widgets</span>
                </motion.button>
            </div>


            {/* Center cluster */}
            <div className="flex items-center gap-1">
                {/* Start button */}
                <motion.button
                    whileTap={{ scale: 0.92 }}
                    whileHover={{ scale: 1.05 }}
                    onClick={onStart}
                    className={`flex h-10 w-10 items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10 ${
                        startOpen ? 'bg-black/5 dark:bg-white/10' : ''
                    }`}
                    aria-label="Start"
                >
                    <StartIcon className="h-6 w-6" />
                </motion.button>

                <motion.button
                    whileTap={{ scale: 0.92 }}
                    whileHover={{ scale: 1.05 }}
                    onClick={onStart}
                    className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10"
                    aria-label="Search"
                >
                    <Search className="h-5 w-5 opacity-70" />
                </motion.button>

                {pinned.map((a) => {
                    const openWins = windows.filter((w) => w.appKey === a.key && !w.closed);
                    const isOpen = openWins.length > 0;
                    const isActive = openWins.some((w) => w.id === activeId && !w.minimized);
                    return (
                        <motion.button
                            key={a.key}
                            whileTap={{ scale: 0.92 }}
                            whileHover={{ scale: 1.05 }}
                            onClick={() => (isOpen ? onTaskClick(a.key) : onOpen(a.key))}
                            className="group relative flex h-10 w-10 items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10"
                            title={a.title}
                        >
                            <a.icon className="h-5 w-5 text-blue-500" />
                            {isOpen && (
                                <span
                                    className={`absolute bottom-0.5 h-[3px] rounded-full bg-blue-500 transition-all ${
                                        isActive ? 'w-4' : 'w-1.5 opacity-70'
                                    }`}
                                />
                            )}
                        </motion.button>
                    );
                })}
            </div>

            {/* System tray */}
            <div ref={trayRef} className="relative flex w-40 items-center justify-end gap-1.5 pr-2 text-neutral-700 dark:text-neutral-200">
                {/* Quick Settings Button */}
                <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={() => {
                        setQuickOpen((v) => !v);
                        setCalendarOpen(false);
                    }}
                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${
                        quickOpen ? 'bg-black/10 dark:bg-white/15' : ''
                    }`}
                    title="Quick Settings (Wi-Fi, Sound, Battery)"
                >
                    {settings.airplaneOn ? (
                        <Plane className="h-4 w-4 text-blue-400" />
                    ) : !settings.wifiOn ? (
                        <WifiOff className="h-4 w-4 text-red-400 opacity-60" />
                    ) : (
                        <Wifi className="h-4 w-4 text-blue-400" />
                    )}
                    {settings.isMuted || settings.volume === 0 ? (
                        <VolumeX className="h-4 w-4 text-red-400" />
                    ) : (
                        <Volume2 className="h-4 w-4 text-white/90" />
                    )}
                    <BatteryFull className="h-4 w-4 text-emerald-400" />
                </motion.button>

                {/* Clock & Date Button */}
                <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={() => {
                        setCalendarOpen((v) => !v);
                        setQuickOpen(false);
                    }}
                    className={`rounded-md px-2 py-1 text-right text-[11px] leading-tight transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${
                        calendarOpen ? 'bg-black/10 dark:bg-white/15' : ''
                    }`}
                    title="Calendar & Notifications"
                >
                    <div className="font-semibold text-white/90">{time}</div>
                    <div className="opacity-70">{date}</div>
                </motion.button>

                {/* Quick Settings Flyout Panel */}
                <AnimatePresence>
                    {quickOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 15, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.96 }}
                            transition={{ duration: 0.15, ease: 'easeOut' }}
                            className="absolute right-2 bottom-14 z-[100] w-80 rounded-2xl p-4 text-white select-none win-acrylic win-acrylic-noise win-acrylic-highlight overflow-hidden bg-[#f0f0f5]/70 dark:bg-[#1e1e24]/80 border border-white/25 dark:border-white/12 shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
                        >
                            {/* Switches Grid */}
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                <button
                                    onClick={handleToggleWifi}
                                    className={`flex flex-col items-center justify-center gap-1 rounded-xl p-2.5 transition ${
                                        settings.wifiOn ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
                                    }`}
                                >
                                    {settings.wifiOn ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5 opacity-60" />}
                                    <span className="text-[10px] font-medium truncate max-w-full">{settings.wifiOn ? 'Aiyu-WiFi' : 'Off'}</span>
                                </button>

                                <button
                                    onClick={() => updateSettings({ btOn: !settings.btOn })}
                                    className={`flex flex-col items-center justify-center gap-1 rounded-xl p-2.5 transition ${
                                        settings.btOn ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
                                    }`}
                                >
                                    <Bluetooth className="h-5 w-5" />
                                    <span className="text-[10px] font-medium truncate max-w-full">{settings.btOn ? 'Bluetooth' : 'Off'}</span>
                                </button>

                                <button
                                    onClick={() => updateSettings({ nightLightOn: !settings.nightLightOn })}
                                    className={`flex flex-col items-center justify-center gap-1 rounded-xl p-2.5 transition ${
                                        settings.nightLightOn ? 'bg-amber-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
                                    }`}
                                >
                                    <Moon className="h-5 w-5" />
                                    <span className="text-[10px] font-medium truncate max-w-full">Night Light</span>
                                </button>

                                <button
                                    onClick={() => updateSettings({ focusOn: !settings.focusOn })}
                                    className={`flex flex-col items-center justify-center gap-1 rounded-xl p-2.5 transition ${
                                        settings.focusOn ? 'bg-purple-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
                                    }`}
                                >
                                    <Bell className="h-5 w-5" />
                                    <span className="text-[10px] font-medium truncate max-w-full">Focus Assist</span>
                                </button>

                                <button
                                    onClick={handleToggleAirplane}
                                    className={`flex flex-col items-center justify-center gap-1 rounded-xl p-2.5 transition ${
                                        settings.airplaneOn ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
                                    }`}
                                >
                                    <Plane className="h-5 w-5" />
                                    <span className="text-[10px] font-medium truncate max-w-full">Airplane</span>
                                </button>

                                <button
                                    onClick={() => onOpen('settings')}
                                    className="flex flex-col items-center justify-center gap-1 rounded-xl bg-white/5 p-2.5 text-white/70 hover:bg-white/10 transition"
                                >
                                    <Settings className="h-5 w-5" />
                                    <span className="text-[10px] font-medium truncate max-w-full">Settings</span>
                                </button>
                            </div>

                            {/* Sliders */}
                            <div className="space-y-3 pt-2 border-t border-white/10">
                                {/* Volume Slider */}
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => updateSettings({ isMuted: !settings.isMuted })}
                                        className="text-white/80 hover:text-white transition"
                                    >
                                        {settings.isMuted || settings.volume === 0 ? <VolumeX className="h-4 w-4 text-red-400" /> : <Volume2 className="h-4 w-4" />}
                                    </button>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={settings.isMuted ? 0 : settings.volume}
                                        onChange={(e) => {
                                            updateSettings({ volume: Number(e.target.value), isMuted: false });
                                        }}
                                        className="flex-1 accent-blue-500 cursor-pointer h-1.5 rounded-lg bg-white/20"
                                    />
                                    <span className="text-[10px] font-mono text-white/60 w-7 text-right">{settings.isMuted ? 0 : settings.volume}%</span>
                                </div>

                                {/* Brightness Slider */}
                                <div className="flex items-center gap-3">
                                    <Sun className="h-4 w-4 text-amber-400" />
                                    <input
                                        type="range"
                                        min="10"
                                        max="100"
                                        value={settings.brightness}
                                        onChange={(e) => updateSettings({ brightness: Number(e.target.value) })}
                                        className="flex-1 accent-blue-500 cursor-pointer h-1.5 rounded-lg bg-white/20"
                                    />
                                    <span className="text-[10px] font-mono text-white/60 w-7 text-right">{settings.brightness}%</span>
                                </div>
                            </div>

                            {/* Footer Battery Status */}
                            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-2.5 text-[11px] text-white/60">
                                <div className="flex items-center gap-1.5">
                                    <BatteryFull className="h-4 w-4 text-emerald-400" />
                                    <span>100% Fully Charged</span>
                                </div>
                                <button
                                    onClick={() => {
                                        setQuickOpen(false);
                                        onOpen('settings');
                                    }}
                                    className="p-1 text-white/60 hover:text-white hover:bg-white/10 rounded transition"
                                >
                                    <Settings className="h-4 w-4" />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Calendar & Notification Flyout Panel */}
                <AnimatePresence>
                    {calendarOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 15, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.96 }}
                            transition={{ duration: 0.15, ease: 'easeOut' }}
                            className="absolute right-2 bottom-14 z-[100] w-80 rounded-2xl p-4 text-white select-none win-acrylic win-acrylic-noise win-acrylic-highlight overflow-hidden bg-[#f0f0f5]/70 dark:bg-[#1e1e24]/80 border border-white/25 dark:border-white/12 shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
                        >
                            {/* Date Header */}
                            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                                <div>
                                    <div className="text-sm font-bold text-white">
                                        {calDate.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                                    </div>
                                    <div className="text-[10px] text-white/50">{calDate.getFullYear()}</div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() - 1, 1))}
                                        className="rounded p-1 text-white/70 hover:bg-white/10 hover:text-white transition"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() + 1, 1))}
                                        className="rounded p-1 text-white/70 hover:bg-white/10 hover:text-white transition"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Calendar Grid Header */}
                            <div className="text-center font-semibold text-xs text-blue-400 mb-2">
                                {calDate.toLocaleString([], { month: 'long' })} {calDate.getFullYear()}
                            </div>

                            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-white/50 mb-1">
                                <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                            </div>

                            {/* Calendar Days */}
                            <div className="grid grid-cols-7 gap-1 text-center text-xs">
                                {Array.from({ length: new Date(calDate.getFullYear(), calDate.getMonth(), 1).getDay() }).map((_, i) => (
                                    <div key={`empty-${i}`} className="h-7" />
                                ))}

                                {Array.from({ length: new Date(calDate.getFullYear(), calDate.getMonth() + 1, 0).getDate() }).map((_, i) => {
                                    const dayNum = i + 1;
                                    const isToday =
                                        now &&
                                        dayNum === now.getDate() &&
                                        calDate.getMonth() === now.getMonth() &&
                                        calDate.getFullYear() === now.getFullYear();

                                    return (
                                        <button
                                            key={dayNum}
                                            onClick={() => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth(), dayNum))}
                                            className={`flex h-7 w-7 items-center justify-center rounded-full mx-auto transition-colors font-medium ${
                                                isToday
                                                    ? 'bg-blue-600 font-bold text-white shadow-md ring-2 ring-blue-400/50'
                                                    : 'hover:bg-white/10 text-white/90'
                                            }`}
                                        >
                                            {dayNum}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Today button & Focus Assist bar */}
                            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-2.5 text-xs text-white/70">
                                <button
                                    onClick={() => setCalDate(new Date())}
                                    className="text-[11px] font-semibold text-blue-400 hover:underline"
                                >
                                    Today
                                </button>
                                <div className="text-[10px] text-white/50">No upcoming events</div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

