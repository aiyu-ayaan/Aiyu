"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, X, Clock } from 'lucide-react';

const MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const ACCENT_STYLES = {
    cyan: {
        border: 'border-cyan-500/40 focus:border-cyan-500',
        ring: 'focus:ring-cyan-500/30',
        text: 'text-cyan-400',
        bg: 'bg-cyan-500/10 hover:bg-cyan-500/20',
        badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
        activeBtn: 'bg-cyan-500 text-black font-bold',
    },
    orange: {
        border: 'border-orange-500/40 focus:border-orange-500',
        ring: 'focus:ring-orange-500/30',
        text: 'text-orange-400',
        bg: 'bg-orange-500/10 hover:bg-orange-500/20',
        badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
        activeBtn: 'bg-orange-500 text-black font-bold',
    },
    purple: {
        border: 'border-purple-500/40 focus:border-purple-500',
        ring: 'focus:ring-purple-500/30',
        text: 'text-purple-400',
        bg: 'bg-purple-500/10 hover:bg-purple-500/20',
        badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        activeBtn: 'bg-purple-500 text-white font-bold',
    },
    yellow: {
        border: 'border-yellow-500/40 focus:border-yellow-500',
        ring: 'focus:ring-yellow-500/30',
        text: 'text-yellow-400',
        bg: 'bg-yellow-500/10 hover:bg-yellow-500/20',
        badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
        activeBtn: 'bg-yellow-500 text-black font-bold',
    },
    green: {
        border: 'border-green-500/40 focus:border-green-500',
        ring: 'focus:ring-green-500/30',
        text: 'text-green-400',
        bg: 'bg-green-500/10 hover:bg-green-500/20',
        badge: 'bg-green-500/20 text-green-300 border-green-500/30',
        activeBtn: 'bg-green-500 text-black font-bold',
    },
};

const parseRangeString = (val) => {
    if (!val || typeof val !== 'string') {
        return { startMonth: 'Jan', startYear: String(new Date().getFullYear()), endMonth: 'Dec', endYear: String(new Date().getFullYear()), isPresent: false };
    }

    const parts = val.split('-').map(p => p.trim());
    const startPart = parts[0] || '';
    const endPart = parts[1] || '';

    const isPresent = endPart.toLowerCase() === 'present';

    // Parse start
    const startTokens = startPart.split(' ').filter(Boolean);
    let startMonth = 'Jan';
    let startYear = String(new Date().getFullYear());
    startTokens.forEach(t => {
        const foundMonthIndex = MONTHS.findIndex(m => m.toLowerCase() === t.substring(0, 3).toLowerCase());
        if (foundMonthIndex !== -1) {
            startMonth = MONTHS[foundMonthIndex];
        } else if (/^\d{4}$/.test(t)) {
            startYear = t;
        }
    });

    // Parse end
    let endMonth = 'Dec';
    let endYear = String(new Date().getFullYear());
    if (!isPresent && endPart) {
        const endTokens = endPart.split(' ').filter(Boolean);
        endTokens.forEach(t => {
            const foundMonthIndex = MONTHS.findIndex(m => m.toLowerCase() === t.substring(0, 3).toLowerCase());
            if (foundMonthIndex !== -1) {
                endMonth = MONTHS[foundMonthIndex];
            } else if (/^\d{4}$/.test(t)) {
                endYear = t;
            }
        });
    }

    return { startMonth, startYear, endMonth, endYear, isPresent };
};

const parseSingleString = (val) => {
    if (!val || typeof val !== 'string') {
        return { month: 'Jan', year: String(new Date().getFullYear()) };
    }
    const tokens = val.split(/[\s,]+/).filter(Boolean);
    let month = 'Jan';
    let year = String(new Date().getFullYear());

    tokens.forEach(t => {
        const foundMonthIndex = MONTHS.findIndex(m => m.toLowerCase() === t.substring(0, 3).toLowerCase());
        if (foundMonthIndex !== -1) {
            month = MONTHS[foundMonthIndex];
        } else if (/^\d{4}$/.test(t)) {
            year = t;
        }
    });

    return { month, year };
};

