"use client";
import React, { useEffect, useState } from 'react';
import { Cpu, Globe, ExternalLink } from 'lucide-react';
import { useDeviceName } from '../useDeviceName';
import { APP_VERSION } from '@/lib/version';

// A playful "About" pane styled after Windows System > About.
export default function AboutThisPC({ config = {} }) {
    const [ua, setUa] = useState('');
    const [cores, setCores] = useState('—');
    const [screen, setScreen] = useState('');

    const [deviceName] = useDeviceName(config);
    const osVersion = config?.desktopOsVersion || config?.osVersion || APP_VERSION;

    useEffect(() => {
        setUa(navigator.userAgent);
        setCores(String(navigator.hardwareConcurrency || '—'));
        setScreen(`${window.screen.width} × ${window.screen.height}`);
    }, []);

    const rows = [
        ['Device name', deviceName],
        ['Processor', `Web Runtime · ${cores} logical cores`],
        ['Installed RAM', 'Streamed from the cloud'],
        ['Display', screen || '—'],
        ['Edition', 'Aiyu OS 11 Pro (Portfolio Edition)'],
        ['Version', (
            <a
                key="version-link"
                href="https://github.com/aiyu-ayaan/Aiyu/blob/master/package.json"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                title="Linked to package.json version"
            >
                <span>{osVersion}</span>
                <ExternalLink className="h-3 w-3" />
            </a>
        )],
        ['Rendered by', 'Next.js + React'],
    ];

    return (
        <div className="h-full w-full overflow-y-auto bg-[#f3f3f3] p-6 text-neutral-800 dark:bg-[#202020] dark:text-neutral-100">
            <div className="mb-6 flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                    <Cpu className="h-7 w-7" />
                </div>
                <div>
                    <h2 className="text-xl font-semibold">About</h2>
                    <p className="text-sm opacity-60">Aiyu OS — a Windows 11 tribute built into the portfolio</p>
                </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-black/10 bg-white dark:border-white/10 dark:bg-white/5">
                {rows.map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between border-b border-black/5 px-4 py-2.5 text-sm last:border-0 dark:border-white/5">
                        <span className="opacity-60">{k}</span>
                        <span className="text-right font-medium">{v}</span>
                    </div>
                ))}
            </div>

            <div className="mt-6 rounded-lg border border-black/10 bg-white p-4 text-xs dark:border-white/10 dark:bg-white/5">
                <div className="mb-1 flex items-center gap-1.5 font-medium">
                    <Globe className="h-3.5 w-3.5" /> User agent
                </div>
                <code className="break-all opacity-60">{ua}</code>
            </div>
        </div>
    );
}
