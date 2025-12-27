"use client";
import React from 'react';
import AboutForm from '@/app/components/admin/AboutForm';
import Link from 'next/link';

export default function EditAboutPage() {
    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-12">
                <Link href="/admin" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors mb-4 text-sm font-mono opacity-60 hover:opacity-100">
                    ← BACK_TO_COMMAND_CENTER
                </Link>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">Identity Matrix</h1>
                <p className="text-slate-400">Manage bio data, skill vectors, and personal narrative.</p>
            </div>

            <AboutForm />
        </div>
    );
}
