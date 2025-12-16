'use client';

import GalleryManager from '@/app/components/admin/GalleryManager';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function AdminGalleryPage() {
    return (
        <div className="p-6">
            <Link href="/admin" className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-6 transition-colors">
                <ArrowLeft size={20} /> Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold mb-8 text-[var(--primary)]">Gallery Management</h1>
            <GalleryManager />
        </div>
    );
}
