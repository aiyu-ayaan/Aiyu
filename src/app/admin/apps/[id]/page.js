"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import DeploymentForm from '@/app/components/admin/DeploymentForm';

export default function EditAppPage() {
    const { id } = useParams();
    const [deployment, setDeployment] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchApp = async () => {
            try {
                const response = await fetch(`/api/deployments/${id}`);
                if (response.ok) {
                    const data = await response.json();
                    setDeployment(data);
                }
            } catch (error) {
                console.error('Failed to fetch app', error);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchApp();
        }
    }, [id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <span className="font-mono text-cyan-400 animate-pulse">SEARCHING_APPS...</span>
            </div>
        );
    }

    if (!deployment) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <span className="font-mono text-red-400">ERROR: APP_NOT_FOUND</span>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
            <div className="mb-12">
                <Link href="/admin/apps" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors mb-4 text-sm font-mono opacity-60 hover:opacity-100 uppercase tracking-widest">
                    ← BACK_TO_APPS
                </Link>
                <div className="flex items-end gap-4">
                    <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Modify App</h1>
                    <span className="font-mono text-xs text-slate-500 mb-4 pb-1">SEQ_ID: {deployment._id}</span>
                </div>
                <p className="text-slate-400">Update runtime details, URLs, and presentation for this app.</p>
            </div>

            <DeploymentForm initialData={deployment} isEdit={true} />
        </div>
    );
}
