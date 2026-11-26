"use client";
import React from 'react';
import { FaCheck, FaPenToSquare, FaPowerOff, FaTrashCan } from 'react-icons/fa6';
import { Badge } from './ui';

export default function ThemePreviewCard({
    theme,
    variant = 'dark',
    isActive = false,
    onActivate,
    onEdit,
    onDelete,
    isPredefined = false,
    hideActions = false,
}) {
    const colors = theme.variants?.[variant] || theme.variants?.dark;
    const swatches = [
        { label: 'Primary background', value: colors?.backgrounds?.primary },
        { label: 'Secondary background', value: colors?.backgrounds?.secondary },
        { label: 'Surface', value: colors?.backgrounds?.surface },
        { label: 'Cyan accent', value: colors?.accents?.cyan },
        { label: 'Purple accent', value: colors?.accents?.purple },
        { label: 'Pink accent', value: colors?.accents?.pink },
    ].filter((s) => Boolean(s.value));

    return (
        <article
            className={`adm-panel flex h-full flex-col overflow-hidden ${
                isActive ? 'border-[var(--accent-cyan)]' : ''
            }`}
        >
            {/* Intentional theme colour preview window */}
            <div
                className="relative h-32 border-b border-[var(--hairline)] p-3.5"
                style={{ backgroundColor: colors?.backgrounds?.primary }}
            >
                <div className="flex h-full flex-col gap-2">
                    <div
                        className="h-2 w-1/3 rounded opacity-40"
                        style={{ backgroundColor: colors?.text?.primary }}
                    />
                    <div
                        className="flex flex-1 flex-col gap-2 rounded-[10px] border p-2.5"
                        style={{
                            borderColor: colors?.borders?.primary,
                            backgroundColor: colors?.backgrounds?.secondary,
                        }}
                    >
                        <div className="flex items-center gap-1.5">
                            <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: colors?.status?.error }}
                            />
                            <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: colors?.status?.warning }}
                            />
                            <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: colors?.status?.success }}
                            />
                        </div>
                        <div
                            className="h-1.5 w-full rounded opacity-30"
                            style={{ backgroundColor: colors?.text?.secondary }}
                        />
                        <div
                            className="h-1.5 w-2/3 rounded opacity-30"
                            style={{ backgroundColor: colors?.text?.secondary }}
                        />
                        <div
                            className="mt-auto self-end rounded px-2 py-0.5 font-mono text-[10px] font-semibold"
                            style={{
                                backgroundColor: colors?.accents?.cyan,
                                color: colors?.backgrounds?.primary || '#0d1117',
                            }}
                        >
                            Action
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 flex-col justify-between gap-4 p-4">
                <div>
                    <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-[var(--text-bright)]">{theme.name}</h3>
                        {isActive && <Badge tone="ok">Active</Badge>}
                    </div>
                    {theme.description && (
                        <p className="adm-help mt-1 line-clamp-2">{theme.description}</p>
                    )}
                </div>

                <div>
                    <p className="adm-help mb-1.5">Palette swatches</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                        {swatches.map((swatch, i) => (
                            <span
                                key={i}
                                className="h-6 w-6 rounded-full border border-[var(--hairline-strong)]"
                                style={{ backgroundColor: swatch.value }}
                                title={`${swatch.label}: ${swatch.value}`}
                            />
                        ))}
                    </div>
                </div>

                {!hideActions && (
                    <div className="flex items-center gap-2 border-t border-[var(--hairline)] pt-3">
                        {!isActive ? (
                            <button
                                type="button"
                                onClick={onActivate}
                                className="adm-btn flex-1"
                            >
                                <FaPowerOff aria-hidden="true" />
                                Activate
                            </button>
                        ) : (
                            <span className="adm-btn adm-btn-quiet flex-1 cursor-default">
                                <FaCheck aria-hidden="true" />
                                Active theme
                            </span>
                        )}

                        {!isPredefined && (
                            <div className="flex items-center gap-1">
                                {onEdit && (
                                    <button
                                        type="button"
                                        onClick={onEdit}
                                        className="adm-icon-btn"
                                        aria-label={`Edit ${theme.name}`}
                                    >
                                        <FaPenToSquare aria-hidden="true" />
                                    </button>
                                )}
                                {onDelete && !isActive && (
                                    <button
                                        type="button"
                                        onClick={onDelete}
                                        className="adm-icon-btn"
                                        aria-label={`Delete ${theme.name}`}
                                    >
                                        <FaTrashCan aria-hidden="true" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </article>
    );
}
