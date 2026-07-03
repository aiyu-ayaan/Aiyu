"use client";
import React from 'react';
import VersionForm from '@/app/components/admin/VersionForm';
import Link from 'next/link';

export default function VersionPage() {
    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <Link href="/admin" className="text-cyan-400 hover:text-cyan-300 transition-colors mb-4 inline-flex items-center gap-2 font-mono text-sm tracking-wide">
                    ← BACK_TO_COMMAND_CENTER
                </Link>
                <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Site Version</h1>
                <p className="text-slate-400">Choose which experience visitors land on by default — the classic site or the V2 editorial-depth redesign.</p>
            </div>
            <VersionForm />
        </div>
    );
}
