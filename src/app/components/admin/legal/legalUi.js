// Shared class fragments + helpers for the admin legal screens, matching the
// look of the other admin forms (DeploymentForm et al.).

export const panelClass = 'bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-4 md:p-8';
export const headingClass = 'text-sm font-mono text-cyan-400 uppercase tracking-widest mb-6 flex items-center gap-4';
export const labelClass = 'block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2';
export const inputClass = 'w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 px-4 text-slate-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all placeholder:text-slate-600';
export const hintClass = 'mt-2 text-xs text-slate-500';
export const primaryButtonClass = 'inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-bold tracking-wide hover:bg-cyan-500/25 hover:border-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed';
export const dangerButtonClass = 'inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm hover:bg-red-500/20 transition-colors';

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
