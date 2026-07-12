"use client";
/**
 * Controlled-ish CodeMirror 6 LaTeX editor. The document lives inside the
 * view (re-rendering React per keystroke would be too slow); parents interact
 * through the imperative handle: getValue / setValue / insertAtCursor /
 * getSelection / replaceSelection / gotoLine.
 */
import React, { useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, rectangularSelection, highlightSpecialChars } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, indentOnInput, foldGutter, foldKeymap } from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap, autocompletion, completionKeymap } from '@codemirror/autocomplete';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { oneDark } from '@codemirror/theme-one-dark';
import { latexLanguage, latexCompletionSource } from './latexLanguage';

const editorTheme = EditorView.theme({
    '&': { height: '100%', fontSize: '13px' },
    '.cm-scroller': { fontFamily: 'var(--font-geist-mono, ui-monospace, monospace)', overflow: 'auto' },
    '.cm-content': { paddingBottom: '40vh' },
    '&.cm-focused': { outline: 'none' },
});

const LatexEditor = forwardRef(function LatexEditor({ initialDoc, onDocChanged, onSaveShortcut }, ref) {
    const containerRef = useRef(null);
    const viewRef = useRef(null);
    const callbacksRef = useRef({ onDocChanged, onSaveShortcut });
    callbacksRef.current = { onDocChanged, onSaveShortcut };

    useEffect(() => {
        const state = EditorState.create({
            doc: initialDoc,
            extensions: [
                lineNumbers(),
                highlightActiveLineGutter(),
                highlightSpecialChars(),
                history(),
                foldGutter(),
                drawSelection(),
                indentOnInput(),
                bracketMatching(),
                closeBrackets(),
                rectangularSelection(),
                highlightActiveLine(),
                highlightSelectionMatches(),
                autocompletion({ override: [latexCompletionSource] }),
                latexLanguage,
                oneDark,
                editorTheme,
                EditorView.lineWrapping,
                keymap.of([
                    {
                        key: 'Mod-s',
                        preventDefault: true,
                        run: () => {
                            callbacksRef.current.onSaveShortcut?.();
                            return true;
                        },
                    },
                    ...closeBracketsKeymap,
                    ...defaultKeymap,
                    ...historyKeymap,
                    ...searchKeymap,
                    ...foldKeymap,
                    ...completionKeymap,
                    indentWithTab,
                ]),
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) callbacksRef.current.onDocChanged?.();
                }),
            ],
        });

        const view = new EditorView({ state, parent: containerRef.current });
        viewRef.current = view;
        return () => {
            view.destroy();
            viewRef.current = null;
        };
        // The editor owns the document after mount; initialDoc is mount-only.
    }, []);

    useImperativeHandle(ref, () => ({
        getValue: () => viewRef.current?.state.doc.toString() ?? '',
        setValue: (text) => {
            const view = viewRef.current;
            if (!view) return;
            view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
        },
        insertAtCursor: (text) => {
            const view = viewRef.current;
            if (!view) return;
            const { from, to } = view.state.selection.main;
            view.dispatch({
                changes: { from, to, insert: text },
                selection: { anchor: from + text.length },
                scrollIntoView: true,
            });
            view.focus();
        },
        getSelection: () => {
            const view = viewRef.current;
            if (!view) return '';
            const { from, to } = view.state.selection.main;
            return view.state.sliceDoc(from, to);
        },
        replaceSelection: (text) => {
            const view = viewRef.current;
            if (!view) return;
            const { from, to } = view.state.selection.main;
            view.dispatch({
                changes: { from, to, insert: text },
                selection: { anchor: from, head: from + text.length },
                scrollIntoView: true,
            });
        },
        gotoLine: (lineNumber) => {
            const view = viewRef.current;
            if (!view) return;
            const line = view.state.doc.line(Math.max(1, Math.min(lineNumber, view.state.doc.lines)));
            view.dispatch({ selection: { anchor: line.from }, scrollIntoView: true });
            view.focus();
        },
    }), []);

    return <div ref={containerRef} className="h-full min-h-0 overflow-hidden" />;
});

export default LatexEditor;
