/**
 * Resume Studio visual mode — two-way bridge between a LaTeX resume document
 * (written with the \resumeSubheading / \resumeProjectHeading / \resumeItem
 * macro family) and a structured model the GUI editor can edit.
 *
 * Design rules:
 *  - The preamble and the header block are preserved verbatim (raw strings).
 *  - Sections we understand become typed models: 'text' (summary paragraph),
 *    'entries' (experience/education subheadings), 'projects', 'skills'.
 *  - Anything we can't confidently parse stays a 'raw' section and is
 *    re-emitted byte-for-byte, so switching modes never destroys content.
 *  - generateResumeLatex(parseResumeLatex(doc)) must re-parse to the same
 *    model (canonical form), so mode toggling is stable.
 */

let idSeq = 0;
const nextId = (prefix) => `${prefix}-${Date.now().toString(36)}-${++idSeq}`;

// ───────────────────────── low-level LaTeX scanning ─────────────────────────

/**
 * Read one brace group starting at src[start] === '{'.
 * Handles nesting and backslash-escaped characters (\{, \}, \\).
 * Returns { content, end } where end is the index just past the closing '}'.
 */
export function readGroup(src, start) {
    if (src[start] !== '{') return null;
    let depth = 0;
    for (let i = start; i < src.length; i++) {
        const ch = src[i];
        if (ch === '\\') { i++; continue; } // skip escaped char
        if (ch === '{') depth++;
        else if (ch === '}') {
            depth--;
            if (depth === 0) return { content: src.slice(start + 1, i), end: i + 1 };
        }
    }
    return null; // unbalanced
}

/** Read `count` consecutive brace groups after position `from` (skipping whitespace/newlines). */
function readArgs(src, from, count) {
    const args = [];
    let i = from;
    for (let k = 0; k < count; k++) {
        while (i < src.length && /\s/.test(src[i])) i++;
        const group = readGroup(src, i);
        if (!group) return null;
        args.push(group.content.trim());
        i = group.end;
    }
    return { args, end: i };
}

/** Find every `\command{...}` occurrence (not followed by a letter) and parse its args. */
function scanCommand(src, command, argCount) {
    const found = [];
    const needle = `\\${command}`;
    let i = 0;
    while ((i = src.indexOf(needle, i)) !== -1) {
        const after = src[i + needle.length];
        if (after && /[a-zA-Z]/.test(after)) { i += needle.length; continue; } // longer command name
        const parsed = readArgs(src, i + needle.length, argCount);
        if (parsed) {
            found.push({ start: i, end: parsed.end, args: parsed.args });
            i = parsed.end;
        } else {
            i += needle.length;
        }
    }
    return found;
}

// ───────────────────────────── section parsing ─────────────────────────────

/** Collect \resumeItem bullets that appear between `from` and `to`. */
function bulletsIn(src) {
    return scanCommand(src, 'resumeItem', 1).map((m) => m.args[0]);
}

function parseEntriesSection(body) {
    const heads = scanCommand(body, 'resumeSubheading', 4);
    if (!heads.length) return null;
    const items = heads.map((head, idx) => {
        const sliceEnd = idx + 1 < heads.length ? heads[idx + 1].start : body.length;
        return {
            id: nextId('entry'),
            title: head.args[0],      // company / institution
            right: head.args[1],      // dates
            subtitle: head.args[2],   // role / degree
            subright: head.args[3],   // location / CGPA
            bullets: bulletsIn(body.slice(head.end, sliceEnd)),
        };
    });
    return { type: 'entries', items };
}

