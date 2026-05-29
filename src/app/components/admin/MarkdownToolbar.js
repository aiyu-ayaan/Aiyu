"use client";
import React, { useState, useRef, useCallback } from 'react';
import {
    Bold, Italic, Strikethrough, Heading1, Heading2, Heading3,
    Link, ImagePlus, Code, FileCode, Quote, List, ListOrdered,
    Table, Minus, Upload, X, Loader2, ChevronDown, Eye, Edit2, FileText, Image as ImageIcon
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import dynamic from 'next/dynamic';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';


const SyntaxHighlighter = dynamic(() => import('react-syntax-highlighter').then(mod => mod.Prism), { ssr: false });

// Helper: insert text at cursor position in textarea
function insertAtCursor(textarea, before, after = '', placeholder = '') {
    if (!textarea) return null;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    const selected = value.substring(start, end);

    let newText;
    let newCursorPos;

    if (selected && after) {
        // Wrap selection
        newText = value.substring(0, start) + before + selected + after + value.substring(end);
        newCursorPos = start + before.length + selected.length + after.length;
    } else if (selected) {
        // Prefix each line (for lists, headings, quotes)
        const lines = selected.split('\n');
        const prefixed = lines.map(line => before + line).join('\n');
        newText = value.substring(0, start) + prefixed + value.substring(end);
        newCursorPos = start + prefixed.length;
    } else {
        // No selection, insert with placeholder
        newText = value.substring(0, start) + before + placeholder + after + value.substring(end);
        // Select the placeholder text
        newCursorPos = start + before.length;
    }

    return {
        newText,
        newCursorPos,
        selectStart: selected ? newCursorPos : start + before.length,
        selectEnd: selected ? newCursorPos : start + before.length + placeholder.length
    };
}

const TOOLBAR_GROUPS = [
    {
        label: 'Headings',
        items: [
            { icon: Heading1, label: 'Heading 1', action: 'h1' },
            { icon: Heading2, label: 'Heading 2', action: 'h2' },
            { icon: Heading3, label: 'Heading 3', action: 'h3' },
        ]
    },
    {
        label: 'Format',
        items: [
            { icon: Bold, label: 'Bold', action: 'bold', shortcut: 'Ctrl+B' },
            { icon: Italic, label: 'Italic', action: 'italic', shortcut: 'Ctrl+I' },
            { icon: Strikethrough, label: 'Strikethrough', action: 'strike' },
        ]
    },
    {
        label: 'Insert',
        items: [
            { icon: Link, label: 'Link', action: 'link' },
            { icon: ImagePlus, label: 'Image', action: 'image' },
            { icon: Code, label: 'Inline Code', action: 'code' },
            { icon: FileCode, label: 'Code Block', action: 'codeblock' },
        ]
    },
    {
        label: 'Blocks',
        items: [
            { icon: Quote, label: 'Blockquote', action: 'quote' },
            { icon: List, label: 'Bullet List', action: 'ul' },
            { icon: ListOrdered, label: 'Numbered List', action: 'ol' },
            { icon: Table, label: 'Table', action: 'table' },
            { icon: Minus, label: 'Horizontal Rule', action: 'hr' },
        ]
    }
];

// Editor Component
export default function MarkdownToolbar({ textareaRef, value, onChange, showNotification, children }) {
    const [activeTab, setActiveTab] = useState('write'); // 'write' or 'preview'

    // Image Popup States
    const [showImagePopup, setShowImagePopup] = useState(false);
    const [imageMode, setImageMode] = useState('url'); // 'url' or 'upload'
    const [imageUrl, setImageUrl] = useState('');
    const [imageAlt, setImageAlt] = useState('');
    const [imageUploadFile, setImageUploadFile] = useState(null);
    const [imageUploadPreview, setImageUploadPreview] = useState(null);
    const [imageUploading, setImageUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    // Other States
    const [showTablePopup, setShowTablePopup] = useState(false);
    const [tableRows, setTableRows] = useState(3);
    const [tableCols, setTableCols] = useState(3);
    const fileInputRef = useRef(null);

    const applyAction = useCallback((action) => {
        const textarea = textareaRef?.current;
        if (!textarea) return;

        let result = null;

        switch (action) {
            case 'h1':
                result = insertAtCursor(textarea, '# ', '', 'Heading 1');
                break;
            case 'h2':
                result = insertAtCursor(textarea, '## ', '', 'Heading 2');
                break;
            case 'h3':
                result = insertAtCursor(textarea, '### ', '', 'Heading 3');
                break;
            case 'bold':
                result = insertAtCursor(textarea, '**', '**', 'bold text');
                break;
            case 'italic':
                result = insertAtCursor(textarea, '*', '*', 'italic text');
                break;
            case 'strike':
                result = insertAtCursor(textarea, '~~', '~~', 'strikethrough');
                break;
            case 'link':
                result = insertAtCursor(textarea, '[', '](https://)', 'link text');
                break;
            case 'image':
                setShowImagePopup(true);
                return;
            case 'code':
                result = insertAtCursor(textarea, '`', '`', 'code');
                break;
            case 'codeblock':
                result = insertAtCursor(textarea, '\n```\n', '\n```\n', 'code here');
                break;
            case 'quote':
                result = insertAtCursor(textarea, '> ', '', 'quote');
                break;
            case 'ul':
                result = insertAtCursor(textarea, '- ', '', 'list item');
                break;
            case 'ol':
                result = insertAtCursor(textarea, '1. ', '', 'list item');
                break;
            case 'table':
                setShowTablePopup(true);
                return;
            case 'hr':
                result = insertAtCursor(textarea, '\n---\n', '', '');
                break;
            default:
                return;
        }

        if (result) {
            onChange(result.newText);
            // Restore focus and cursor position
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(result.selectStart, result.selectEnd);
            }, 0);
        }
    }, [textareaRef, onChange]);

    const insertImage = useCallback(() => {
        const textarea = textareaRef?.current;
        if (!textarea) return;

        const url = imageUrl.trim();
        const alt = imageAlt.trim() || 'image';

        if (!url) {
            showNotification?.(false, 'Please enter an image URL or upload one');
            return;
        }

        const markdown = `![${alt}](${url})`;
        const start = textarea.selectionStart;
        const newText = value.substring(0, start) + '\n' + markdown + '\n' + value.substring(start);
        onChange(newText);

        // Reset and close
        closeImagePopup();

        setTimeout(() => {
            textarea.focus();
            const pos = start + markdown.length + 2;
            textarea.setSelectionRange(pos, pos);
        }, 0);
    }, [textareaRef, value, onChange, imageUrl, imageAlt, showNotification]);

    const closeImagePopup = () => {
        setShowImagePopup(false);
        setImageUrl('');
        setImageAlt('');
        setImageUploadFile(null);
        setImageUploadPreview(null);
        setImageMode('url');
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelection(e.dataTransfer.files[0]);
        }
    };

    const handleFileSelection = (file) => {
        setImageUploadFile(file);
        const url = URL.createObjectURL(file);
        setImageUploadPreview(url);
    };

    const handleUpload = async () => {
        if (!imageUploadFile) return;
        setImageUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', imageUploadFile);
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                // Determine absolute URL if needed, or relative
                const finalUrl = data.url;
                setImageUrl(finalUrl);
                // Switch to preview/insert mode essentially
                showNotification?.(true, 'Image uploaded! Ready to insert.');
            } else {
                showNotification?.(false, data.error || 'Upload failed');
            }
        } catch (err) {
            showNotification?.(false, 'Upload failed: ' + err.message);
        } finally {
            setImageUploading(false);
        }
    };



    const insertTable = useCallback(() => {
        const textarea = textareaRef?.current;
        if (!textarea) return;
        const rows = Math.max(1, tableRows);
        const cols = Math.max(1, tableCols);

        let md = '\n';
        // Header row
        md += '| ' + Array.from({ length: cols }, (_, i) => `Header ${i + 1}`).join(' | ') + ' |\n';
        // Separator
        md += '| ' + Array.from({ length: cols }, () => '---').join(' | ') + ' |\n';
        // Data rows
        for (let r = 0; r < rows; r++) {
            md += '| ' + Array.from({ length: cols }, () => 'Cell').join(' | ') + ' |\n';
        }
        md += '\n';

        const start = textarea.selectionStart;
        const newText = value.substring(0, start) + md + value.substring(start);
        onChange(newText);
        setShowTablePopup(false);
        setTimeout(() => {
            textarea.focus();
            const pos = start + md.length;
            textarea.setSelectionRange(pos, pos);
        }, 0);
    }, [textareaRef, value, onChange, tableRows, tableCols]);

    // Keyboard shortcuts
    const handleKeyDown = useCallback((e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
            e.preventDefault();
            applyAction('bold');
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
            e.preventDefault();
            applyAction('italic');
        }
    }, [applyAction]);

    return (
        <div className="flex flex-col flex-1 min-h-0 bg-slate-950/50 rounded-xl overflow-hidden border border-white/10">
            {/* Top Bar with Tabs and Formatting Tools */}
            <div className="flex flex-col border-b border-white/10 bg-slate-900/80">
                {/* Mode Tabs */}
                <div className="flex items-center px-4 pt-2 gap-1">
                    <button
                        type="button"
                        onClick={() => setActiveTab('write')}
                        className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-colors ${activeTab === 'write'
                            ? 'bg-slate-800 text-cyan-400 border-t border-x border-white/10'
                            : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <Edit2 size={12} />
                            Write
                        </div>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('preview')}
                        className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-colors ${activeTab === 'preview'
                            ? 'bg-slate-800 text-cyan-400 border-t border-x border-white/10'
                            : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <Eye size={12} />
                            Preview
                        </div>
                    </button>
                </div>

                {/* Toolbar (only visible in write mode) */}
                {activeTab === 'write' && (
                    <div
                        className="flex flex-wrap items-center gap-0.5 p-2 border-t border-white/10"
                        onKeyDown={handleKeyDown}
                    >
                        {TOOLBAR_GROUPS.map((group, gi) => (
                            <React.Fragment key={gi}>
                                {gi > 0 && (
                                    <div className="w-px h-6 bg-white/10 mx-1.5" />
                                )}
                                {group.items.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <button
                                            key={item.action}
                                            type="button"
                                            onClick={() => applyAction(item.action)}
                                            title={item.label + (item.shortcut ? ` (${item.shortcut})` : '')}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all duration-150 group/btn"
                                        >
                                            <Icon className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                                        </button>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="flex-1 relative min-h-[500px]">
                {activeTab === 'write' ? (
                    // In write mode, render the children (textarea)
                    <div className="absolute inset-0">
                        {children}
                    </div>
                ) : (
                    // Preview Mode
                    <div className="absolute inset-0 overflow-y-auto p-4 md:p-8 prose prose-invert max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-cyan-400 prose-img:rounded-xl prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                code({ node, inline, className, children, ...props }) {
                                    const match = /language-(\w+)/.exec(className || '')
                                    return !inline && match ? (
                                        <SyntaxHighlighter
                                            style={vscDarkPlus}
                                            language={match[1]}
                                            PreTag="div"
                                            {...props}
                                        >
                                            {String(children).replace(/\n$/, '')}
                                        </SyntaxHighlighter>
                                    ) : (
                                        <code className={className} {...props}>
                                            {children}
                                        </code>
                                    )
                                }
                            }}
                        >
                            {value || '*Nothing to preview*'}
                        </ReactMarkdown>
                    </div>
                )}
            </div>


            {/* Enhanced Image Insert Popup */}
            {
                showImagePopup && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Insert Image</h3>
                                <button
                                    type="button"
                                    onClick={closeImagePopup}
                                    className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Mode Switcher */}
                            <div className="flex bg-slate-950/50 rounded-lg p-1 border border-white/10 mb-6 w-fit">
                                <button
                                    type="button"
                                    onClick={() => setImageMode('url')}
                                    className={`px-3 py-1 text-[10px] uppercase font-bold rounded transition-colors ${imageMode === 'url' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                                        }`}
                                >
                                    External URL
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setImageMode('upload')}
                                    className={`px-3 py-1 text-[10px] uppercase font-bold rounded transition-colors ${imageMode === 'upload' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                                        }`}
                                >
                                    Local Upload
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Common Alt Text */}
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1 font-mono uppercase">Alt Text Description</label>
                                    <input
                                        type="text"
                                        value={imageAlt}
                                        onChange={(e) => setImageAlt(e.target.value)}
                                        placeholder="Describe the image..."
                                        className="w-full p-3 bg-slate-950/50 rounded-xl border border-white/10 focus:outline-none focus:border-cyan-500/50 text-sm text-slate-200"
                                    />
                                </div>

                                {imageMode === 'url' ? (
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1 font-mono uppercase">Image Source URL</label>
                                        <div className="relative group/input">
                                            <ImageIcon className="absolute left-3 top-3 text-slate-500 group-focus-within/input:text-cyan-400 transition-colors" size={16} />
                                            <input
                                                type="text"
                                                value={imageUrl}
                                                onChange={(e) => setImageUrl(e.target.value)}
                                                placeholder="https://example.com/image.jpg"
                                                className="w-full p-3 pl-10 bg-slate-950/50 rounded-xl border border-white/10 focus:outline-none focus:border-cyan-500/50 text-sm text-slate-200"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        {!imageUploadFile && !imageUrl ? (
                                            <div
                                                className={`border-2 border-dashed rounded-xl p-4 md:p-8 text-center transition-all cursor-pointer group/drop ${dragActive ? 'border-cyan-500 bg-cyan-500/10' : 'border-white/10 hover:border-cyan-500/30 hover:bg-white/[0.02]'
                                                    }`}
                                                onDragEnter={handleDrag}
                                                onDragLeave={handleDrag}
                                                onDragOver={handleDrag}
                                                onDrop={handleDrop}
                                                onClick={() => fileInputRef.current?.click()}
                                            >
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        if (e.target.files?.[0]) handleFileSelection(e.target.files[0]);
                                                    }}
                                                />
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover/drop:scale-110 transition-transform group-hover/drop:bg-cyan-500/10 group-hover/drop:text-cyan-400 text-slate-500">
                                                        <Upload className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-slate-300 font-bold text-sm">Click to upload or drag & drop</p>
                                                        <p className="text-slate-500 text-xs mt-1">SVG, PNG, JPG or GIF</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="w-full flex gap-4 p-4 bg-slate-950/50 rounded-xl border border-white/10 items-center">
                                                <div className="w-16 h-16 bg-white/5 rounded-lg overflow-hidden flex items-center justify-center shrink-0 border border-white/5">
                                                    {imageUploadPreview && <img src={imageUploadPreview} className="w-full h-full object-cover" loading="lazy" decoding="async" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-200 truncate">{imageUploadFile ? imageUploadFile.name : 'Uploaded File'}</p>
                                                            {imageUploadFile && <p className="text-xs font-mono text-slate-500">{(imageUploadFile.size / 1024).toFixed(1)} KB</p>}
                                                        </div>
                                                        <button type="button" onClick={() => { setImageUploadFile(null); setImageUploadPreview(null); setImageUrl(''); }} className="p-1 hover:bg-white/10 rounded text-slate-500 hover:text-white transition-colors">
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    {/* If we have a file but no URL yet, show upload button. If URL exists, we are ready to insert */}
                                                    {!imageUrl && imageUploadFile && (
                                                        <button
                                                            type="button"
                                                            onClick={handleUpload}
                                                            disabled={imageUploading}
                                                            className="w-full py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2"
                                                        >
                                                            {imageUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                                            {imageUploading ? 'Uploading...' : 'Confirm Upload'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Preview of URL */}
                                {imageUrl && (
                                    <div className="rounded-xl border border-white/10 overflow-hidden bg-black/40 p-1">
                                        <div className="text-[10px] uppercase tracking-wider text-slate-500 p-2 border-b border-white/5 mb-1">Preview</div>
                                        <img src={imageUrl} alt={imageAlt || 'preview'} className="max-h-48 w-full object-contain rounded-lg" />
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={closeImagePopup}
                                    className="flex-1 px-4 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-slate-400 text-sm font-bold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={insertImage}
                                    disabled={!imageUrl}
                                    className="flex-1 px-4 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 shadow-[0_0_20px_rgba(8,145,178,0.3)] hover:shadow-[0_0_30px_rgba(8,145,178,0.5)]"
                                >
                                    Insert Image
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Table Insert Popup */}
            {
                showTablePopup && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Insert Table</h3>
                                <button
                                    type="button"
                                    onClick={() => setShowTablePopup(false)}
                                    className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Columns</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="10"
                                        value={tableCols}
                                        onChange={(e) => setTableCols(parseInt(e.target.value) || 1)}
                                        className="w-full p-2.5 bg-slate-950/50 rounded-lg border border-white/10 focus:outline-none focus:border-cyan-500/50 text-sm text-slate-200"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">Data Rows</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="20"
                                        value={tableRows}
                                        onChange={(e) => setTableRows(parseInt(e.target.value) || 1)}
                                        className="w-full p-2.5 bg-slate-950/50 rounded-lg border border-white/10 focus:outline-none focus:border-cyan-500/50 text-sm text-slate-200"
                                    />
                                </div>
                            </div>

                            {/* Table preview grid */}
                            <div className="mb-4 p-3 bg-slate-950/50 rounded-lg border border-white/10 overflow-x-auto">
                                <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Preview</p>
                                <table className="w-full text-xs text-slate-400">
                                    <thead>
                                        <tr>
                                            {Array.from({ length: Math.min(tableCols, 6) }, (_, i) => (
                                                <th key={i} className="border border-white/10 px-2 py-1 text-cyan-400 font-medium">H{i + 1}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Array.from({ length: Math.min(tableRows, 4) }, (_, r) => (
                                            <tr key={r}>
                                                {Array.from({ length: Math.min(tableCols, 6) }, (_, c) => (
                                                    <td key={c} className="border border-white/10 px-2 py-1">Cell</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {(tableRows > 4 || tableCols > 6) && (
                                    <p className="text-[10px] text-slate-500 mt-1">Showing preview of up to 6×4</p>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowTablePopup(false)}
                                    className="flex-1 px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-slate-400 text-sm font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={insertTable}
                                    className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-bold transition-colors shadow-[0_0_15px_rgba(8,145,178,0.3)]"
                                >
                                    Insert Table
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
