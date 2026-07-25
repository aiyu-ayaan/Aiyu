"use client";
import React from 'react';

// Hand-rolled SVG recreations of the familiar Windows app icons so /desktop
// reads like the real thing instead of generic line icons. Size comes from the
// passed className (e.g. `h-8 w-8`); colors are baked into each mark.

// Windows 11 File Explorer — manila folder with the blue front band.
export function ExplorerIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M5 11h12l4 4h19a3 3 0 0 1 3 3v3H2v-7a3 3 0 0 1 3-3z" fill="#E0A72E" />
            <path d="M2 19h44v18a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3z" fill="#FBC64D" />
            <path d="M2 32h44v5a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3z" fill="#2E7CD6" />
            <path d="M2 19h44v3H2z" fill="#FFD873" />
        </svg>
    );
}

// Visual Studio Code — official ribbon silhouette (single-color blue).
export function VSCodeIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path
                fill="#22A7F0"
                d="M23.15 2.587 18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352zm-5.146 14.861L10.826 12l7.178-5.448z"
            />
        </svg>
    );
}

// Google Chrome — three color wedges, white ring, blue hub.
export function ChromeIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="24" cy="24" r="22" fill="#fff" />
            <path d="M24 24 L24 2 A22 22 0 0 1 43.05 35 Z" fill="#EA4335" />
            <path d="M24 24 L43.05 35 A22 22 0 0 1 4.95 35 Z" fill="#34A853" />
            <path d="M24 24 L4.95 35 A22 22 0 0 1 24 2 Z" fill="#FBBC05" />
            <circle cx="24" cy="24" r="9" fill="#fff" />
            <circle cx="24" cy="24" r="7" fill="#4285F4" />
        </svg>
    );
}

// Windows 11 Settings — gray gear.
export function SettingsIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path
                fill="#6E7175"
                d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87a.49.49 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61zM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2z"
            />
        </svg>
    );
}

// This PC — blue monitor with a stand.
export function ThisPCIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="5" y="9" width="38" height="26" rx="2.5" fill="#3B7FCB" />
            <rect x="8.5" y="12.5" width="31" height="19" rx="1" fill="#DCEBFB" />
            <rect x="20" y="35" width="8" height="4" fill="#3B7FCB" />
            <rect x="14" y="39" width="20" height="3" rx="1.5" fill="#2E6BB0" />
        </svg>
    );
}

// Microsoft Edge style swirl for the "Portfolio" shortcut / generic web.
export function EdgeIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="24" cy="24" r="22" fill="#1B73E8" />
            <path d="M6 26c1-9 9-16 18-16 6 0 11 3 13 8-4-3-9-3-13-1-6 3-9 9-9 15 0 3 1 5 3 7-7-2-13-8-12-13z" fill="#35C1F1" />
            <path d="M40 30c-2 6-8 10-15 10-4 0-8-2-10-5 4 2 9 2 13-1 3-2 5-5 5-8 0-2-1-4-3-5 5 0 11 4 10 9z" fill="#66EB6E" opacity="0.9" />
        </svg>
    );
}

// Windows Photos — colorful photo tile with a mountain + sun.
export function PhotosIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="4" y="7" width="40" height="34" rx="5" fill="#F5F6FA" />
            <rect x="4" y="7" width="40" height="34" rx="5" fill="url(#ph_g)" fillOpacity="0.12" />
            <path d="M8 34l9-11 7 8 5-6 11 13H8z" fill="#37B24D" />
            <path d="M24 39l6-8 11 10a2 2 0 0 1-1.7 1H24z" fill="#2F9E44" />
            <circle cx="33" cy="16" r="4.5" fill="#FFD43B" />
            <rect x="4" y="7" width="40" height="34" rx="5" stroke="#C7CAD1" strokeWidth="1.2" />
            <defs>
                <linearGradient id="ph_g" x1="4" y1="7" x2="44" y2="41" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#4da3ff" />
                    <stop offset="1" stopColor="#8b5cf6" />
                </linearGradient>
            </defs>
        </svg>
    );
}

// GitHub — the Octocat mark (single dark fill, inverts on dark surfaces via currentColor fallback baked to #24292f).
export function GitHubIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path
                fill="#1B1F23"
                className="dark:fill-white"
                d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 .1.8 1.7 2.6 1.2.1-.7.4-1.2.7-1.5-2.6-.3-5.3-1.3-5.3-5.8 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17 4.6 18 4.9 18 4.9c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.5-2.7 5.5-5.3 5.8.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5z"
            />
        </svg>
    );
}

// The Windows 11 Start flag — four blue tiles.
export function StartIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="2" y="2" width="9" height="9" rx="1" fill="#0F8BE9" />
            <rect x="13" y="2" width="9" height="9" rx="1" fill="#28A8EA" />
            <rect x="2" y="13" width="9" height="9" rx="1" fill="#0F8BE9" />
            <rect x="13" y="13" width="9" height="9" rx="1" fill="#28A8EA" />
        </svg>
    );
}

// Mail — blue envelope icon.
export function MailIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="4" y="10" width="40" height="28" rx="4" fill="#0078D4" />
            <path d="M4 12l20 14L44 12" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

