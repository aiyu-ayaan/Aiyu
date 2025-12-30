"use client";
import React from 'react';
import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa6';
import TerminalForm from '../../components/admin/TerminalForm';

export default function AdminTerminalPage() {
    return (
        <div className="min-h-screen bg-slate-950 p-8 pb-32">
            <div className="max-w-7xl mx-auto">
                <header className="mb-12">
                    <Link
                        href="/admin"
                        className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
                    >
                        <FaArrowLeft />
                        Back to Dashboard
                    </Link>
                </header>

                <TerminalForm />
            </div>
        </div>
    );
}
