"use client";

import clsx from 'clsx';
import { MousePointer2 } from 'lucide-react';
import { setSwarmEnabled, useSwarmPref } from './swarmStore';

/** Header switch for the build animation. Off until the visitor turns it on. */
export default function SwarmToggle({ compact = false }) {
    const { enabled } = useSwarmPref();
    const label = `Build animation: ${enabled ? 'on' : 'off'}`;

    return (
        <button
            type="button"
            onClick={() => setSwarmEnabled(!enabled)}
            aria-pressed={enabled}
            aria-label={label}
            title={`${label}. Cursors rebuild each page as you scroll.`}
            className={clsx(
                'inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border text-sm font-semibold transition-transform duration-150 hover:scale-[1.03] active:scale-[0.97]',
                compact ? 'h-9 w-9 justify-center' : 'h-9 px-3',
            )}
            style={{
                borderColor: enabled
                    ? 'color-mix(in srgb, var(--accent-cyan) 60%, transparent)'
                    : 'color-mix(in srgb, var(--border-secondary) 75%, transparent)',
                backgroundColor: enabled
                    ? 'color-mix(in srgb, var(--accent-cyan) 16%, var(--bg-surface))'
                    : 'color-mix(in srgb, var(--bg-surface) 92%, transparent)',
                color: 'var(--text-primary)',
            }}
        >
            <MousePointer2
                size={14}
                style={{ color: enabled ? 'var(--accent-cyan)' : 'var(--text-tertiary)' }}
                fill={enabled ? 'currentColor' : 'none'}
                aria-hidden="true"
            />
            {!compact && <span>{enabled ? 'Build on' : 'Build off'}</span>}
        </button>
    );
}
