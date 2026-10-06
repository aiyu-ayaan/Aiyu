"use client";

import Link from 'next/link';
import LegalAppForm from '@/app/components/admin/legal/LegalAppForm';

export default function NewLegalAppPage() {
    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto min-h-screen">
            <div className="mb-10">
                <Link href="/admin/legal" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors mb-4 text-sm font-mono opacity-60 hover:opacity-100">
                    ← BACK_TO_LEGAL
                </Link>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">New legal app</h1>
                <p className="text-slate-400">Create the app first, then add its Privacy Policy, Terms and other pages.</p>
            </div>
            <LegalAppForm />
        </div>
    );
}