const PROJECT_TITLE_RE = /^\\textbf\{/;

function parseProjectTitle(arg) {
    // Canonical shape: \textbf{Name} $|$ \emph{Tech}
    if (!PROJECT_TITLE_RE.test(arg)) return null;
    const nameGroup = readGroup(arg, arg.indexOf('{'));
    if (!nameGroup) return null;
    const rest = arg.slice(nameGroup.end).trim();
    const emphIdx = rest.indexOf('\\emph');
    if (emphIdx === -1) {
        return rest === '' ? { name: nameGroup.content, tech: '' } : null;
    }
    const techGroup = readGroup(rest, rest.indexOf('{', emphIdx));
    if (!techGroup) return null;
    // Everything between name and \emph must be the separator, else treat as raw.
    const sep = rest.slice(0, emphIdx).trim();
    if (sep !== '$|$' || rest.slice(techGroup.end).trim() !== '') return null;
    return { name: nameGroup.content, tech: techGroup.content };
}

function parseProjectsSection(body) {
    const heads = scanCommand(body, 'resumeProjectHeading', 2);
    if (!heads.length) return null;
    const items = heads.map((head, idx) => {
        const sliceEnd = idx + 1 < heads.length ? heads[idx + 1].start : body.length;
        const parsedTitle = parseProjectTitle(head.args[0]);
        return {
            id: nextId('project'),
            name: parsedTitle ? parsedTitle.name : '',
            tech: parsedTitle ? parsedTitle.tech : '',
            rawTitle: parsedTitle ? '' : head.args[0],
            right: head.args[1],
            bullets: bulletsIn(body.slice(head.end, sliceEnd)),
        };
    });
    return { type: 'projects', items };
}

function parseSkillsSection(body) {
    // Rows shaped like: \textbf{Category}{: item, item} \\
    const rows = [];
    let i = 0;
    while ((i = body.indexOf('\\textbf', i)) !== -1) {
        const category = readGroup(body, body.indexOf('{', i + 7));
        if (!category) break;
        let j = category.end;
        while (j < body.length && /\s/.test(body[j])) j++;
        const value = readGroup(body, j);
        if (!value) { i = category.end; continue; }
        rows.push({
            id: nextId('skill'),
            category: category.content,
            items: value.content.replace(/^:\s*/, ''),
        });
        i = value.end;
    }
    if (!rows.length) return null;
    return { type: 'skills', rows };
}

function parseTextSection(body) {
    // Shape: \begin{itemize}... \small{\item{ TEXT }} ... \end{itemize}
    const smallIdx = body.indexOf('\\small');
    if (smallIdx === -1) return null;
    const outer = readGroup(body, body.indexOf('{', smallIdx));
    if (!outer) return null;
    const itemIdx = outer.content.indexOf('\\item');
    if (itemIdx === -1) return null;
    const inner = readGroup(outer.content, outer.content.indexOf('{', itemIdx));
    if (!inner) return null;
    const text = inner.content.trim();
    // Only claim it if the section is a single paragraph block (no other macros).
    if (inner.content.includes('\\resumeItem') || inner.content.includes('\\textbf{')) return null;
    return { type: 'text', content: text };
}

function classifySection(title, body) {
    const base = { id: nextId('section'), title };
    const projects = body.includes('\\resumeProjectHeading') ? parseProjectsSection(body) : null;
    if (projects) return { ...base, ...projects };
    const entries = body.includes('\\resumeSubheading') ? parseEntriesSection(body) : null;
    if (entries) return { ...base, ...entries };
    const skills = body.includes('\\textbf') ? parseSkillsSection(body) : null;
    if (skills) return { ...base, ...skills };
    const text = parseTextSection(body);
    if (text) return { ...base, ...text };
    return { ...base, type: 'raw', raw: body.trim() };
}

// ───────────────────────────── document parsing ─────────────────────────────

/**
 * Parse a LaTeX resume into { preamble, header, sections[] }.
 * Throws if the document has no \begin{document} / \end{document} frame.
 */
export function parseResumeLatex(latex) {
    const beginTag = '\\begin{document}';
    const endTag = '\\end{document}';
    const beginIdx = latex.indexOf(beginTag);
    const endIdx = latex.lastIndexOf(endTag);
    if (beginIdx === -1 || endIdx === -1 || endIdx < beginIdx) {
        throw new Error('Document must contain \\begin{document} … \\end{document}');
    }

    const preamble = latex.slice(0, beginIdx).replace(/\s+$/, '');
    const body = latex.slice(beginIdx + beginTag.length, endIdx);

    // Split body at \section{...} boundaries.
    const sectionMarks = [];
    let i = 0;
    while ((i = body.indexOf('\\section', i)) !== -1) {
        const after = body[i + 8];
        if (after && /[a-zA-Z*]/.test(after)) { i += 8; continue; }
        const title = readArgs(body, i + 8, 1);
        if (!title) { i += 8; continue; }
        sectionMarks.push({ start: i, contentStart: title.end, title: title.args[0] });
        i = title.end;
    }

    const header = (sectionMarks.length ? body.slice(0, sectionMarks[0].start) : body).trim();

    const sections = sectionMarks.map((mark, idx) => {
        const sliceEnd = idx + 1 < sectionMarks.length ? sectionMarks[idx + 1].start : body.length;
        return classifySection(mark.title, body.slice(mark.contentStart, sliceEnd));
    });

    return { preamble, header, sections };
}

// ──────────────────────────── document generation ────────────────────────────

function generateEntries(section) {
    const blocks = section.items.map((item) => {
        const bullets = item.bullets.length
            ? [
                '    \\resumeItemListStart',
                ...item.bullets.map((b) => `      \\resumeItem{${b}}`),
                '    \\resumeItemListEnd',
            ]
            : [];
        return [
            '  \\resumeSubheading',
            `    {${item.title}}{${item.right}}`,
            `    {${item.subtitle}}{${item.subright}}`,
            ...bullets,
        ].join('\n');
    });
    return ['\\resumeSubHeadingListStart', ...blocks, '\\resumeSubHeadingListEnd'].join('\n');
}

function generateProjects(section) {
    const blocks = section.items.map((item) => {
        const title = item.rawTitle
            || (item.tech ? `\\textbf{${item.name}} $|$ \\emph{${item.tech}}` : `\\textbf{${item.name}}`);
        const bullets = item.bullets.length
            ? [
                '    \\resumeItemListStart',
                ...item.bullets.map((b) => `      \\resumeItem{${b}}`),
                '    \\resumeItemListEnd',
            ]
            : [];
        return [
            '  \\resumeProjectHeading',
            `    {${title}}{${item.right}}`,
            ...bullets,
        ].join('\n');
    });
    return ['\\resumeSubHeadingListStart', ...blocks, '\\resumeSubHeadingListEnd'].join('\n');
}

function generateSkills(section) {
    const rows = section.rows.map((row) => `    \\textbf{${row.category}}{: ${row.items}} \\\\`);
    // Trim the trailing line break of the final row.
    if (rows.length) rows[rows.length - 1] = rows[rows.length - 1].replace(/ \\\\$/, '');
    return [
        '\\begin{itemize}[leftmargin=0.15in, label={}]',
        '  \\small{\\item{',
        ...rows,
        '  }}',
        '\\end{itemize}',
    ].join('\n');
}

function generateText(section) {
    return [
        '\\begin{itemize}[leftmargin=0.15in, label={}]',
        '  \\small{\\item{',
        `    ${section.content}`,
        '  }}',
        '\\end{itemize}',
    ].join('\n');
}

export function generateSectionLatex(section) {
    switch (section.type) {
        case 'entries': return generateEntries(section);
        case 'projects': return generateProjects(section);
        case 'skills': return generateSkills(section);
        case 'text': return generateText(section);
        default: return section.raw || '';
    }
}

/** Serialize a parsed model back into a complete LaTeX document. */
export function generateResumeLatex(model) {
    const parts = [
        model.preamble,
        '',
        '\\begin{document}',
        '',
        model.header,
        '',
        // Every section emits a \section{} boundary — even an empty title — so a
        // section's body is never merged into its neighbour on the next parse
        // (which would let a specialized parser silently drop it).
        ...model.sections.flatMap((section) => [
            `\\section{${section.title}}`,
            generateSectionLatex(section),
            '',
        ]),
        '\\end{document}',
        '',
    ];
    return parts.join('\n');
}

// ─────────────────────────── header parse / generate ───────────────────────

/** Contact link types the header GUI understands, mapped to fontawesome icons. */
export const CONTACT_TYPES = [
    { type: 'phone', icon: '\\faPhone', label: 'Phone' },
    { type: 'email', icon: '\\faEnvelope', label: 'Email' },
    { type: 'linkedin', icon: '\\faLinkedin', label: 'LinkedIn' },
    { type: 'github', icon: '\\faGithub', label: 'GitHub' },
    { type: 'website', icon: '\\faGlobe', label: 'Website' },
    { type: 'location', icon: '\\faLocationDot', label: 'Location' },
    { type: 'link', icon: '\\faLink', label: 'Link' },
];

const iconToType = (icon) =>
    (CONTACT_TYPES.find((c) => c.icon === icon) || { type: 'link' }).type;

/** Split `\faEnvelope\ some label` into its icon command and trailing label. */
function splitIconLabel(s) {
    const m = s.trim().match(/^(\\fa[A-Za-z]+)\\?\s+([\s\S]*)$/);
    if (!m) return { icon: '', label: s.trim() };
    return { icon: m[1], label: m[2].trim() };
}

/** Parse one `~`-separated contact token into { type, icon, label, url }. */
function parseContactToken(tok) {
    if (tok.startsWith('\\href')) {
        const urlG = readGroup(tok, tok.indexOf('{'));
        if (!urlG) return null;
        const labelG = readGroup(tok, tok.indexOf('{', urlG.end));
        if (!labelG) return null;
        const { icon, label } = splitIconLabel(labelG.content);
        return { type: iconToType(icon), icon, label, url: urlG.content.trim() };
    }
    const { icon, label } = splitIconLabel(tok);
    if (!icon) return null;
    return { type: iconToType(icon), icon, label, url: '' };
}

/**
 * Best-effort parse of the standard `\begin{center}` header into structured
 * fields for the GUI. Returns null when the shape isn't recognised so the
 * caller can fall back to a raw textarea and never lose an exotic header.
 * Shape returned: { prefix, suffix, name, lines[], contacts[] }.
 */
export function parseHeader(header) {
    if (!header) return null;
    const beginTag = '\\begin{center}';
    const endTag = '\\end{center}';
    const centerStart = header.indexOf(beginTag);
    const centerEnd = header.indexOf(endTag);
    if (centerStart === -1 || centerEnd === -1 || centerEnd < centerStart) return null;

    const prefix = header.slice(0, centerStart);
    const suffix = header.slice(centerEnd + endTag.length);
    const inner = header.slice(centerStart + beginTag.length, centerEnd);

    // Break on LaTeX line breaks (\\) and drop spacing macros.
    const stripped = inner
        .split(/\\\\/)
        .map((l) => l.replace(/\\vspace\{[^}]*\}/g, '').trim())
        .filter(Boolean);
    if (!stripped.length) return null;

    const nameMatch = stripped[0].match(/\{\\Huge\s+\\scshape\s+([^}]*)\}/);
    if (!nameMatch) return null;
    const name = nameMatch[1].trim();

    const lines = [];
    let contactsLine = null;
    for (let k = 1; k < stripped.length; k++) {
        const l = stripped[k];
        if (/\\href|\\fa[A-Z]/.test(l)) {
            if (contactsLine !== null) return null; // multiple contact lines: bail
            contactsLine = l;
        } else {
            if (contactsLine !== null) return null; // text after contacts: bail
            lines.push(l);
        }
    }

    const contacts = [];
    if (contactsLine) {
        const tokens = contactsLine
            .replace(/\\small/g, '')
            .split('~')
            .map((t) => t.trim())
            .filter(Boolean);
        for (const tok of tokens) {
            const c = parseContactToken(tok);
            if (!c) return null;
            contacts.push(c);
        }
    }

    return { prefix, suffix, name, lines, contacts };
}

