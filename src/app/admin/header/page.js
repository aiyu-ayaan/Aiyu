"use client";
import React from 'react';
import HeaderForm from '@/app/components/admin/HeaderForm';
import Link from 'next/link';

export default function EditHeaderPage() {
    return (
        <div className="p-8">
            <div className="mb-6">
                <Link href="/admin" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors">
                    ← Back to Dashboard
                </Link>
            </div>
            <h1 className="text-3xl font-bold text-white mb-8 text-center">Edit Header</h1>
            <HeaderForm />
        </div>
    );
}
