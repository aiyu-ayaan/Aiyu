"use client";
import React, { useState, useRef, useCallback } from 'react';
import {
    FaBold, FaItalic, FaStrikethrough, FaLink, FaImage, FaCode, FaFileCode, FaQuoteLeft, FaListUl, FaListOl,
    FaTable, FaMinus, FaUpload, FaXmark, FaSpinner, FaEye, FaPen,
} from 'react-icons/fa6';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import dynamic from 'next/dynamic';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';


// PrismAsyncLight async-loads only the languages used, instead of bundling the
// full ~200-language Prism build into the admin editor chunk.
const SyntaxHighlighter = dynamic(() => import('react-syntax-highlighter/dist/esm/prism-async-light'), { ssr: false });

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
            { text: 'H1', label: 'Heading 1', action: 'h1' },
            { text: 'H2', label: 'Heading 2', action: 'h2' },
            { text: 'H3', label: 'Heading 3', action: 'h3' },
        ]
    },
    {
        label: 'Format',
        items: [
            { icon: FaBold, label: 'Bold', action: 'bold', shortcut: 'Ctrl+B' },
            { icon: FaItalic, label: 'Italic', action: 'italic', shortcut: 'Ctrl+I' },
            { icon: FaStrikethrough, label: 'Strikethrough', action: 'strike' },
        ]
    },
    {
        label: 'Insert',
        items: [
            { icon: FaLink, label: 'Link', action: 'link' },
            { icon: FaImage, label: 'Image', action: 'image' },
            { icon: FaCode, label: 'Inline Code', action: 'code' },
            { icon: FaFileCode, label: 'Code Block', action: 'codeblock' },
        ]
    },
    {
        label: 'Blocks',
        items: [
            { icon: FaQuoteLeft, label: 'Blockquote', action: 'quote' },
            { icon: FaListUl, label: 'Bullet List', action: 'ul' },
            { icon: FaListOl, label: 'Numbered List', action: 'ol' },
            { icon: FaTable, label: 'Table', action: 'table' },
            { icon: FaMinus, label: 'Horizontal Rule', action: 'hr' },
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
        <div className="flex flex-col flex-1 min-h-0 bg-[var(--bg-primary)] rounded-[14px] overflow-hidden border border-[var(--hairline-strong)]">
            {/* Top Bar with Tabs and Formatting Tools */}
            <div className="flex flex-col border-b border-[var(--hairline)] bg-[var(--bg-secondary)]">
                {/* Mode Tabs */}
                <div className="flex items-center px-3 gap-1">
                    <button
                        type="button"
                        onClick={() => setActiveTab('write')}
                        aria-pressed={activeTab === 'write'}
                        className="adm-tab"
                    >
                        <FaPen size={12} />
                        Write
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('preview')}
                        aria-pressed={activeTab === 'preview'}
                        className="adm-tab"
                    >
                        <FaEye size={12} />
                        Preview
                    </button>
                </div>

                {/* Toolbar (only visible in write mode) */}
                {activeTab === 'write' && (
                    <div
                        className="flex flex-wrap items-center gap-0.5 p-2 border-t border-[var(--hairline)]"
                        onKeyDown={handleKeyDown}
                    >
                        {TOOLBAR_GROUPS.map((group, gi) => (
                            <React.Fragment key={gi}>
                                {gi > 0 && (
                                    <div className="w-px h-6 bg-[var(--hairline-strong)] mx-1.5" />
                                )}
                                {group.items.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <button
                                            key={item.action}
                                            type="button"
                                            onClick={() => applyAction(item.action)}
                                            title={item.label + (item.shortcut ? ` (${item.shortcut})` : '')}
                                            aria-label={item.label}
                                            className="adm-icon-btn"
                                        >
                                            {Icon
                                                ? <Icon className="w-3.5 h-3.5" />
                                                : <span aria-hidden="true" className="font-mono text-xs font-bold">{item.text}</span>}
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
                    <div className="absolute inset-0 overflow-y-auto p-4 md:p-8 prose adm-prose max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-img:rounded-xl prose-pre:border prose-pre:border-[var(--hairline)]">
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
                    <div className="adm-overlay">
                        <div role="dialog" aria-modal="true" aria-label="Insert image" className="adm-dialog !max-w-lg p-5">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-base font-semibold text-[var(--text-bright)]">Insert image</h3>
                                <button
                                    type="button"
                                    onClick={closeImagePopup}
                                    className="adm-icon-btn"
                                    aria-label="Close"
                                >
                                    <FaXmark className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Mode Switcher */}
                            <div className="adm-tabs mb-4">
                                <button
                                    type="button"
                                    onClick={() => setImageMode('url')}
                                    aria-pressed={imageMode === 'url'}
                                    className="adm-tab"
                                >
                                    External URL
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setImageMode('upload')}
                                    aria-pressed={imageMode === 'upload'}
                                    className="adm-tab"
                                >
                                    Upload a file
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Common Alt Text */}
                                <div>
                                    <label htmlFor="md-image-alt" className="adm-label mb-1">Alt text</label>
                                    <input
                                        id="md-image-alt"
                                        type="text"
                                        value={imageAlt}
                                        onChange={(e) => setImageAlt(e.target.value)}
                                        placeholder="Describe the image..."
                                        className="adm-input"
                                    />
                                </div>

                                {imageMode === 'url' ? (
                                    <div>
                                        <label htmlFor="md-image-url" className="adm-label mb-1">Image URL</label>
                                        <div className="relative group/input">
                                            <FaImage className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--adm-hint)] group-focus-within/input:text-[var(--accent-cyan)] transition-colors" size={14} />
                                            <input
                                                id="md-image-url"
                                                type="text"
                                                value={imageUrl}
                                                onChange={(e) => setImageUrl(e.target.value)}
                                                placeholder="https://example.com/image.jpg"
                                                className="adm-input !pl-10"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        {!imageUploadFile && !imageUrl ? (
                                            <div
                                                className={`border-2 border-dashed rounded-[10px] p-4 md:p-8 text-center transition-colors cursor-pointer ${dragActive ? 'border-[var(--accent-cyan)] bg-[var(--bg-hover)]' : 'border-[var(--hairline-strong)] hover:bg-[var(--bg-hover)]'
                                                    }`}
                                                onDragEnter={handleDrag}
                                                onDragLeave={handleDrag}
                                                onDragOver={handleDrag}
                                                onDrop={handleDrop}
                                                onClick={() => fileInputRef.current?.click()}
                                                role="button"
                                                tabIndex={0}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        fileInputRef.current?.click();
                                                    }
                                                }}
                                            >
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/*,.heic,.heif"
                                                    onChange={(e) => {
                                                        if (e.target.files?.[0]) handleFileSelection(e.target.files[0]);
                                                    }}
                                                />
                                                <div className="flex flex-col items-center gap-3">
                                                    <FaUpload className="w-5 h-5 text-[var(--adm-hint)]" />
                                                    <div>
                                                        <p className="text-[var(--text-primary)] font-semibold text-sm">Click to upload or drag and drop</p>
                                                        <p className="adm-help mt-1">SVG, PNG, JPG or GIF</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="w-full flex gap-4 p-4 rounded-[10px] border border-[var(--hairline)] items-center">
                                                <div className="w-16 h-16 bg-[var(--bg-hover)] rounded-lg overflow-hidden flex items-center justify-center shrink-0 border border-[var(--hairline)]">
                                                    {imageUploadPreview && <img src={imageUploadPreview} className="w-full h-full object-cover" loading="lazy" decoding="async" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start gap-2 mb-2">
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold text-[var(--text-bright)] truncate">{imageUploadFile ? imageUploadFile.name : 'Uploaded File'}</p>
                                                            {imageUploadFile && <p className="font-mono adm-help">{(imageUploadFile.size / 1024).toFixed(1)} KB</p>}
                                                        </div>
                                                        <button type="button" onClick={() => { setImageUploadFile(null); setImageUploadPreview(null); setImageUrl(''); }} className="adm-icon-btn" aria-label="Remove file">
                                                            <FaXmark className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    {/* If we have a file but no URL yet, show upload button. If URL exists, we are ready to insert */}
                                                    {!imageUrl && imageUploadFile && (
                                                        <button
                                                            type="button"
                                                            onClick={handleUpload}
                                                            disabled={imageUploading}
                                                            className="adm-btn w-full"
                                                        >
                                                            {imageUploading ? <FaSpinner className="w-3 h-3 animate-spin" /> : <FaUpload className="w-3 h-3" />}
                                                            {imageUploading ? 'Uploading...' : 'Upload image'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Preview of URL */}
                                {imageUrl && (
                                    <div className="rounded-[10px] border border-[var(--hairline)] overflow-hidden p-1">
                                        <div className="adm-help p-2 border-b border-[var(--hairline)] mb-1">Preview</div>
                                        <img src={imageUrl} alt={imageAlt || 'preview'} className="max-h-48 w-full object-contain rounded-lg" />
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={closeImagePopup}
                                    className="adm-btn adm-btn-quiet flex-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={insertImage}
                                    disabled={!imageUrl}
                                    className="adm-btn adm-btn-primary flex-1"
                                >
                                    Insert image
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Table Insert Popup */}
            {
                showTablePopup && (
                    <div className="adm-overlay">
                        <div role="dialog" aria-modal="true" aria-label="Insert table" className="adm-dialog !max-w-sm p-5">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-base font-semibold text-[var(--text-bright)]">Insert table</h3>
                                <button
                                    type="button"
                                    onClick={() => setShowTablePopup(false)}
                                    className="adm-icon-btn"
                                    aria-label="Close"
                                >
                                    <FaXmark className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                                <div>
                                    <label htmlFor="md-table-cols" className="adm-label mb-1">Columns</label>
                                    <input
                                        id="md-table-cols"
                                        type="number"
                                        min="1"
                                        max="10"
                                        value={tableCols}
                                        onChange={(e) => setTableCols(parseInt(e.target.value) || 1)}
                                        className="adm-input"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="md-table-rows" className="adm-label mb-1">Data rows</label>
                                    <input
                                        id="md-table-rows"
                                        type="number"
                                        min="1"
                                        max="20"
                                        value={tableRows}
                                        onChange={(e) => setTableRows(parseInt(e.target.value) || 1)}
                                        className="adm-input"
                                    />
                                </div>
                            </div>

                            {/* Table preview grid */}
                            <div className="mb-4 p-3 rounded-[10px] border border-[var(--hairline)] overflow-x-auto">
                                <p className="adm-help mb-2">Preview</p>
                                <table className="w-full font-mono text-xs text-[var(--text-secondary)]">
                                    <thead>
                                        <tr>
                                            {Array.from({ length: Math.min(tableCols, 6) }, (_, i) => (
                                                <th key={i} className="border border-[var(--hairline-strong)] px-2 py-1 text-[var(--text-bright)] font-medium">H{i + 1}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Array.from({ length: Math.min(tableRows, 4) }, (_, r) => (
                                            <tr key={r}>
                                                {Array.from({ length: Math.min(tableCols, 6) }, (_, c) => (
                                                    <td key={c} className="border border-[var(--hairline-strong)] px-2 py-1">Cell</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {(tableRows > 4 || tableCols > 6) && (
                                    <p className="adm-help mt-1">Showing preview of up to 6×4</p>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowTablePopup(false)}
                                    className="adm-btn adm-btn-quiet flex-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={insertTable}
                                    className="adm-btn adm-btn-primary flex-1"
                                >
                                    Insert table
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
