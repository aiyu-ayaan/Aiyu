"use client";
import React from 'react';
import HeaderForm from '@/app/components/admin/HeaderForm';
import Link from 'next/link';

export default function EditHeaderPage() {
    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <Link href="/admin" className="text-cyan-400 hover:text-cyan-300 transition-colors mb-4 inline-flex items-center gap-2 font-mono text-sm tracking-wide">
                    ← BACK_TO_COMMAND_CENTER
                </Link>
                <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Navigation Matrix</h1>
                <p className="text-slate-400">Configure global navigation links and contact pointers.</p>
            </div>
            <HeaderForm />
        </div>
    );
}
