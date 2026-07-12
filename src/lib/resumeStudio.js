/**
 * Resume Studio — shared helpers for the /admin/resume LaTeX editor.
 *
 * Everything here is isomorphic (no server-only imports) so the editor page,
 * the admin API routes, and the AI prompt builders can all share one source of
 * truth for templates, theme presets, and portfolio-item → LaTeX conversion.
 *
 * Theme presets work by rewriting a marked region of the document:
 *   % ==== RESUME-THEME:BEGIN (<id>) ====
 *   ...color/font definitions...
 *   % ==== RESUME-THEME:END ====
 * so switching a theme never touches the user's content.
 */

import { AYAAN_BASE_TEMPLATE } from './resumeBaseTemplate';

export const THEME_BEGIN_RE = /^%\s*====\s*RESUME-THEME:BEGIN.*$/m;
export const THEME_END_RE = /^%\s*====\s*RESUME-THEME:END\s*====.*$/m;

const themeBlock = (id, body) =>
    `% ==== RESUME-THEME:BEGIN (${id}) ====\n${body.trim()}\n% ==== RESUME-THEME:END ====`;

export const THEME_PRESETS = [
    {
        id: 'classic-black',
        name: 'Classic Black',
        description: 'Traditional black & white, maximum ATS safety.',
        swatch: ['#111111', '#444444'],
        body: `
\\usepackage{xcolor}
\\definecolor{ResumeAccent}{HTML}{111111}
\\definecolor{ResumeHeading}{HTML}{111111}
\\definecolor{ResumeSubtle}{HTML}{444444}
\\hypersetup{colorlinks=true, urlcolor=ResumeAccent, linkcolor=ResumeAccent}`,
    },
    {
        id: 'deep-ocean',
        name: 'Deep Ocean',
        description: 'Navy headings with steel-blue accents.',
        swatch: ['#0b3954', '#1876a8'],
        body: `
\\usepackage{xcolor}
\\definecolor{ResumeAccent}{HTML}{1876A8}
\\definecolor{ResumeHeading}{HTML}{0B3954}
\\definecolor{ResumeSubtle}{HTML}{45607A}
\\hypersetup{colorlinks=true, urlcolor=ResumeAccent, linkcolor=ResumeAccent}`,
    },
    {
        id: 'forest-ink',
        name: 'Forest Ink',
        description: 'Dark green headings, calm and readable.',
        swatch: ['#1b4332', '#2d6a4f'],
        body: `
\\usepackage{xcolor}
\\definecolor{ResumeAccent}{HTML}{2D6A4F}
\\definecolor{ResumeHeading}{HTML}{1B4332}
\\definecolor{ResumeSubtle}{HTML}{52796F}
\\hypersetup{colorlinks=true, urlcolor=ResumeAccent, linkcolor=ResumeAccent}`,
    },
    {
        id: 'royal-plum',
        name: 'Royal Plum',
        description: 'Deep purple headings with violet links.',
        swatch: ['#3c096c', '#7b2cbf'],
        body: `
\\usepackage{xcolor}
\\definecolor{ResumeAccent}{HTML}{7B2CBF}
\\definecolor{ResumeHeading}{HTML}{3C096C}
\\definecolor{ResumeSubtle}{HTML}{6D5A7E}
\\hypersetup{colorlinks=true, urlcolor=ResumeAccent, linkcolor=ResumeAccent}`,
    },
    {
        id: 'crimson-line',
        name: 'Crimson Line',
        description: 'Charcoal text with crimson accents.',
        swatch: ['#22223b', '#c1121f'],
        body: `
\\usepackage{xcolor}
\\definecolor{ResumeAccent}{HTML}{C1121F}
\\definecolor{ResumeHeading}{HTML}{22223B}
\\definecolor{ResumeSubtle}{HTML}{4A4E69}
\\hypersetup{colorlinks=true, urlcolor=ResumeAccent, linkcolor=ResumeAccent}`,
    },
];

/**
 * Swap (or inject) the theme block of a LaTeX document.
 * If no markers exist yet, the block is inserted right before \begin{document}.
 */
export function applyThemePreset(latex, presetId) {
    const preset = THEME_PRESETS.find((p) => p.id === presetId);
    if (!preset || !latex) return latex;
    const block = themeBlock(preset.id, preset.body);

    const begin = latex.match(THEME_BEGIN_RE);
    const end = latex.match(THEME_END_RE);
    if (begin && end && end.index > begin.index) {
        return (
            latex.slice(0, begin.index) +
            block +
            latex.slice(end.index + end[0].length)
        );
    }

    const docStart = latex.indexOf('\\begin{document}');
    if (docStart === -1) return `${block}\n${latex}`;
    return `${latex.slice(0, docStart)}${block}\n\n${latex.slice(docStart)}`;
}

