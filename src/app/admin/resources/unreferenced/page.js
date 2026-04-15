'use client';

import Link from 'next/link';
import { FaBroomBall } from 'react-icons/fa6';
import StorageManager from '@/app/components/admin/StorageManager';

export default function AdminUnreferencedResourcesPage() {
    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-12">
                <Link href="/admin/resources" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors mb-4 text-sm font-mono opacity-60 hover:opacity-100">
                    ← BACK_TO_RESOURCE_STORAGE
                </Link>
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20 text-red-400">
                        <FaBroomBall className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-1 tracking-tight">Unreferenced Upload Cleanup</h1>
                        <p className="text-slate-400">Review orphaned files, inspect reclaimable storage, and delete them individually or all at once.</p>
                    </div>
                </div>
            </div>

            <StorageManager mode="cleanup" />
        </div>
    );
}
