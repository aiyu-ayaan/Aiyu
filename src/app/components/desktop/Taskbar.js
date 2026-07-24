"use client";
import React, { useEffect, useState } from 'react';
import { Wifi, Volume2, BatteryFull, Search } from 'lucide-react';
import { StartIcon, WidgetsIcon } from './icons';

// Windows 11 style bottom taskbar: centered app icons, Start button, and a
// system tray with live clock.
export default function Taskbar({ apps, windows, activeId, onStart, startOpen, widgetsOpen, onToggleWidgets, onOpen, onTaskClick }) {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000 * 20);
        return () => clearInterval(t);
    }, []);

    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const date = now.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: 'numeric' });

    // Pinned apps always show; open windows get an "active" underline.
    const pinned = apps.filter((a) => a.key !== 'start');

    return (
        <div className="absolute inset-x-0 bottom-0 z-50 flex h-12 items-center justify-between bg-[#e9e9ec]/80 px-2 backdrop-blur-2xl dark:bg-[#1c1c1f]/80">
            {/* Left cluster: Widgets & Winget button */}
            <div className="flex w-40 items-center justify-start pl-1">
                <button
                    onClick={onToggleWidgets}
                    className={`flex h-10 items-center gap-2 rounded-md px-2.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${
                        widgetsOpen ? 'bg-black/5 dark:bg-white/10' : ''
                    }`}
                    aria-label="Widgets & Winget"
                    title="Widgets & Winget"
                >
                    <WidgetsIcon className="h-5 w-5 drop-shadow-sm" />
                    <span className="hidden text-xs font-medium opacity-80 sm:inline">Widgets</span>
                </button>
            </div>


            {/* Center cluster */}
            <div className="flex items-center gap-1">
                {/* Start button */}
                <button
                    onClick={onStart}
                    className={`flex h-10 w-10 items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10 ${
                        startOpen ? 'bg-black/5 dark:bg-white/10' : ''
                    }`}
                    aria-label="Start"
                >
                    <StartIcon className="h-6 w-6" />
                </button>

                <button className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10" aria-label="Search">
                    <Search className="h-5 w-5 opacity-70" />
                </button>

                {pinned.map((a) => {
                    const openWins = windows.filter((w) => w.appKey === a.key && !w.closed);
                    const isOpen = openWins.length > 0;
                    const isActive = openWins.some((w) => w.id === activeId && !w.minimized);
                    return (
                        <button
                            key={a.key}
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
                        </button>
                    );
                })}
            </div>

            {/* System tray */}
            <div className="flex w-40 items-center justify-end gap-3 pr-2 text-neutral-700 dark:text-neutral-200">
                <div className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-black/5 dark:hover:bg-white/10">
                    <Wifi className="h-4 w-4" />
                    <Volume2 className="h-4 w-4" />
                    <BatteryFull className="h-4 w-4" />
                </div>
                <div className="rounded-md px-2 py-1 text-right text-[11px] leading-tight hover:bg-black/5 dark:hover:bg-white/10">
                    <div>{time}</div>
                    <div>{date}</div>
                </div>
            </div>
        </div>
    );
}
