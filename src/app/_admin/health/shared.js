// Server metric formatting shared by the dashboard widget and the health screen.

export function fmtBytes(bytes) {
    if (bytes == null || Number.isNaN(bytes)) return '—';
    const GB = 1024 ** 3, MB = 1024 ** 2, KB = 1024;
    if (bytes >= GB) return `${(bytes / GB).toFixed(1)} GB`;
    if (bytes >= MB) return `${(bytes / MB).toFixed(0)} MB`;
    if (bytes >= KB) return `${(bytes / KB).toFixed(0)} KB`;
    return `${bytes} B`;
}

export function fmtUptime(seconds) {
    if (!seconds) return '—';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return [d ? `${d}d` : '', h ? `${h}h` : '', `${m}m`].filter(Boolean).join(' ');
}

export function MeterBar({ label, percent }) {
    const pct = Math.max(0, Math.min(100, percent || 0));
    const tone = pct >= 90 ? 'var(--status-error)' : pct >= 70 ? 'var(--status-warning)' : 'var(--status-success)';
    return (
        <div className="adm-meter" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
            <span style={{ width: `${pct}%`, '--adm-meter-tone': tone }} />
        </div>
    );
}
