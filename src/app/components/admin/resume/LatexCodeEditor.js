"use client";
import React, { forwardRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { StreamLanguage } from '@codemirror/language';
import { stex } from '@codemirror/legacy-modes/mode/stex';

// Thin wrapper around CodeMirror with LaTeX (stex) highlighting and a dark
// theme matching the admin shell. Forwarded ref exposes `.view` for cursor
// insertion from the Insert panel.
const extensions = [StreamLanguage.define(stex)];

const LatexCodeEditor = forwardRef(function LatexCodeEditor({ value, onChange }, ref) {
  return (
    <CodeMirror
      ref={ref}
      value={value}
      height="100%"
      theme="dark"
      extensions={extensions}
      onChange={onChange}
      basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true, autocompletion: false }}
      style={{ height: '100%', fontSize: 13 }}
    />
  );
});

export default LatexCodeEditor;
