/**
 * Resume Hub — LaTeX snippet builders for the editor's Insert panel.
 *
 * Pure functions that turn a project / deployment / experience record into an
 * editable LaTeX snippet using the macros defined by the default template
 * (\resumeExperience, \resumeProject, \resumeItem, \resumeItemListStart/End).
 * The output is a snapshot the owner edits freely — no live re-sync.
 */

// LaTeX special characters → their escaped forms. Backslash first so we don't
// double-escape the replacements we emit.
const ESCAPES = {
  '\\': '\\textbackslash{}',
  '&': '\\&',
  '%': '\\%',
  $: '\\$',
  '#': '\\#',
  _: '\\_',
  '{': '\\{',
  '}': '\\}',
  '~': '\\textasciitilde{}',
  '^': '\\textasciicircum{}',
};

/** Escape a value for safe inclusion in LaTeX source. */
export function escapeLatex(input) {
  return String(input ?? '').replace(/[\\&%$#_{}~^]/g, (ch) => ESCAPES[ch]);
}

/** "Start -- End", tolerating a missing side or a pre-formatted duration. */
export function dateRange(start, end) {
  const s = String(start ?? '').trim();
  const e = String(end ?? '').trim();
  if (s && e) return `${s} -- ${e}`;
  return s || e || '';
}

/** Accept an array of strings, {text} bullet objects, or a single string. */
export function normalizeBullets(bullets) {
  if (Array.isArray(bullets)) {
    return bullets
      .map((b) => (typeof b === 'string' ? b : b && typeof b === 'object' ? b.text : ''))
      .map((t) => String(t ?? '').trim())
      .filter(Boolean);
  }
  const single = String(bullets ?? '').trim();
  return single ? [single] : [];
}

/** Tech stack as a comma list, from an array or a pre-joined string. */
export function stackToString(stack) {
  if (Array.isArray(stack)) return stack.filter(Boolean).join(', ');
  return String(stack ?? '').trim();
}

function itemList(bullets) {
  const items = normalizeBullets(bullets).map((b) => `      \\resumeItem{${escapeLatex(b)}}`);
  if (items.length === 0) return '';
  return ['    \\resumeItemListStart', ...items, '    \\resumeItemListEnd'].join('\n');
}

/**
 * \resumeExperience{role}{dates}{company}{location} followed by its bullets.
 * Tolerant of About-shaped (`title`/`organisation`/`duration`) and Hub-shaped
 * (`role`/`company`/`start`/`end`) records.
 */
export function experienceSnippet(exp = {}) {
  const role = escapeLatex(exp.role || exp.title || '');
  const company = escapeLatex(exp.company || exp.organisation || exp.organization || '');
  const location = escapeLatex(exp.location || '');
  const dates = escapeLatex(exp.duration || dateRange(exp.start, exp.end));
  const heading = `\\resumeExperience{${role}}{${dates}}{${company}}{${location}}`;
  const bullets = exp.bullets != null ? exp.bullets : exp.description;
  const list = itemList(bullets);
  return list ? `${heading}\n${list}` : heading;
}

/**
 * \resumeProject{name}{stack}{link} followed by its bullets. Shared by Projects
 * and Apps/Deployments — falls back to the record's description as a bullet.
 */
export function projectSnippet(prj = {}) {
  const name = escapeLatex(prj.name || '');
  const stack = escapeLatex(stackToString(prj.stack ?? prj.techStack));
  const link = String(prj.link || prj.codeLink || prj.hostedUrl || '').trim();
  const heading = `\\resumeProject{${name}}{${stack}}{${escapeLatex(link)}}`;
  const bullets = prj.bullets != null ? prj.bullets : prj.description;
  const list = itemList(bullets);
  return list ? `${heading}\n${list}` : heading;
}
