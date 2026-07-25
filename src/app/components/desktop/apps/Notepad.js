"use client";
import React, { useState, useRef } from 'react';
import { FileText, Download, Upload, Trash2, ZoomIn, ZoomOut, WrapText } from 'lucide-react';
import { useDeviceMode } from '../../../context/DeviceModeContext';

export default function Notepad() {
    const { isMobile, isTablet } = useDeviceMode();
    const [content, setContent] = useState('');
    const [fileName, setFileName] = useState('Untitled.txt');
    const [fontSize, setFontSize] = useState(14);
    const [wordWrap, setWordWrap] = useState(true);
    const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);

    const updateCursorPos = () => {
        if (!textareaRef.current) return;
        const textBeforeCursor = textareaRef.current.value.substring(0, textareaRef.current.selectionStart);
        const lines = textBeforeCursor.split('\n');
        const currentLine = lines.length;
        const currentCol = lines[lines.length - 1].length + 1;
        setCursorPos({ line: currentLine, col: currentCol });
    };

    const handleDownload = () => {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName || 'Untitled.txt';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (event) => {
            setContent(event.target?.result || '');
        };
        reader.readAsText(file);
    };

    const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
    const charCount = content.length;

    return (
        <div className="flex h-full w-full flex-col bg-[#1f1f23] text-neutral-200 font-sans text-xs select-none">
            {/* Top Toolbar / Menu Bar */}
            <div className={`flex items-center justify-between border-b border-white/10 bg-[#28282d] py-1.5 shrink-0 select-none ${isMobile ? 'px-1 overflow-x-auto no-scrollbar gap-2' : 'px-3 gap-2'}`}>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 rounded bg-white/5 px-2 py-1 text-[11px] font-medium text-white/90">
                        <FileText className="h-3.5 w-3.5 text-blue-400" />
                        <input
                            type="text"
                            value={fileName}
                            onChange={(e) => setFileName(e.target.value)}
                            className="bg-transparent font-medium text-white outline-none border-b border-transparent hover:border-white/30 focus:border-blue-400 max-w-[140px]"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className={`flex items-center gap-1.5 rounded text-[11px] text-white/80 hover:bg-white/10 transition-colors ${isMobile ? 'px-2 py-2' : 'px-2.5 py-1'}`}
                        title="Open File"
                    >
                        <Upload className="h-3.5 w-3.5" />
                        {!isMobile && <span>Open</span>}
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".txt,.md,.json,.js,.html,.css"
                        className="hidden"
                        onChange={handleFileUpload}
                    />

                    <button
                        onClick={handleDownload}
                        className={`flex items-center gap-1.5 rounded text-[11px] text-white/80 hover:bg-white/10 transition-colors ${isMobile ? 'px-2 py-2' : 'px-2.5 py-1'}`}
                        title="Save / Download File"
                    >
                        <Download className="h-3.5 w-3.5" />
                        {!isMobile && <span>Save</span>}
                    </button>

                    <div className="h-4 w-px bg-white/10 mx-1" />

                    <button
                        onClick={() => setWordWrap((v) => !v)}
                        className={`flex items-center gap-1 rounded py-1 text-[11px] transition-colors ${isMobile ? 'px-2' : 'px-2'} ${
                            wordWrap ? 'bg-blue-600/30 text-blue-400 border border-blue-500/30' : 'text-white/70 hover:bg-white/10'
                        }`}
                        title="Toggle Word Wrap"
                    >
                        <WrapText className="h-3.5 w-3.5" />
                    </button>

                    <button
                        onClick={() => setFontSize((s) => Math.min(28, s + 2))}
                        className={`flex items-center justify-center rounded text-white/70 hover:bg-white/10 transition-colors ${isMobile ? 'p-2' : 'p-1'}`}
                        title="Increase Font Size"
                    >
                        <ZoomIn className="h-3.5 w-3.5" />
                    </button>

                    <button
                        onClick={() => setFontSize((s) => Math.max(10, s - 2))}
                        className={`flex items-center justify-center rounded text-white/70 hover:bg-white/10 transition-colors ${isMobile ? 'p-2' : 'p-1'}`}
                        title="Decrease Font Size"
                    >
                        <ZoomOut className="h-3.5 w-3.5" />
                    </button>

                    <button
                        onClick={() => setContent('')}
                        className={`flex items-center justify-center rounded text-red-400 hover:bg-red-500/20 transition-colors ml-1 ${isMobile ? 'p-2' : 'p-1'}`}
                        title="Clear Text"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            {/* Text Editor Area */}
            <div className="min-h-0 flex-1 p-2 bg-[#1f1f23] overflow-hidden">
                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => {
                        setContent(e.target.value);
                        updateCursorPos();
                    }}
                    onKeyUp={updateCursorPos}
                    onClick={updateCursorPos}
                    placeholder="Type your notes here..."
                    spellCheck={false}
                    className={`h-full w-full resize-none bg-transparent font-mono text-white outline-none selection:bg-blue-500/40 p-2 custom-scrollbar ${
                        wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre overflow-x-auto'
                    }`}
                    style={{ fontSize: `${fontSize}px`, lineHeight: '1.5' }}
                />
            </div>

            {/* Status Bar */}
            <div className={`flex h-6 items-center justify-between border-t border-white/10 bg-[#28282d] text-[10px] text-white/60 shrink-0 select-none ${isMobile ? 'px-1' : 'px-3'}`}>
                <div className={`flex items-center ${isMobile ? 'gap-2' : 'gap-4'}`}>
                    <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
                    <span className={isMobile ? 'hidden' : ''}>{charCount} characters</span>
                    <span>{wordCount} words</span>
                </div>

                <div className={`flex items-center ${isMobile ? 'gap-2' : 'gap-4'}`}>
                    <span>{Math.round((fontSize / 14) * 100)}%</span>
                    <span>Windows (CRLF)</span>
                    <span>UTF-8</span>
                </div>
            </div>
        </div>
    );
}
