'use client';

import Link from 'next/link';
import { FaHardDrive } from 'react-icons/fa6';
import StorageManager from '@/app/components/admin/StorageManager';

export default function AdminResourcesPage() {
    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="mb-12">
                <Link href="/admin" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors mb-4 text-sm font-mono opacity-60 hover:opacity-100">
                    ← BACK_TO_COMMAND_CENTER
                </Link>
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20 text-cyan-400">
                        <FaHardDrive className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-1 tracking-tight">Resource Storage</h1>
                        <p className="text-slate-400">Track upload usage, content footprint, and cleanup opportunities across the app.</p>
                    </div>
                </div>
            </div>

            <StorageManager />
        </div>
    );
}