// Notepad — cyan notebook icon.
export function NotepadIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="8" y="6" width="32" height="36" rx="4" fill="#2088B6" />
            <path d="M8 14h32v28H8z" fill="#FFFFFF" opacity="0.9" />
            <rect x="14" y="20" width="20" height="2.5" rx="1" fill="#0078D4" />
            <rect x="14" y="26" width="16" height="2.5" rx="1" fill="#0078D4" />
            <rect x="14" y="32" width="12" height="2.5" rx="1" fill="#0078D4" />
        </svg>
    );
}

// Calculator — classic Win11 blue calculator.
export function CalculatorIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="8" y="5" width="32" height="38" rx="5" fill="#505050" />
            <rect x="12" y="9" width="24" height="9" rx="2" fill="#8CE0FF" />
            <circle cx="16" cy="24" r="3" fill="#D2D2D2" />
            <circle cx="24" cy="24" r="3" fill="#D2D2D2" />
            <circle cx="32" cy="24" r="3" fill="#0078D4" />
            <circle cx="16" cy="32" r="3" fill="#D2D2D2" />
            <circle cx="24" cy="32" r="3" fill="#D2D2D2" />
            <circle cx="32" cy="32" r="3" fill="#0078D4" />
            <circle cx="16" cy="38" r="2.5" fill="#D2D2D2" />
            <circle cx="24" cy="38" r="2.5" fill="#D2D2D2" />
            <circle cx="32" cy="38" r="2.5" fill="#0078D4" />
        </svg>
    );
}

// LinkedIn — blue badge with 'in' mark.
export function LinkedInIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="4" y="4" width="40" height="40" rx="8" fill="#0A66C2" />
            <path d="M14 19h5v16h-5V19zM16.5 11.5a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM23 19h4.8v2.3h.1c.7-1.3 2.4-2.7 4.9-2.7 5.2 0 6.2 3.4 6.2 7.9V35h-5v-7.6c0-1.8 0-4.1-2.5-4.1-2.5 0-2.9 2-2.9 4V35h-5V19z" fill="#FFF" />
        </svg>
    );
}

// Instagram — colorful gradient camera tile.
export function InstagramIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="4" y="4" width="40" height="40" rx="10" fill="url(#ig_g)" />
            <rect x="13" y="13" width="22" height="22" rx="6" stroke="#FFF" strokeWidth="2.5" />
            <circle cx="24" cy="24" r="5.5" stroke="#FFF" strokeWidth="2.5" />
            <circle cx="30.5" cy="17.5" r="1.5" fill="#FFF" />
            <defs>
                <linearGradient id="ig_g" x1="4" y1="40" x2="40" y2="4" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FEE440" />
                    <stop offset="0.3" stopColor="#FA709A" />
                    <stop offset="0.65" stopColor="#962FBF" />
                    <stop offset="1" stopColor="#4E54C8" />
                </linearGradient>
            </defs>
        </svg>
    );
}


// Terminal — dark window with prompt.
export function TerminalIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="4" y="8" width="40" height="32" rx="4" fill="#1E1E1E" stroke="#444" strokeWidth="1.5" />
            <path d="M12 18l6 5-6 5" stroke="#4EC9B0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="22" y1="28" x2="32" y2="28" stroke="#DCDCDC" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
    );
}

// Get Started — compass star badge.
export function GetStartedIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="24" cy="24" r="21" fill="#0078D4" />
            <path d="M24 10l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" fill="#FFF" />
        </svg>
    );
}

// Task Manager — pulse gauge.
export function TaskManagerIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="4" y="8" width="40" height="32" rx="4" fill="#2B2D30" />
            <path d="M8 26h8l4-10 6 18 5-12 4 4h9" stroke="#0078D4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

// Coffee — yellow cup.
export function CoffeeIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="4" y="4" width="40" height="40" rx="8" fill="#FFDD00" />
            <path d="M14 18h16v12a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6V18z" fill="#000" />
            <path d="M30 20h4a4 4 0 0 1 0 8h-4v-8z" fill="#000" />
        </svg>
    );
}

// Unescape — arcade gamepad.
export function UnescapeIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="4" y="10" width="40" height="28" rx="8" fill="#6C5CE7" />
            <circle cx="16" cy="24" r="3" fill="#FFF" />
            <circle cx="32" cy="21" r="2.5" fill="#FF7675" />
            <circle cx="36" cy="27" r="2.5" fill="#74B9FF" />
        </svg>
    );
}

// Whiteboard — blue board with pen.
export function WhiteboardIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="6" y="8" width="36" height="28" rx="3" fill="#0078D4" />
            <path d="M12 24l12-10 12 10" stroke="#FFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

// Windows 11 Widgets icon (blue/white split card icon)
export function WidgetsIcon({ className }) {
    return (
        <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="2" y="2" width="28" height="28" rx="5" fill="#2563EB" />
            <rect x="5" y="5" width="10" height="22" rx="2" fill="#FFFFFF" />
            <rect x="17" y="5" width="10" height="10" rx="2" fill="#60A5FA" />
            <rect x="17" y="17" width="10" height="10" rx="2" fill="#93C5FD" />
        </svg>
    );
}