/** Serialize structured header fields back into a `\begin{center}` block. */
export function generateHeader(h) {
    const contactStr = (h.contacts || [])
        .map((c) => {
            const inner = c.icon ? `${c.icon}\\ ${c.label}` : c.label;
            return c.url ? `\\href{${c.url}}{${inner}}` : inner;
        })
        .join(' ~\n    ');
    const body = [
        '\\begin{center}',
        `    {\\Huge \\scshape ${h.name}} \\\\ \\vspace{1pt}`,
        ...(h.lines || []).map((l) => `    ${l} \\\\ \\vspace{1pt}`),
        contactStr ? `    \\small ${contactStr}` : '    \\small',
        '    \\vspace{-8pt}',
        '\\end{center}',
    ].join('\n');
    return `${h.prefix || ''}${body}${h.suffix || ''}`;
}

/** A fresh contact row for the header GUI's "add contact" button. */
export function blankContact() {
    return { type: 'link', icon: '\\faLink', label: '', url: '' };
}

// ─────────────────────────── model edit helpers ───────────────────────────

/** Blank items used by the GUI's "add" buttons. */
export function blankItemFor(type) {
    if (type === 'entries') {
        return { id: nextId('entry'), title: '', right: '', subtitle: '', subright: '', bullets: [''] };
    }
    if (type === 'projects') {
        return { id: nextId('project'), name: '', tech: '', rawTitle: '', right: '', bullets: [''] };
    }
    if (type === 'skills') {
        return { id: nextId('skill'), category: '', items: '' };
    }
    return null;
}

export function blankSection(type) {
    const base = { id: nextId('section'), title: 'New Section', type };
    if (type === 'entries') return { ...base, title: 'Experience', items: [blankItemFor('entries')] };
    if (type === 'projects') return { ...base, title: 'Projects', items: [blankItemFor('projects')] };
    if (type === 'skills') return { ...base, title: 'Technical Skills', rows: [blankItemFor('skills')] };
    if (type === 'text') return { ...base, title: 'Professional Summary', content: '' };
    return { ...base, type: 'raw', raw: '% Custom LaTeX section' };
}
