// Shared class fragments + helpers for the admin legal screens.
// Uses admin design system tokens and classes (src/app/styles/admin.css).

export const panelClass = 'adm-panel adm-panel-body';
export const headingClass = 'adm-panel-title mb-4 flex items-center justify-between gap-3';
export const labelClass = 'adm-label mb-1.5';
export const inputClass = 'adm-input';
export const hintClass = 'adm-help mt-1.5';
export const primaryButtonClass = 'adm-btn adm-btn-primary';
export const dangerButtonClass = 'adm-btn adm-btn-danger';

/** Client-side mirror of the server slug rule, for live URL previews only. */
export function slugify(value) {
    return String(value || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export async function requestJson(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || `Request failed (${response.status})`);
    return data;
}
