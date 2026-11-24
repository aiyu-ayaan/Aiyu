"use client";
import React from 'react';
import HomeForm from '@/app/components/admin/HomeForm';
import Link from 'next/link';

export default function EditHomePage() {
    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            {/* Redesigned Header Layout with direct Skins Link */}
            <div className="mb-12 flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-white/5">
                <div>
                    <Link href="/admin" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors mb-4 text-sm font-mono opacity-60 hover:opacity-100">
                        ← BACK_TO_COMMAND_CENTER
                    </Link>
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">Landing Sequence</h1>
                    <p className="text-slate-400">Configure hero section parameters and initial user engagement protocols.</p>
                </div>

                {/* Skins Uplink Button */}
                <Link href="/admin/themes" className="flex-shrink-0">
                    <button type="button" className="px-5 py-3 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 hover:text-purple-300 transition-all font-mono text-xs tracking-wider flex items-center gap-2.5 shadow-[0_0_20px_rgba(168,85,247,0.15)] cursor-pointer">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                        </span>
                        🎨 CONFIGURE_INTERFACE_SKINS →
                    </button>
                </Link>
            </div>

            <HomeForm />
        </div>
    );
}
