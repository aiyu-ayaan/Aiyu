/**
 * Collapse the master schema + a chosen profile into a flat, render-ready model.
 *
 * Pure and side-effect free so it can be unit-tested without React/PDF. The
 * returned shape is consumed by both the PDF template and (later) any HTML
 * preview, keeping a single source of truth for "what this profile shows".
 */

import { normalizeResumeData, sanitizeOrder, SECTION_TITLES } from './schema.js';

/**
 * @param {object} rawData  Stored ResumeBuilder blob (any shape — normalized here).
 * @param {string} [profileId]  Profile to render; falls back to default, then first.
 * @returns {{
 *   basics: object,
 *   tagline: string,
 *   profileId: string,
 *   profileName: string,
 *   sections: Array<object>,
 * }}
 */
export function resolveProfile(rawData, profileId) {
  const data = normalizeResumeData(rawData);
  const { schema, profiles, defaultProfileId } = data;

  const profile =
    profiles.find((p) => p.id === profileId) ||
    profiles.find((p) => p.id === defaultProfileId) ||
    profiles[0];

  const hiddenItems = new Set(profile.hidden.items);
  const hiddenBullets = new Set(profile.hidden.bullets);
  const order = sanitizeOrder(profile.sectionOrder);

  const basics = { ...schema.basics };
  const tagline = profile.tagline.trim() || basics.title || '';
  const summaryText = (profile.summary.trim() || schema.summary || '').trim();

  const visibleItems = (list) => list.filter((it) => !hiddenItems.has(it.id));
  const visibleBullets = (item) =>
    (item.bullets || []).filter((bl) => !hiddenBullets.has(bl.id)).map((bl) => bl.text);

  const sections = [];
  for (const key of order) {
    const title = SECTION_TITLES[key];

    if (key === 'summary') {
      if (summaryText) sections.push({ key, title, kind: 'summary', text: summaryText });
      continue;
    }

    if (key === 'experience') {
      const items = visibleItems(schema.experience).map((it) => ({
        company: it.company,
        role: it.role,
        location: it.location,
        start: it.start,
        end: it.end,
        bullets: visibleBullets(it),
      }));
      if (items.length) sections.push({ key, title, kind: 'experience', items });
      continue;
    }

    if (key === 'projects') {
      const items = visibleItems(schema.projects).map((it) => ({
        name: it.name,
        stack: it.stack,
        start: it.start,
        end: it.end,
        link: it.link,
        bullets: visibleBullets(it),
      }));
      if (items.length) sections.push({ key, title, kind: 'projects', items });
      continue;
    }

    if (key === 'education') {
      const items = visibleItems(schema.education).map((it) => ({
        institution: it.institution,
        degree: it.degree,
        location: it.location,
        start: it.start,
        end: it.end,
        note: it.note,
      }));
      if (items.length) sections.push({ key, title, kind: 'education', items });
      continue;
    }

    if (key === 'skills') {
      const items = visibleItems(schema.skills).map((it) => ({
        category: it.category,
        items: it.items,
      }));
      if (items.length) sections.push({ key, title, kind: 'skills', items });
      continue;
    }

    if (key === 'certifications') {
      const items = visibleItems(schema.certifications).map((it) => ({
        name: it.name,
        issuer: it.issuer,
        date: it.date,
        link: it.link,
      }));
      if (items.length) sections.push({ key, title, kind: 'certifications', items });
      continue;
    }
  }

  return {
    basics,
    tagline,
    profileId: profile.id,
    profileName: profile.name,
    sections,
  };
}

/** Suggested download filename, e.g. "Ayaan-Ansari-AI-Engineer.pdf". */
export function resumeFilename(model) {
  const name = (model?.basics?.name || 'resume').trim();
  const profile = (model?.profileName || '').trim();
  const slug = [name, profile].filter(Boolean).join('-').replace(/[^a-zA-Z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return `${slug || 'resume'}.pdf`;
}
