/**
 * Resume Hub — default `main.tex` builder.
 *
 * Produces a clean, single-file Jake-style LaTeX résumé pre-filled from the
 * master `schema`. The preamble defines the macros the Insert panel emits
 * (\resumeItem, \resumeItemListStart/End, \resumeExperience, \resumeProject)
 * so inserted snippets render without extra setup.
 *
 * Packages are intentionally minimal (article + titlesec + enumitem + hyperref)
 * to maximise first-compile success against the SwiftLaTeX package CDN.
 */

import { escapeLatex, experienceSnippet, projectSnippet, dateRange } from './latexSnippets';

const PREAMBLE = String.raw`\documentclass[letterpaper,11pt]{article}

\usepackage[margin=0.6in]{geometry}
\usepackage{titlesec}
\usepackage{enumitem}
\usepackage[hidelinks]{hyperref}
\usepackage[T1]{fontenc}

\pagestyle{empty}
\setlength{\tabcolsep}{0in}

% Section formatting
\titleformat{\section}{\vspace{-4pt}\scshape\raggedright\large}{}{0em}{}[\titlerule \vspace{-5pt}]

% Macros used by the Insert panel
\newcommand{\resumeItem}[1]{\item\small{#1 \vspace{-2pt}}}
\newcommand{\resumeItemListStart}{\begin{itemize}[leftmargin=0.15in, label={$\cdot$}]}
\newcommand{\resumeItemListEnd}{\end{itemize}\vspace{-5pt}}

% \resumeExperience{role}{dates}{company}{location}
\newcommand{\resumeExperience}[4]{%
  \vspace{2pt}\item[]{%
    \textbf{#1} \hfill {\small #2}\\
    \textit{\small #3} \hfill {\small \textit{#4}}%
  }\vspace{-4pt}
}

% \resumeProject{name}{stack}{link}
\newcommand{\resumeProject}[3]{%
  \vspace{2pt}\item[]{%
    \textbf{#1} {\small $|$ \emph{#2}} \hfill {\small #3}%
  }\vspace{-4pt}
}

\newcommand{\resumeHeadingListStart}{\begin{itemize}[leftmargin=0in, label={}]}
\newcommand{\resumeHeadingListEnd}{\end{itemize}}
`;

function headerBlock(basics = {}) {
  const name = escapeLatex(basics.name || '');
  const contacts = [basics.phone, basics.email, basics.location, basics.linkedin, basics.github, basics.website]
    .map((c) => String(c ?? '').trim())
    .filter(Boolean)
    .map(escapeLatex)
    .join(' $|$ ');
  return [
    '\\begin{center}',
    `  {\\Huge \\scshape ${name}} \\\\ \\vspace{4pt}`,
    contacts ? `  \\small ${contacts}` : '',
    '\\end{center}',
  ]
    .filter(Boolean)
    .join('\n');
}

function section(title, body) {
  if (!body || !body.trim()) return '';
  return `\\section{${escapeLatex(title)}}\n${body}\n`;
}

function educationBlock(education = []) {
  if (!education.length) return '';
  const rows = education
    .map((e) => {
      const inst = escapeLatex(e.institution || '');
      const dates = escapeLatex(dateRange(e.start, e.end));
      const degree = escapeLatex([e.degree, e.note].filter(Boolean).join(', '));
      return `  \\item[]{\\textbf{${inst}} \\hfill {\\small ${dates}}\\\\ \\textit{\\small ${degree}}}`;
    })
    .join('\n  \\vspace{2pt}\n');
  return `\\resumeHeadingListStart\n${rows}\n\\resumeHeadingListEnd`;
}

function skillsBlock(skills = []) {
  if (!skills.length) return '';
  const rows = skills
    .map((s) => `  \\item[]{\\textbf{${escapeLatex(s.category || '')}}: ${escapeLatex(s.items || '')}}`)
    .join('\n');
  return `\\resumeHeadingListStart\n${rows}\n\\resumeHeadingListEnd`;
}

function listOf(items, builder) {
  if (!items.length) return '';
  return `\\resumeHeadingListStart\n${items.map(builder).join('\n')}\n\\resumeHeadingListEnd`;
}

/**
 * Build a full `main.tex` string from a master schema. The body follows the
 * canonical order: summary, experience, education, projects, skills, certs.
 */
export function buildDefaultTemplate(schema = {}) {
  const s = schema && typeof schema === 'object' ? schema : {};
  const summary = String(s.summary ?? '').trim();

  const body = [
    headerBlock(s.basics),
    summary ? section('Summary', `\\small ${escapeLatex(summary)}`) : '',
    section('Experience', listOf(Array.isArray(s.experience) ? s.experience : [], experienceSnippet)),
    section('Education', educationBlock(Array.isArray(s.education) ? s.education : [])),
    section('Projects', listOf(Array.isArray(s.projects) ? s.projects : [], projectSnippet)),
    section('Technical Skills', skillsBlock(Array.isArray(s.skills) ? s.skills : [])),
    section(
      'Certifications',
      listOf(Array.isArray(s.certifications) ? s.certifications : [], (c) => `  \\item[]{\\textbf{${escapeLatex(c.name || '')}}}`)
    ),
  ]
    .filter(Boolean)
    .join('\n');

  return `${PREAMBLE}\n\\begin{document}\n\n${body}\n\n\\end{document}\n`;
}
