"use client";
import React from 'react';

export default function ThemePreviewCard({
    theme,
    variant = 'dark',
    isActive = false,
    onActivate,
    onEdit,
    onDelete,
    isPredefined = false
}) {
    const colors = theme.variants?.[variant] || theme.variants?.dark;

    return (
        <div className={`bg-gray-800 border ${isActive ? 'border-cyan-400' : 'border-gray-700'} rounded-xl overflow-hidden hover:border-cyan-400 transition-colors group`}>
            {/* Header */}
            <div className="p-4 border-b border-gray-700">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-lg font-bold text-white">{theme.name}</h3>
                        {theme.description && (
                            <p className="text-sm text-gray-400 mt-1">{theme.description}</p>
                        )}
                    </div>
                    {isActive && (
                        <span className="bg-cyan-500 text-white text-xs px-2 py-1 rounded-full">
                            Active
                        </span>
                    )}
                </div>
            </div>

            {/* Color Preview */}
            <div className="p-4" style={{ backgroundColor: colors?.backgrounds?.primary }}>
                {/* Background Colors */}
                <div className="mb-3">
                    <div className="text-xs mb-1" style={{ color: colors?.text?.muted }}>Backgrounds</div>
                    <div className="grid grid-cols-6 gap-1">
                        <div className="h-8 rounded" style={{ backgroundColor: colors?.backgrounds?.primary }} title="Primary"></div>
                        <div className="h-8 rounded" style={{ backgroundColor: colors?.backgrounds?.secondary }} title="Secondary"></div>
                        <div className="h-8 rounded" style={{ backgroundColor: colors?.backgrounds?.tertiary }} title="Tertiary"></div>
                        <div className="h-8 rounded" style={{ backgroundColor: colors?.backgrounds?.surface }} title="Surface"></div>
                        <div className="h-8 rounded" style={{ backgroundColor: colors?.backgrounds?.elevated }} title="Elevated"></div>
                        <div className="h-8 rounded" style={{ backgroundColor: colors?.backgrounds?.hover }} title="Hover"></div>
                    </div>
                </div>

                {/* Accent Colors */}
                <div className="mb-3">
                    <div className="text-xs mb-1" style={{ color: colors?.text?.muted }}>Accents</div>
                    <div className="grid grid-cols-5 gap-1">
                        <div className="h-8 rounded" style={{ backgroundColor: colors?.accents?.cyan }} title="Cyan"></div>
                        <div className="h-8 rounded" style={{ backgroundColor: colors?.accents?.purple }} title="Purple"></div>
                        <div className="h-8 rounded" style={{ backgroundColor: colors?.accents?.pink }} title="Pink"></div>
                        <div className="h-8 rounded" style={{ backgroundColor: colors?.accents?.orange }} title="Orange"></div>
                        <div className="h-8 rounded" style={{ backgroundColor: colors?.accents?.cyanBright }} title="Cyan Bright"></div>
                    </div>
                </div>

                {/* Text Preview */}
                <div
                    className="p-3 rounded"
                    style={{ backgroundColor: colors?.backgrounds?.secondary }}
                >
                    <div className="text-sm font-mono" style={{ color: colors?.text?.primary }}>
                        Primary Text
                    </div>
                    <div className="text-xs font-mono" style={{ color: colors?.text?.secondary }}>
                        Secondary Text
                    </div>
                    <div className="text-xs font-mono mt-1" style={{ color: colors?.accents?.cyan }}>
                        Accent Link
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="p-4 bg-gray-800 border-t border-gray-700 flex gap-2">
                {!isActive && (
                    <button
                        onClick={onActivate}
                        className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-white px-4 py-2 rounded transition-colors text-sm"
                    >
                        Activate
                    </button>
                )}
                {isActive && (
                    <div className="flex-1 bg-gray-700 text-gray-400 px-4 py-2 rounded text-sm text-center cursor-not-allowed">
                        Currently Active
                    </div>
                )}

                {!isPredefined && onEdit && (
                    <button
                        onClick={onEdit}
                        className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded transition-colors text-sm"
                        title="Edit theme"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>
                )}

                {!isPredefined && onDelete && (
                    <button
                        onClick={onDelete}
                        className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded transition-colors text-sm"
                        title="Delete theme"
                        disabled={isActive}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
}
