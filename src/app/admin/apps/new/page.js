"use client";

import React from 'react';
import Link from 'next/link';
import DeploymentForm from '@/app/components/admin/DeploymentForm';

export default function NewAppPage() {
    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
            <div className="mb-12">
                <Link href="/admin/apps" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors mb-4 text-sm font-mono opacity-60 hover:opacity-100">
                    ← BACK_TO_APPS
                </Link>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">Add App</h1>
                <p className="text-slate-400">Create a new hosted app or service entry for the public apps screen.</p>
            </div>

            <DeploymentForm />
        </div>
    );
}
