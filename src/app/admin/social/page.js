"use client";
import React from 'react';
import Link from 'next/link';
import SocialMetaForm from '@/app/components/admin/SocialMetaForm';

export default function SocialPage() {
    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="mb-12">
                <Link href="/admin" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors mb-4 text-sm font-mono opacity-60 hover:opacity-100">
                    ← BACK_TO_COMMAND_CENTER
                </Link>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">Social & Metadata</h1>
                <p className="text-slate-400">Manage SEO metadata and per-page Open Graph tags for social sharing. Blog posts are managed per-post.</p>
            </div>

            <SocialMetaForm />
        </div>
    );
}
