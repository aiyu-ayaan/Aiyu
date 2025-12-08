"use client";
import React, { useEffect, useState } from 'react';
import ProjectForm from '@/app/components/admin/ProjectForm';
import { useParams } from 'next/navigation';

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

    if (loading) return <div className="p-8 text-white">Loading...</div>;
    if (!project) return <div className="p-8 text-white">Project not found</div>;

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-white mb-8 text-center">Edit Project</h1>
            <ProjectForm initialData={project} isEdit={true} />
        </div>
    );
}