/** Detect which theme preset a document currently uses (by marker id). */
export function detectThemePreset(latex) {
    const match = latex?.match(/RESUME-THEME:BEGIN \(([\w-]+)\)/);
    return match ? match[1] : null;
}

// ─────────────────────── LaTeX escaping + item blocks ───────────────────────

/** Escape text destined for LaTeX body content. */
export function escapeLatex(text = '') {
    // Single pass so replacement output (e.g. the {} in \textbackslash{})
    // is never re-escaped by a later rule.
    return String(text).replace(/[\\&%$#_{}~^]/g, (ch) => {
        if (ch === '\\') return '\\textbackslash{}';
        if (ch === '~') return '\\textasciitilde{}';
        if (ch === '^') return '\\textasciicircum{}';
        return `\\${ch}`;
    });
}

/** Render one portfolio Project as a resumeProjectHeading block. */
export function projectToLatex(project) {
    const name = escapeLatex(project.name || 'Untitled Project');
    const tech = escapeLatex((project.techStack || []).join(', '));
    const year = escapeLatex(project.year || '');
    const link = project.codeLink
        ? ` $|$ \\href{${project.codeLink}}{\\underline{Code}}`
        : '';
    const description = escapeLatex(project.description || '');
    return [
        `    \\resumeProjectHeading`,
        `      {\\textbf{${name}}${link} $|$ \\emph{${tech}}}{${year}}`,
        `      \\resumeItemListStart`,
        `        \\resumeItem{${description}}`,
        `      \\resumeItemListEnd`,
    ].join('\n');
}

/** Render one Deployment (live app) as a resumeProjectHeading block. */
export function deploymentToLatex(deployment) {
    const name = escapeLatex(deployment.name || 'Untitled App');
    const tech = escapeLatex((deployment.techStack || []).join(', '));
    const status = escapeLatex(deployment.status || 'Live');
    const link = deployment.hostedUrl
        ? ` $|$ \\href{${deployment.hostedUrl}}{\\underline{Live}}`
        : '';
    const description = escapeLatex(deployment.description || '');
    return [
        `    \\resumeProjectHeading`,
        `      {\\textbf{${name}}${link} $|$ \\emph{${tech}}}{${status}}`,
        `      \\resumeItemListStart`,
        `        \\resumeItem{${description}}`,
        `      \\resumeItemListEnd`,
    ].join('\n');
}

/** Render an About-page experience entry as a resumeSubheading block. */
export function experienceToLatex(exp) {
    const role = escapeLatex(exp.role || exp.title || 'Role');
    const company = escapeLatex(exp.company || exp.organization || '');
    const period = escapeLatex(exp.period || exp.duration || exp.year || '');
    const location = escapeLatex(exp.location || '');
    const details = Array.isArray(exp.points) && exp.points.length
        ? exp.points
        : [exp.description || ''];
    const items = details
        .filter(Boolean)
        .map((point) => `        \\resumeItem{${escapeLatex(point)}}`)
        .join('\n');
    return [
        `    \\resumeSubheading`,
        `      {${role}}{${period}}`,
        `      {${company}}{${location}}`,
        `      \\resumeItemListStart`,
        items || `        \\resumeItem{}`,
        `      \\resumeItemListEnd`,
    ].join('\n');
}

/** Render an About-page education entry as a resumeSubheading block. */
export function educationToLatex(edu) {
    const degree = escapeLatex(edu.degree || 'Degree');
    const institution = escapeLatex(edu.institution || edu.school || '');
    const duration = escapeLatex(edu.duration || edu.year || '');
    const cgpa = edu.cgpa ? `CGPA: ${escapeLatex(edu.cgpa)}` : '';
    return [
        `    \\resumeSubheading`,
        `      {${institution}}{${duration}}`,
        `      {${degree}}{${cgpa}}`,
    ].join('\n');
}

/** Render a skills map ({category: [items]}) as a tabbed skills block. */
export function skillsToLatex(groups) {
    const lines = Object.entries(groups || {})
        .filter(([, items]) => (items || []).length)
        .map(
            ([category, items]) =>
                `     \\textbf{${escapeLatex(category)}}{: ${escapeLatex(items.join(', '))}} \\\\`
        );
    return [
        ` \\begin{itemize}[leftmargin=0.15in, label={}]`,
        `    \\small{\\item{`,
        ...lines,
        `    }}`,
        ` \\end{itemize}`,
    ].join('\n');
}

// ───────────────────────────── Starter templates ─────────────────────────────

