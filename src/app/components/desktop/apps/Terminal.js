"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Terminal as TerminalIcon } from 'lucide-react';

const INITIAL_HISTORY = [
    { type: 'output', text: 'Aiyu OS PowerShell [Version 10.0.22631.3007]' },
    { type: 'output', text: '(c) Aiyu Corporation. All rights reserved.' },
    { type: 'output', text: '' },
    { type: 'output', text: 'Type "help" to view available terminal commands.' },
    { type: 'output', text: '' },
];

export default function Terminal({ openApp, config = {} }) {
    const [history, setHistory] = useState(INITIAL_HISTORY);
    const [input, setInput] = useState('');
    const [cmdHistory, setCmdHistory] = useState([]);
    const [historyIdx, setHistoryIdx] = useState(-1);
    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history]);

    const handleCommand = (e) => {
        e.preventDefault();
        const trimmed = input.trim();
        if (!trimmed) return;

        const newHistory = [...history, { type: 'cmd', text: `PS C:\\Users\\Aiyu> ${input}` }];
        const parts = trimmed.split(' ');
        const cmd = parts[0].toLowerCase();
        const arg = parts.slice(1).join(' ');

        setCmdHistory((prev) => [...prev, input]);
        setHistoryIdx(-1);
        setInput('');

        let response;

        switch (cmd) {
            case 'help':
                response = [
                    'Available commands:',
                    '  help               - Display this help message',
                    '  clear / cls        - Clear the terminal screen',
                    '  ls / dir           - List directory contents',
                    '  cat <file>         - Display file contents',
                    '  whoami             - Display current user',
                    '  ver / version      - Display OS version',
                    '  sysinfo            - Display system hardware summary',
                    '  open <app>         - Launch desktop app (e.g. open photos)',
                    '  date               - Display current date and time',
                    '  echo <text>        - Echo text to stdout',
                ];
                break;

            case 'clear':
            case 'cls':
                setHistory([]);
                return;

            case 'ls':
            case 'dir':
                response = [
                    '  Directory: C:\\Users\\Aiyu',
                    '',
                    'Mode          LastWriteTime         Length Name',
                    '----          -------------         ------ ----',
                    'd-----  7/25/2026   00:00 AM                Documents',
                    'd-----  7/25/2026   00:00 AM                Pictures',
                    'd-----  7/25/2026   00:00 AM                Projects',
                    '-a----  7/25/2026   00:00 AM           1024 welcome.txt',
                    '-a----  7/25/2026   00:00 AM           2048 portfolio.config',
                ];
                break;

            case 'cat':
                if (arg === 'welcome.txt') {
                    response = [
                        'Welcome to Aiyu OS Terminal!',
                        'This is an interactive web-based Windows 11 terminal experience.',
                    ];
                } else if (arg === 'portfolio.config') {
                    response = [
                        `Device: ${config.deviceName || 'AIYU-PORTFOLIO'}`,
                        `OS Version: ${config.osVersion || '4.9.2'}`,
                        'Environment: Web Desktop Container',
                    ];
                } else if (!arg) {
                    response = ['Usage: cat <filename>'];
                } else {
                    response = [`cat: ${arg}: No such file or directory`];
                }
                break;

            case 'whoami':
                response = ['aiyu-os\\guest_user'];
                break;

            case 'ver':
            case 'version':
                response = [`Aiyu OS 11 Pro [Version ${config.osVersion || '4.9.2'}]`];
                break;

            case 'sysinfo':
                response = [
                    ' OS Name:                   Aiyu OS 11 Pro',
                    ` OS Version:                ${config.osVersion || '4.9.2'}`,
                    ` Device Name:               ${config.deviceName || 'AIYU-PORTFOLIO'}`,
                    ' System Manufacturer:       Aiyu Web Systems',
                    ' Processor:                 Web Concurrency Engine',
                    ' Total Physical Memory:    8,192 MB',
                ];
                break;

            case 'open':
                if (!arg) {
                    response = ['Usage: open <app_name> (e.g. open photos, open settings, open code)'];
                } else {
                    const target = arg.toLowerCase();
                    if (['photos', 'settings', 'code', 'explorer', 'github', 'browser', 'taskmanager', 'about'].includes(target)) {
                        openApp?.(target);
                        response = [`Launching ${target}...`];
                    } else {
                        response = [`App '${arg}' not found. Try: photos, settings, code, explorer, github, browser, taskmanager`];
                    }
                }
                break;

            case 'date':
                response = [new Date().toString()];
                break;

            case 'echo':
                response = [arg];
                break;

            default:
                response = [
                    `'${cmd}' is not recognized as an internal or external command,`,
                    'operable program or batch file. Type "help" for a list of commands.',
                ];
                break;
        }

        setHistory([
            ...newHistory,
            ...response.map((line) => ({ type: 'output', text: line })),
        ]);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (cmdHistory.length === 0) return;
            const nextIdx = historyIdx < cmdHistory.length - 1 ? historyIdx + 1 : historyIdx;
            setHistoryIdx(nextIdx);
            setInput(cmdHistory[cmdHistory.length - 1 - nextIdx] || '');
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIdx > 0) {
                const nextIdx = historyIdx - 1;
                setHistoryIdx(nextIdx);
                setInput(cmdHistory[cmdHistory.length - 1 - nextIdx] || '');
            } else if (historyIdx === 0) {
                setHistoryIdx(-1);
                setInput('');
            }
        }
    };

    return (
        <div
            className="flex h-full w-full flex-col bg-[#0c0c0c] text-[#cccccc] font-mono text-xs select-text p-3 overflow-hidden"
            onClick={() => inputRef.current?.focus()}
        >
            {/* Terminal Output Stream */}
            <div className="min-h-0 flex-1 overflow-y-auto space-y-1 pr-1">
                {history.map((h, i) => (
                    <div
                        key={i}
                        className={h.type === 'cmd' ? 'text-white font-semibold' : 'text-[#cccccc] whitespace-pre-wrap'}
                    >
                        {h.text}
                    </div>
                ))}

                {/* Active Prompt Row */}
                <form onSubmit={handleCommand} className="flex items-center gap-2 pt-1">
                    <span className="text-cyan-400 font-semibold shrink-0">PS C:\Users\Aiyu&gt;</span>
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-1 bg-transparent text-white outline-none font-mono text-xs caret-blue-400"
                        autoFocus
                        spellCheck={false}
                    />
                </form>
                <div ref={bottomRef} />
            </div>
        </div>
    );
}
