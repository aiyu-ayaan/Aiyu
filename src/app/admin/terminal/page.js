"use client";
import React from 'react';
import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa6';
import TerminalForm from '../../components/admin/TerminalForm';

export default function AdminTerminalPage() {
    return (
        <div className="p-8 max-w-7xl mx-auto min-h-screen">
            <div className="mb-8">
                <Link href="/admin" className="text-cyan-400 hover:text-cyan-300 transition-colors mb-4 inline-flex items-center gap-2 font-mono text-sm tracking-wide">
                    ← BACK_TO_COMMAND_CENTER
                </Link>
                <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Terminal Matrix</h1>
                <p className="text-slate-400">Customize the appearance and behavior of the terminal component</p>
            </div>
            <TerminalForm />
        </div>
    );
}