export default function DatePickerInput({
    value = '',
    onChange,
    mode = 'range', // 'range' | 'single'
    accentColor = 'cyan',
    placeholder = '',
    required = false,
    className = '',
    name = '',
}) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    const style = ACCENT_STYLES[accentColor] || ACCENT_STYLES.cyan;
    const currentYear = new Date().getFullYear();
    const yearsList = Array.from({ length: 35 }, (_, i) => String(currentYear + 5 - i));

    // Internal picker states
    const rangeData = parseRangeString(value);
    const singleData = parseSingleString(value);

    const [startMonth, setStartMonth] = useState(rangeData.startMonth);
    const [startYear, setStartYear] = useState(rangeData.startYear);
    const [endMonth, setEndMonth] = useState(rangeData.endMonth);
    const [endYear, setEndYear] = useState(rangeData.endYear);
    const [isPresent, setIsPresent] = useState(rangeData.isPresent);

    const [singleMonth, setSingleMonth] = useState(singleData.month);
    const [singleYear, setSingleYear] = useState(singleData.year);

    // Sync when popover opens
    useEffect(() => {
        if (isOpen) {
            if (mode === 'range') {
                const parsed = parseRangeString(value);
                setStartMonth(parsed.startMonth);
                setStartYear(parsed.startYear);
                setEndMonth(parsed.endMonth);
                setEndYear(parsed.endYear);
                setIsPresent(parsed.isPresent);
            } else {
                const parsed = parseSingleString(value);
                setSingleMonth(parsed.month);
                setSingleYear(parsed.year);
            }
        }
    }, [isOpen, value, mode]);

    // Close popover when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const applyRangeSelection = (sM = startMonth, sY = startYear, eM = endMonth, eY = endYear, pres = isPresent) => {
        let result = '';
        if (pres) {
            result = `${sM} ${sY} - Present`;
        } else {
            result = `${sM} ${sY} - ${eM} ${eY}`;
        }
        onChange(result);
    };

    const applySingleSelection = (m = singleMonth, y = singleYear) => {
        const result = `${m} ${y}`;
        onChange(result);
    };

    return (
        <div ref={containerRef} className={`relative w-full ${className}`}>
            <div className="relative flex items-center group/picker">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`absolute left-3 p-1 rounded-md text-slate-400 hover:${style.text} transition-colors z-10 flex items-center justify-center`}
                    title="Open Date Picker"
                >
                    <CalendarIcon size={16} />
                </button>
                <input
                    type="text"
                    name={name}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder || (mode === 'range' ? 'e.g. Jun 2025 - Present' : 'e.g. July 2026')}
                    required={required}
                    className={`w-full bg-slate-950/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-10 text-slate-200 focus:outline-none transition-all placeholder:text-slate-600 text-sm font-mono ${style.border} ${style.ring}`}
                />
                {value && (
                    <button
                        type="button"
                        onClick={() => onChange('')}
                        className="absolute right-3 text-slate-500 hover:text-slate-300 p-1"
                        title="Clear field"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* Popover */}
            {isOpen && (
                <div className="absolute left-0 top-full mt-2 z-50 w-80 sm:w-96 bg-slate-900/95 border border-white/15 rounded-2xl shadow-2xl backdrop-blur-2xl p-4 text-slate-200 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                        <div className="flex items-center gap-2">
                            <CalendarIcon className={`w-4 h-4 ${style.text}`} />
                            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                                {mode === 'range' ? 'Timeline Range Picker' : 'Select Date / Year'}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {mode === 'range' ? (
                        <div className="space-y-4">
                            {/* Start Section */}
                            <div>
                                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1.5 font-bold">
                                    Start Period
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <select
                                        value={startMonth}
                                        onChange={(e) => {
                                            const m = e.target.value;
                                            setStartMonth(m);
                                            applyRangeSelection(m, startYear, endMonth, endYear, isPresent);
                                        }}
                                        className="bg-slate-950 border border-white/10 rounded-lg p-2 text-xs font-mono text-slate-200 outline-none focus:border-cyan-500"
                                    >
                                        {MONTHS.map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>

                                    <select
                                        value={startYear}
                                        onChange={(e) => {
                                            const y = e.target.value;
                                            setStartYear(y);
                                            applyRangeSelection(startMonth, y, endMonth, endYear, isPresent);
                                        }}
                                        className="bg-slate-950 border border-white/10 rounded-lg p-2 text-xs font-mono text-slate-200 outline-none focus:border-cyan-500"
                                    >
                                        {yearsList.map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* End Section */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold">
                                        End Period
                                    </label>
                                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-mono text-slate-300 hover:text-white">
                                        <input
                                            type="checkbox"
                                            checked={isPresent}
                                            onChange={(e) => {
                                                const pres = e.target.checked;
                                                setIsPresent(pres);
                                                applyRangeSelection(startMonth, startYear, endMonth, endYear, pres);
                                            }}
                                            className="rounded border-white/20 bg-slate-950 text-cyan-500 focus:ring-0"
                                        />
                                        <span>Present / Ongoing</span>
                                    </label>
                                </div>

                                {!isPresent ? (
                                    <div className="grid grid-cols-2 gap-2">
                                        <select
                                            value={endMonth}
                                            onChange={(e) => {
                                                const m = e.target.value;
                                                setEndMonth(m);
                                                applyRangeSelection(startMonth, startYear, m, endYear, isPresent);
                                            }}
                                            className="bg-slate-950 border border-white/10 rounded-lg p-2 text-xs font-mono text-slate-200 outline-none focus:border-cyan-500"
                                        >
                                            {MONTHS.map(m => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>

                                        <select
                                            value={endYear}
                                            onChange={(e) => {
                                                const y = e.target.value;
                                                setEndYear(y);
                                                applyRangeSelection(startMonth, startYear, endMonth, y, isPresent);
                                            }}
                                            className="bg-slate-950 border border-white/10 rounded-lg p-2 text-xs font-mono text-slate-200 outline-none focus:border-cyan-500"
                                        >
                                            {yearsList.map(y => (
                                                <option key={y} value={y}>{y}</option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <div className={`p-2.5 rounded-lg border border-dashed border-white/10 ${style.bg} ${style.text} text-xs font-mono font-bold flex items-center justify-center gap-2`}>
                                        <Clock size={14} /> Currently Active (Present)
                                    </div>
                                )}
                            </div>

                            {/* Quick Presets */}
                            <div className="pt-2 border-t border-white/10 flex flex-wrap gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const nowY = String(new Date().getFullYear());
                                        const nowM = MONTHS[new Date().getMonth()];
                                        setStartMonth(nowM);
                                        setStartYear(nowY);
                                        setIsPresent(true);
                                        applyRangeSelection(nowM, nowY, endMonth, endYear, true);
                                    }}
                                    className="px-2.5 py-1 text-[10px] font-mono bg-white/5 hover:bg-white/10 rounded-md text-slate-300 transition-colors"
                                >
                                    Current - Present
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const nowY = String(new Date().getFullYear());
                                        setStartMonth('Jan');
                                        setStartYear(nowY);
                                        setEndMonth('Dec');
                                        setEndYear(nowY);
                                        setIsPresent(false);
                                        applyRangeSelection('Jan', nowY, 'Dec', nowY, false);
                                    }}
                                    className="px-2.5 py-1 text-[10px] font-mono bg-white/5 hover:bg-white/10 rounded-md text-slate-300 transition-colors"
                                >
                                    Full Year {new Date().getFullYear()}
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Single Mode */
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1.5 font-bold">
                                    Month & Year
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <select
                                        value={singleMonth}
                                        onChange={(e) => {
                                            const m = e.target.value;
                                            setSingleMonth(m);
                                            applySingleSelection(m, singleYear);
                                        }}
                                        className="bg-slate-950 border border-white/10 rounded-lg p-2 text-xs font-mono text-slate-200 outline-none focus:border-cyan-500"
                                    >
                                        {MONTHS.map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>

                                    <select
                                        value={singleYear}
                                        onChange={(e) => {
                                            const y = e.target.value;
                                            setSingleYear(y);
                                            applySingleSelection(singleMonth, y);
                                        }}
                                        className="bg-slate-950 border border-white/10 rounded-lg p-2 text-xs font-mono text-slate-200 outline-none focus:border-cyan-500"
                                    >
                                        {yearsList.map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Quick Presets */}
                            <div className="pt-2 border-t border-white/10 flex flex-wrap gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const nowY = String(new Date().getFullYear());
                                        const nowM = MONTHS[new Date().getMonth()];
                                        setSingleMonth(nowM);
                                        setSingleYear(nowY);
                                        applySingleSelection(nowM, nowY);
                                    }}
                                    className="px-2.5 py-1 text-[10px] font-mono bg-white/5 hover:bg-white/10 rounded-md text-slate-300 transition-colors"
                                >
                                    Current Month
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const nowY = String(new Date().getFullYear());
                                        onChange(nowY);
                                    }}
                                    className="px-2.5 py-1 text-[10px] font-mono bg-white/5 hover:bg-white/10 rounded-md text-slate-300 transition-colors"
                                >
                                    Year Only ({new Date().getFullYear()})
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="mt-4 pt-3 border-t border-white/10 flex justify-end">
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${style.activeBtn}`}
                        >
                            Confirm Selection
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
