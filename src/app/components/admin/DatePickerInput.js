"use client";
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FaCalendar as CalendarIcon, FaXmark as X, FaClock as Clock } from 'react-icons/fa6';

const MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

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
    placeholder = '',
    required = false,
    className = '',
    name = '',
    position = 'auto', // 'auto' | 'up' | 'down'
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const containerRef = useRef(null);
    const inputRef = useRef(null);
    const popoverRef = useRef(null);

    const [popoverCoords, setPopoverCoords] = useState({ top: 0, left: 0, width: 340 });

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

    useEffect(() => {
        setMounted(true);
    }, []);

    const calculatePosition = () => {
        if (!inputRef.current) return;
        const rect = inputRef.current.getBoundingClientRect();
        const popoverWidth = Math.min(340, window.innerWidth - 32);
        const popoverHeight = mode === 'range' ? 340 : 260;

        let openUpward = position === 'up';
        if (position === 'auto') {
            const spaceBelow = window.innerHeight - rect.bottom;
            if (spaceBelow < popoverHeight + 20 && rect.top > popoverHeight + 20) {
                openUpward = true;
            }
        }

        let top = openUpward
            ? rect.top + window.scrollY - popoverHeight - 6
            : rect.bottom + window.scrollY + 6;

        let left = rect.left + window.scrollX;
        if (left + popoverWidth > window.innerWidth - 16) {
            left = window.innerWidth - popoverWidth - 16;
        }
        if (left < 16) left = 16;

        setPopoverCoords({ top, left, width: popoverWidth });
    };

    const handleToggle = () => {
        if (!isOpen) {
            calculatePosition();
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
        setIsOpen(!isOpen);
    };

    // Update position on scroll or resize
    useEffect(() => {
        if (isOpen) {
            calculatePosition();
            const handleScrollResize = () => calculatePosition();
            window.addEventListener('scroll', handleScrollResize, true);
            window.addEventListener('resize', handleScrollResize);
            return () => {
                window.removeEventListener('scroll', handleScrollResize, true);
                window.removeEventListener('resize', handleScrollResize);
            };
        }
    }, [isOpen, mode]);

    // Close when clicking outside both container & popover
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(e.target) &&
                popoverRef.current &&
                !popoverRef.current.contains(e.target)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const applyRangeSelection = (sM = startMonth, sY = startYear, eM = endMonth, eY = endYear, pres = isPresent) => {
        const result = pres ? `${sM} ${sY} - Present` : `${sM} ${sY} - ${eM} ${eY}`;
        onChange(result);
    };

    const applySingleSelection = (m = singleMonth, y = singleYear) => {
        const result = `${m} ${y}`;
        onChange(result);
    };

    return (
        <div ref={containerRef} className={`relative w-full ${className}`}>
            <div ref={inputRef} className="relative flex items-center group/picker">
                <button
                    type="button"
                    onClick={handleToggle}
                    className="adm-icon-btn !absolute left-0.5 z-10"
                    title="Open Date Picker"
                    aria-label="Open date picker"
                >
                    <CalendarIcon size={14} />
                </button>
                <input
                    type="text"
                    name={name}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder || (mode === 'range' ? 'e.g. Jun 2025 - Present' : 'e.g. July 2026')}
                    required={required}
                    className="adm-input !pl-11 !pr-11 font-mono"
                />
                {value && (
                    <button
                        type="button"
                        onClick={() => onChange('')}
                        className="adm-icon-btn !absolute right-0.5"
                        title="Clear field"
                        aria-label="Clear field"
                    >
                        <X size={13} />
                    </button>
                )}
            </div>

            {/* Portal Popover with z-[99999] floating above footers */}
            {isOpen && mounted && createPortal(
                <div
                    ref={popoverRef}
                    style={{
                        position: 'absolute',
                        top: `${popoverCoords.top}px`,
                        left: `${popoverCoords.left}px`,
                        width: `${popoverCoords.width}px`,
                    }}
                    className="adm-dialog adm-root !max-w-none !overflow-visible z-[99999] p-4 text-sm animate-in fade-in zoom-in-95 duration-150"
                >
                    <div className="flex items-center justify-between border-b border-[var(--hairline)] pb-2.5 mb-3">
                        <div className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4 text-[var(--accent-cyan)]" />
                            <span className="text-sm font-semibold text-[var(--text-bright)]">
                                {mode === 'range' ? 'Pick a date range' : 'Pick a date'}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="adm-icon-btn"
                            aria-label="Close date picker"
                        >
                            <X size={15} />
                        </button>
                    </div>

                    {mode === 'range' ? (
                        <div className="space-y-3">
                            {/* Start Section */}
                            <div>
                                <label className="adm-label mb-1">
                                    Start
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <select
                                        aria-label="Start month"
                                        value={startMonth}
                                        onChange={(e) => {
                                            const m = e.target.value;
                                            setStartMonth(m);
                                            applyRangeSelection(m, startYear, endMonth, endYear, isPresent);
                                        }}
                                        className="adm-input font-mono"
                                    >
                                        {MONTHS.map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>

                                    <select
                                        aria-label="Start year"
                                        value={startYear}
                                        onChange={(e) => {
                                            const y = e.target.value;
                                            setStartYear(y);
                                            applyRangeSelection(startMonth, y, endMonth, endYear, isPresent);
                                        }}
                                        className="adm-input font-mono"
                                    >
                                        {yearsList.map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* End Section */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="adm-label">
                                        End
                                    </label>
                                    <label className="flex min-h-11 sm:min-h-0 items-center gap-1.5 cursor-pointer text-sm text-[var(--text-secondary)]">
                                        <input
                                            type="checkbox"
                                            checked={isPresent}
                                            onChange={(e) => {
                                                const pres = e.target.checked;
                                                setIsPresent(pres);
                                                applyRangeSelection(startMonth, startYear, endMonth, endYear, pres);
                                            }}
                                            className="adm-check"
                                        />
                                        <span>Present / Ongoing</span>
                                    </label>
                                </div>

                                {!isPresent ? (
                                    <div className="grid grid-cols-2 gap-2">
                                        <select
                                            aria-label="End month"
                                            value={endMonth}
                                            onChange={(e) => {
                                                const m = e.target.value;
                                                setEndMonth(m);
                                                applyRangeSelection(startMonth, startYear, m, endYear, isPresent);
                                            }}
                                            className="adm-input font-mono"
                                        >
                                            {MONTHS.map(m => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>

                                        <select
                                            aria-label="End year"
                                            value={endYear}
                                            onChange={(e) => {
                                                const y = e.target.value;
                                                setEndYear(y);
                                                applyRangeSelection(startMonth, startYear, endMonth, y, isPresent);
                                            }}
                                            className="adm-input font-mono"
                                        >
                                            {yearsList.map(y => (
                                                <option key={y} value={y}>{y}</option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <div className="adm-notice adm-notice-info flex items-center justify-center gap-2">
                                        <Clock size={14} /> Ongoing (present)
                                    </div>
                                )}
                            </div>

                            {/* Quick Presets */}
                            <div className="pt-2 border-t border-[var(--hairline)] flex flex-wrap gap-1.5">
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
                                    className="adm-btn !px-3 text-xs"
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
                                    className="adm-btn !px-3 text-xs"
                                >
                                    Full Year {new Date().getFullYear()}
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Single Mode */
                        <div className="space-y-3">
                            <div>
                                <label className="adm-label mb-1">
                                    Month and year
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <select
                                        aria-label="Month"
                                        value={singleMonth}
                                        onChange={(e) => {
                                            const m = e.target.value;
                                            setSingleMonth(m);
                                            applySingleSelection(m, singleYear);
                                        }}
                                        className="adm-input font-mono"
                                    >
                                        {MONTHS.map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>

                                    <select
                                        aria-label="Year"
                                        value={singleYear}
                                        onChange={(e) => {
                                            const y = e.target.value;
                                            setSingleYear(y);
                                            applySingleSelection(singleMonth, y);
                                        }}
                                        className="adm-input font-mono"
                                    >
                                        {yearsList.map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Quick Presets */}
                            <div className="pt-2 border-t border-[var(--hairline)] flex flex-wrap gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const nowY = String(new Date().getFullYear());
                                        const nowM = MONTHS[new Date().getMonth()];
                                        setSingleMonth(nowM);
                                        setSingleYear(nowY);
                                        applySingleSelection(nowM, nowY);
                                    }}
                                    className="adm-btn !px-3 text-xs"
                                >
                                    Current Month
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const nowY = String(new Date().getFullYear());
                                        onChange(nowY);
                                    }}
                                    className="adm-btn !px-3 text-xs"
                                >
                                    Year Only ({new Date().getFullYear()})
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="mt-3 pt-2 border-t border-[var(--hairline)] flex justify-end">
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="adm-btn adm-btn-primary w-full sm:w-auto"
                        >
                            Confirm selection
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
