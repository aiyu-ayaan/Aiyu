"use client";
import React from 'react';
import ProjectForm from '@/app/components/admin/ProjectForm';
import Link from 'next/link';

export default function NewProjectPage() {
    return (
        <div className="p-8 max-w-7xl mx-auto min-h-screen">
            <div className="mb-12">
                <Link href="/admin/projects" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors mb-4 text-sm font-mono opacity-60 hover:opacity-100">
                    ← BACK_TO_DATABASE
                </Link>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">Initialize Project</h1>
                <p className="text-slate-400">Create a new entry in the portfolio database.</p>
            </div>
            <ProjectForm />
        </div>
    );
}
