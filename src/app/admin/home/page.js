"use client";
import React from 'react';
import HomeForm from '@/app/components/admin/HomeForm';
import Link from 'next/link';

export default function EditHomePage() {
    return (
        <div className="p-8">
            <div className="mb-6">
                <Link href="/admin" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors">
                    ← Back to Dashboard
                </Link>
            </div>
            <h1 className="text-3xl font-bold text-white mb-8 text-center">Edit Home Page</h1>
            <HomeForm />
        </div>
    );
}
