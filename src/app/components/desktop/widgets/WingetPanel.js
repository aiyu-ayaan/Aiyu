"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Search, Download, CheckCircle2, Terminal, Play, Package } from 'lucide-react';

const PACKAGES = [
    { id: 'git', name: 'Git for Windows', publisher: 'Git', version: '2.45.2', idName: 'Git.Git', category: 'Dev Tools' },
    { id: 'node', name: 'Node.js LTS', publisher: 'OpenJS Foundation', version: '22.4.0', idName: 'OpenJS.NodeJS.LTS', category: 'Runtime' },
    { id: 'vscode', name: 'Visual Studio Code', publisher: 'Microsoft', version: '1.91.1', idName: 'Microsoft.VisualStudioCode', category: 'IDE' },
    { id: 'next', name: 'Create Next App CLI', publisher: 'Vercel', version: '16.0.0', idName: 'Vercel.NextJS', category: 'Framework' },
    { id: 'prisma', name: 'Prisma CLI', publisher: 'Prisma', version: '6.2.0', idName: 'Prisma.PrismaCLI', category: 'ORM' },
    { id: 'docker', name: 'Docker Desktop', publisher: 'Docker', version: '4.32.0', idName: 'Docker.DockerDesktop', category: 'Containers' },
    { id: 'python', name: 'Python 3.12', publisher: 'Python Software Foundation', version: '3.12.4', idName: 'Python.Python.3.12', category: 'Language' },
];

export default function WingetPanel({ openApp }) {
    const [query, setQuery] = useState('');
    const [logs, setLogs] = useState([
        'Windows Package Manager v1.8.1911',
        'Type a package name or select a recommended package below.',
    ]);
    const [installing, setInstalling] = useState(null);
    const [progress, setProgress] = useState(0);
    const [installed, setInstalled] = useState(['git', 'node']);

    // The panel lives inside the Widgets flyout, which unmounts as soon as the
    // user closes it — mid-install if they want. Without these refs the install
    // interval (and its trailing completion timeout) kept ticking against an
    // unmounted tree for the rest of the session.
    const installTimersRef = useRef({ interval: null, timeout: null });

    useEffect(
        () => () => {
            const timers = installTimersRef.current;
            if (timers.interval) clearInterval(timers.interval);
            if (timers.timeout) clearTimeout(timers.timeout);
        },
        []
    );

    const filtered = PACKAGES.filter(
        (p) =>
            p.name.toLowerCase().includes(query.toLowerCase()) ||
            p.idName.toLowerCase().includes(query.toLowerCase()) ||
            p.category.toLowerCase().includes(query.toLowerCase())
    );

    const handleInstall = (pkg) => {
        if (installing) return;
        setInstalling(pkg.id);
        setProgress(10);
        setLogs((prev) => [
            ...prev,
            `> winget install --id ${pkg.idName} -e`,
            `Found ${pkg.name} [${pkg.idName}] Version ${pkg.version}`,
            `Downloading https://cdn.winget.microsoft.com/packages/${pkg.id}.msi...`,
        ]);

        let p = 10;
        const interval = setInterval(() => {
            p += 25;
            setProgress(Math.min(100, p));
            if (p >= 100) {
                clearInterval(interval);
                installTimersRef.current.interval = null;
                installTimersRef.current.timeout = setTimeout(() => {
                    installTimersRef.current.timeout = null;
                    setInstalling(null);
                    setInstalled((prev) => [...prev, pkg.id]);
                    setLogs((prev) => [
                        ...prev,
                        `[100%] Verification complete hash matches.`,
                        `Successfully installed ${pkg.name}!`,
                    ]);
                }, 400);
            }
        }, 300);
        installTimersRef.current.interval = interval;
    };

    return (
        <div className="flex flex-col gap-3 h-full justify-between">
            {/* Search Input */}
            <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search packages (e.g. winget search git)..."
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-xs text-white placeholder-neutral-400 focus:border-blue-500 focus:outline-none"
                />
            </div>

            {/* Package Cards List */}
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[220px] pr-1">
                {filtered.map((pkg) => {
                    const isInst = installed.includes(pkg.id);
                    const isCurrent = installing === pkg.id;

                    return (
                        <div
                            key={pkg.id}
                            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-2.5 transition-colors hover:bg-white/10"
                        >
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                                    <Package className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-xs font-semibold text-white truncate">{pkg.name}</h4>
                                        <span className="rounded bg-white/10 px-1.5 py-0.2 text-[9px] text-neutral-400">{pkg.version}</span>
                                    </div>
                                    <p className="text-[10px] text-neutral-400 truncate">{pkg.idName}</p>
                                </div>
                            </div>

                            <button
                                onClick={() => handleInstall(pkg)}
                                disabled={isInst || isCurrent}
                                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                                    isInst
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                        : isCurrent
                                        ? 'bg-blue-600 text-white animate-pulse'
                                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow'
                                }`}
                            >
                                {isInst ? (
                                    <>
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        <span>Installed</span>
                                    </>
                                ) : isCurrent ? (
                                    <>
                                        <Download className="h-3.5 w-3.5 animate-bounce" />
                                        <span>{progress}%</span>
                                    </>
                                ) : (
                                    <>
                                        <Download className="h-3.5 w-3.5" />
                                        <span>Install</span>
                                    </>
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Interactive Terminal Output Window */}
            <div className="flex-1 flex flex-col rounded-xl border border-white/10 bg-black/60 p-3 font-mono text-[11px] text-neutral-300 min-h-[160px]">
                <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2 text-neutral-400">
                    <div className="flex items-center gap-1.5">
                        <Terminal className="h-3.5 w-3.5 text-blue-400" />
                        <span className="font-semibold text-white">winget.exe CLI</span>
                    </div>
                    <button
                        onClick={() => openApp && openApp('terminal')}
                        className="flex items-center gap-1 hover:text-white transition-colors text-[10px]"
                    >
                        <span>Full Terminal</span>
                        <Play className="h-3 w-3" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto flex flex-col gap-1 pr-1 font-mono text-[10.5px] max-h-[120px]">
                    {logs.map((line, idx) => (
                        <div key={idx} className={line.startsWith('>') ? 'text-blue-400 font-bold' : line.includes('Successfully') ? 'text-emerald-400 font-bold' : 'text-neutral-300'}>
                            {line}
                        </div>
                    ))}
                </div>

                {installing && (
                    <div className="mt-2 pt-2 border-t border-white/10">
                        <div className="flex justify-between text-[10px] text-neutral-400 mb-1">
                            <span>Downloading & Installing...</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
