"use client";
import React, { useEffect, useState } from 'react';
import ProjectForm from '@/app/components/admin/ProjectForm';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function EditProjectPage() {
    const { id } = useParams();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProject = async () => {
            try {
                const res = await fetch(`/api/projects/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setProject(data);
                }
            } catch (error) {
                console.error('Failed to fetch project', error);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchProject();
        }
    }, [id]);

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <span className="font-mono text-cyan-400 animate-pulse">SEARCHING_DATABASE...</span>
        </div>
    );

    if (!project) return (
        <div className="flex items-center justify-center min-h-screen">
            <span className="font-mono text-red-400">ERROR: PROJECT_NOT_FOUND</span>
        </div>
    );

    return (
        <div className="p-8 max-w-7xl mx-auto min-h-screen">
            <div className="mb-12">
                <Link href="/admin/projects" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors mb-4 text-sm font-mono opacity-60 hover:opacity-100">
                    ← BACK_TO_DATABASE
                </Link>
                <div className="flex items-end gap-4">
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">Modify Project</h1>
                    <span className="font-mono text-xs text-slate-500 mb-4 pb-1">ID: {project._id}</span>
                </div>
                <p className="text-slate-400">Update project parameters and assets.</p>
            </div>

            <ProjectForm initialData={project} isEdit={true} />
        </div>
    );
}