const JAKE_PREAMBLE = `%-------------------------
% Resume in LaTeX (Jake's Resume style)
% Compile with pdflatex
%-------------------------
\\documentclass[letterpaper,11pt]{article}

\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\input{glyphtounicode}

${themeBlock('classic-black', THEME_PRESETS[0].body)}

\\pagestyle{fancy}
\\fancyhf{}
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1in}
\\addtolength{\\topmargin}{-.5in}
\\addtolength{\\textheight}{1.0in}

\\urlstyle{same}
\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

% Section formatting
\\titleformat{\\section}{
  \\vspace{-4pt}\\scshape\\raggedright\\large\\color{ResumeHeading}
}{}{0em}{}[\\color{ResumeAccent}\\titlerule \\vspace{-5pt}]

% PDF is machine readable/ATS parsable
\\pdfgentounicode=1

%-------------------------
% Custom commands
\\newcommand{\\resumeItem}[1]{
  \\item\\small{
    {#1 \\vspace{-2pt}}
  }
}

\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-2pt}\\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeProjectHeading}[2]{
    \\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\small#1 & #2 \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeSubItem}[1]{\\resumeItem{#1}\\vspace{-4pt}}
\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}

\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}`;

const JAKE_BODY = `\\begin{document}

%----------HEADING----------
\\begin{center}
    \\textbf{\\Huge \\scshape Your Name} \\\\ \\vspace{1pt}
    \\small +1 234 567 8900 $|$ \\href{mailto:you@example.com}{\\underline{you@example.com}} $|$
    \\href{https://linkedin.com/in/you}{\\underline{linkedin.com/in/you}} $|$
    \\href{https://github.com/you}{\\underline{github.com/you}}
\\end{center}

%-----------EDUCATION-----------
\\section{Education}
  \\resumeSubHeadingListStart
    \\resumeSubheading
      {Your University}{City, Country}
      {B.Tech in Computer Science}{2020 -- 2024}
  \\resumeSubHeadingListEnd

%-----------EXPERIENCE-----------
\\section{Experience}
  \\resumeSubHeadingListStart
    \\resumeSubheading
      {Software Engineer}{Jun 2024 -- Present}
      {Company Name}{City, Country}
      \\resumeItemListStart
        \\resumeItem{Describe an achievement with impact and numbers.}
        \\resumeItem{Another achievement using action verbs.}
      \\resumeItemListEnd
  \\resumeSubHeadingListEnd

%-----------PROJECTS-----------
\\section{Projects}
    \\resumeSubHeadingListStart
    % Tip: use the Portfolio panel to insert your hosted projects here.
    \\resumeProjectHeading
          {\\textbf{Sample Project} $|$ \\emph{Next.js, PostgreSQL}}{2025}
          \\resumeItemListStart
            \\resumeItem{What it does and why it matters.}
          \\resumeItemListEnd
    \\resumeSubHeadingListEnd

%-----------TECHNICAL SKILLS-----------
\\section{Technical Skills}
 \\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{
     \\textbf{Languages}{: JavaScript, TypeScript, Python} \\\\
     \\textbf{Frameworks}{: Next.js, React, Node.js} \\\\
     \\textbf{Tools}{: Git, Docker, PostgreSQL} \\\\
    }}
 \\end{itemize}

\\end{document}`;

export const RESUME_TEMPLATES = [
    {
        id: 'ayaan-base',
        name: 'Ayaan Base Resume',
        description: 'Your real resume — the visual editor understands this layout natively.',
        latex: AYAAN_BASE_TEMPLATE,
    },
    {
        id: 'jake-classic',
        name: "Jake's Resume (Classic)",
        description: 'The battle-tested single-column ATS-friendly layout.',
        latex: `${JAKE_PREAMBLE}\n\n${JAKE_BODY}`,
    },
    {
        id: 'blank',
        name: 'Blank Document',
        description: 'A minimal article scaffold — paste your own preamble.',
        latex: [
            '\\documentclass[letterpaper,11pt]{article}',
            '\\usepackage[empty]{fullpage}',
            '\\usepackage[hidelinks]{hyperref}',
            '',
            themeBlock('classic-black', THEME_PRESETS[0].body),
            '',
            '\\begin{document}',
            '',
            '% Paste your existing LaTeX resume here.',
            '',
            '\\end{document}',
            '',
        ].join('\n'),
    },
];

export const DEFAULT_RESUME_LATEX = AYAAN_BASE_TEMPLATE;

export const RESUME_ENGINES = ['pdflatex', 'xelatex', 'lualatex'];

export const MAX_SNAPSHOTS = 15;

/** Default shape of the ResumeStudio singleton `data`. */
export function defaultStudio() {
    return {
        latex: DEFAULT_RESUME_LATEX,
        engine: 'pdflatex',
        templateId: 'ayaan-base',
        snapshots: [], // [{ id, label, latex, createdAt }]
        ideas: [], // [{ id, text, done, createdAt }]
        lastCompiledAt: null,
        lastPublishedAt: null,
    };
}
