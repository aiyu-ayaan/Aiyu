"use client";
import React from 'react';
import { Edit2, Trash2, Check, Power } from 'lucide-react';

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
        <div className={`bg-[#0a0a0a]/80 backdrop-blur-md rounded-xl overflow-hidden border transition-all duration-300 group flex flex-col h-full ${isActive ? 'border-cyan-500/50 shadow-[0_0_20px_rgba(34,211,238,0.1)]' : 'border-white/5 hover:border-white/10 hover:shadow-lg'}`}>

            {/* Color Preview Header */}
            <div className="h-32 relative" style={{ backgroundColor: colors?.backgrounds?.primary }}>
                <div className="absolute inset-0 opacity-20 bg-[linear-gradient(45deg,transparent_25%,rgba(0,0,0,.3)_25%,rgba(0,0,0,.3)_50%,transparent_50%,transparent_75%,rgba(0,0,0,.3)_75%,rgba(0,0,0,.3)),linear-gradient(45deg,transparent_25%,rgba(0,0,0,.3)_25%,rgba(0,0,0,.3)_50%,transparent_50%,transparent_75%,rgba(0,0,0,.3)_75%,rgba(0,0,0,.3))]" style={{ backgroundSize: "20px 20px" }}></div>

                {/* Overlay Elements imitating UI */}
                <div className="absolute top-4 left-4 right-4 bottom-4 flex flex-col gap-2">
                    <div className="h-2 w-1/3 rounded opacity-30 bg-current" style={{ color: colors?.text?.primary }}></div>
                    <div className="flex-1 rounded-lg border opacity-50 backdrop-blur-sm p-2 flex flex-col gap-2" style={{ borderColor: colors?.borders?.primary, backgroundColor: colors?.backgrounds?.secondary }}>
                        <div className="flex gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors?.status?.error }}></div>
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors?.status?.warning }}></div>
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors?.status?.success }}></div>
                        </div>
                        <div className="h-1 w-full rounded opacity-20 bg-current" style={{ color: colors?.text?.secondary }}></div>
                        <div className="h-1 w-2/3 rounded opacity-20 bg-current" style={{ color: colors?.text?.secondary }}></div>
                        <div className="mt-auto self-end px-2 py-0.5 rounded text-[8px] font-mono" style={{ backgroundColor: colors?.accents?.cyan, color: '#000' }}>
                            BUTTON
                        </div>
                    </div>
                </div>

                {isActive && (
                    <div className="absolute top-2 right-2 bg-cyan-500/20 backdrop-blur-md text-cyan-400 border border-cyan-500/30 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 font-mono uppercase">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        Active
                    </div>
                )}
            </div>

            {/* Info Section */}
            <div className="p-5 flex-1 flex flex-col">
                <div className="mb-4">
                    <div className="flex justify-between items-start mb-1">
                        <h3 className="text-lg font-bold text-white tracking-tight">{theme.name}</h3>
                    </div>
                    {theme.description && (
                        <p className="text-xs text-slate-400 line-clamp-2">{theme.description}</p>
                    )}
                </div>

                {/* Palette Grid */}
                <div className="mt-auto mb-4">
                    <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">Palette Extract</div>
                    <div className="flex gap-1.5 items-center">
                        {[
                            colors?.backgrounds?.primary,
                            colors?.backgrounds?.secondary,
                            colors?.accents?.cyan,
                            colors?.accents?.purple,
                            colors?.accents?.pink,
                        ].filter(Boolean).slice(0, 6).map((c, i) => (
                            <div
                                key={i}
                                className="w-6 h-6 rounded-full border border-white/10 shadow-sm"
                                style={{ backgroundColor: c }}
                                title={c}
                            />
                        ))}
                    </div>
                </div>

                {/* Action Bar */}
                <div className="flex items-center gap-2 pt-4 border-t border-white/5">
                    {!isActive ? (
                        <button
                            onClick={onActivate}
                            className="flex-1 bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-400 text-slate-300 py-2 rounded-lg transition-all text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 border border-white/5 hover:border-cyan-500/30 group/btn"
                        >
                            <Power className="w-3 h-3 group-hover/btn:scale-110 transition-transform" />
                            Activate
                        </button>
                    ) : (
                        <div className="flex-1 bg-cyan-500/10 text-cyan-400 py-2 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 border border-cyan-500/20 cursor-default">
                            <Check className="w-3 h-3" />
                            Deployed
                        </div>
                    )}

                    {!isPredefined && (
                        <div className="flex gap-1">
                            {onEdit && (
                                <button
                                    onClick={onEdit}
                                    className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors"
                                    title="Edit Schema"
                                >
                                    <Edit2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                            {onDelete && !isActive && (
                                <button
                                    onClick={onDelete}
                                    className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                                    title="Delete Schema"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
