/**
 * CodeMirror 6 language setup for the Resume Studio LaTeX editor:
 * stex syntax highlighting plus a completion source covering common LaTeX
 * commands, environments, and the resume template's custom macros.
 */
import { StreamLanguage } from '@codemirror/language';
import { stex } from '@codemirror/legacy-modes/mode/stex';
import { snippetCompletion } from '@codemirror/autocomplete';

export const latexLanguage = StreamLanguage.define(stex);

const cmd = (label, detail, snippet) =>
    snippetCompletion(snippet || `\\${label}`, { label: `\\${label}`, detail, type: 'keyword' });

const env = (name, body = '\t${}') =>
    snippetCompletion(`\\begin{${name}}\n${body}\n\\end{${name}}`, {
        label: `\\begin{${name}}`,
        detail: 'environment',
        type: 'class',
    });

const COMPLETIONS = [
    // Structure
    cmd('section', 'section heading', '\\section{${title}}'),
    cmd('subsection', 'subsection heading', '\\subsection{${title}}'),
    cmd('documentclass', 'document class', '\\documentclass[${11pt}]{${article}}'),
    cmd('usepackage', 'load package', '\\usepackage{${package}}'),
    cmd('input', 'include file', '\\input{${file}}'),
    cmd('newcommand', 'define macro', '\\newcommand{\\${name}}[${1}]{${body}}'),
    cmd('renewcommand', 'redefine macro', '\\renewcommand{\\${name}}{${body}}'),
    // Text formatting
    cmd('textbf', 'bold text', '\\textbf{${text}}'),
    cmd('textit', 'italic text', '\\textit{${text}}'),
    cmd('emph', 'emphasized text', '\\emph{${text}}'),
    cmd('underline', 'underlined text', '\\underline{${text}}'),
    cmd('texttt', 'monospace text', '\\texttt{${text}}'),
    cmd('scshape', 'small caps shape'),
    cmd('small', 'small font size'),
    cmd('large', 'large font size'),
    cmd('Huge', 'huge font size'),
    cmd('href', 'hyperlink', '\\href{${url}}{${text}}'),
    cmd('url', 'plain url', '\\url{${url}}'),
    cmd('item', 'list item', '\\item ${}'),
    cmd('vspace', 'vertical space', '\\vspace{${-4pt}}'),
    cmd('hspace', 'horizontal space', '\\hspace{${1em}}'),
    cmd('hfill', 'horizontal fill'),
    cmd('newpage', 'page break'),
    cmd('textcolor', 'colored text', '\\textcolor{${color}}{${text}}'),
    cmd('definecolor', 'define color', '\\definecolor{${name}}{HTML}{${222222}}'),
    // Environments
    env('itemize', '\t\\item ${}'),
    env('enumerate', '\t\\item ${}'),
    env('center', '\t${}'),
    env('tabular', '\t${}'),
    env('document'),
    // Resume template macros (Jake's style)
    cmd('resumeItem', 'bullet point', '\\resumeItem{${achievement}}'),
    cmd(
        'resumeSubheading',
        'role / company block',
        '\\resumeSubheading\n  {${Role}}{${Dates}}\n  {${Company}}{${Location}}'
    ),
    cmd(
        'resumeProjectHeading',
        'project block',
        '\\resumeProjectHeading\n  {\\textbf{${Name}} $|$ \\emph{${Tech}}}{${Year}}'
    ),
    cmd('resumeSubHeadingListStart', 'open section list'),
    cmd('resumeSubHeadingListEnd', 'close section list'),
    cmd('resumeItemListStart', 'open bullet list'),
    cmd('resumeItemListEnd', 'close bullet list'),
];

/** Completion source: fires on a backslash-prefixed word. */
export function latexCompletionSource(context) {
    const word = context.matchBefore(/\\[a-zA-Z]*/);
    if (!word || (word.from === word.to && !context.explicit)) return null;
    return {
        from: word.from,
        options: COMPLETIONS,
        validFor: /^\\[a-zA-Z]*$/,
    };
}
