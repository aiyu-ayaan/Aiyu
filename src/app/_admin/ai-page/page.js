"use client";
import React from 'react';
import Link from 'next/link';
import AiPageForm from '@/app/components/admin/AiPageForm';

export default function EditAiPage() {
    return (
        <div className="mx-auto max-w-5xl p-4 md:p-8">
            <div className="mb-10 flex flex-col gap-6 border-b border-white/5 pb-6 md:flex-row md:items-center md:justify-between">
                <div>
                    <Link
                        href="/admin"
                        className="mb-4 flex items-center gap-2 font-mono text-sm text-cyan-400 opacity-60 transition-colors hover:text-cyan-300 hover:opacity-100"
                    >
                        ← BACK_TO_COMMAND_CENTER
                    </Link>
                    <h1 className="mb-2 text-3xl font-bold tracking-tight text-white md:text-4xl">AI Hub</h1>
                    <p className="text-slate-400">
                        Curate the public <span className="font-mono text-cyan-400">/ai</span> page as cards — add, edit, and
                        remove skills, recommendations, free credits, and prompts. Each change saves live via the{' '}
                        <span className="font-mono text-cyan-400">/api/ai/*</span> APIs. The Layout tab reorders and toggles
                        sections; live telemetry comes from AiLog automatically.
                    </p>
                </div>

                <Link href="/ai" target="_blank" className="flex-shrink-0">
                    <button
                        type="button"
                        className="flex items-center gap-2.5 rounded-xl border border-purple-500/30 bg-purple-500/10 px-5 py-3 font-mono text-xs tracking-wider text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.15)] transition-all hover:bg-purple-500/20 hover:text-purple-300"
                    >
                        🚀 VIEW_LIVE_PAGE →
                    </button>
                </Link>
            </div>

            <AiPageForm />
        </div>
    );
}
