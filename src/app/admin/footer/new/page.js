"use client";
import React from 'react';
import SocialForm from '@/app/components/admin/SocialForm';
import Link from 'next/link';

export default function NewSocialPage() {
    return (
        <div className="p-8">
            <div className="mb-6">
                <Link href="/admin/footer" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors">
                    ← Back to Footer
                </Link>
            </div>
            <h1 className="text-3xl font-bold text-white mb-8 text-center">Create New Social Link</h1>
            <SocialForm />
        </div>
    );
}
