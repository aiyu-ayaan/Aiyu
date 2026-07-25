"use client";
import React, { useEffect, useState } from 'react';

const TIME_FORMAT = { hour: 'numeric', minute: '2-digit', hour12: true };

// The mobile and tablet shells re-render their whole tile grid / window list on
// any state change, so a 1s clock interval living in the shell repainted the
// entire UI every second. The tick lives here instead, and only ever repaints
// the clock text. It also only shows minutes, so 20s resolution is enough.
//
// Starts empty so the server HTML and the first client render agree (a real
// time string would differ and make React discard the status bar subtree).
function useClockString() {
    const [value, setValue] = useState('');

    useEffect(() => {
        const read = () => setValue(new Date().toLocaleTimeString('en-US', TIME_FORMAT));
        read();
        const timer = setInterval(read, 1000 * 20);
        return () => clearInterval(timer);
    }, []);

    return value;
}

// Single-line clock, e.g. "6:24 PM" (Windows Phone status bar).
export const ShellClock = React.memo(function ShellClock({ className }) {
    const time = useClockString();
    return <span className={className}>{time}</span>;
});

// Time and meridiem stacked on two lines (Surface taskbar tray).
export const ShellClockStacked = React.memo(function ShellClockStacked({ className }) {
    const time = useClockString();
    const [clock, meridiem] = time.split(' ');
    return (
        <div className={className}>
            <span>{clock}</span>
            <span>{meridiem}</span>
        </div>
    );
});
