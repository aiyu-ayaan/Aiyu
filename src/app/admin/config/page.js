"use client";
import React from 'react';
import ConfigForm from '@/app/components/admin/ConfigForm';
import Link from 'next/link';

export default function ConfigPage() {
    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-12">
                <Link href="/admin" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors mb-4 text-sm font-mono opacity-60 hover:opacity-100">
                    ← BACK_TO_COMMAND_CENTER
                </Link>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">System Configuration</h1>
                <p className="text-slate-400">Manage global variables, SEO metadata, and core integration settings.</p>
            </div>

            <ConfigForm />
        </div>
    );
}
