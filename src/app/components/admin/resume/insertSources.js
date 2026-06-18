"use client";
import { experienceSnippet, projectSnippet } from '@/lib/resume/latexSnippets';

// Fetch the site's live data and expose it as Insert-panel groups, each item
// carrying a `latex()` builder that produces an editable snippet.
const safeJson = (url) =>
  fetch(url)
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);

export async function loadInsertSources() {
  const [projects, deployments, about] = await Promise.all([
    safeJson('/api/projects'),
    safeJson('/api/deployments'),
    safeJson('/api/about'),
  ]);

  const experiences = about?.experiences || about?.experience || [];

  return [
    {
      key: 'projects',
      label: 'Projects',
      items: (Array.isArray(projects) ? projects : []).map((p, i) => ({
        id: p.id || `${p.name}-${i}`,
        label: p.name || 'Untitled project',
        latex: () => projectSnippet(p),
      })),
    },
    {
      key: 'apps',
      label: 'Apps / Deployments',
      items: (Array.isArray(deployments) ? deployments : []).map((d, i) => ({
        id: d.id || `${d.name}-${i}`,
        label: d.name || 'Untitled app',
        latex: () => projectSnippet(d),
      })),
    },
    {
      key: 'experience',
      label: 'Experience',
      items: (Array.isArray(experiences) ? experiences : []).map((e, i) => ({
        id: e.id || `${e.company || e.role}-${i}`,
        label: [e.role || e.title, e.company || e.organisation].filter(Boolean).join(' — ') || 'Experience',
        latex: () => experienceSnippet(e),
      })),
    },
  ];
}
