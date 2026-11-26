"use client";
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa6';
import ProjectForm from '@/app/components/admin/ProjectForm';
import { Badge, EmptyState, Loading, PageHeader, Panel } from '@/app/components/admin/ui';
import '@/app/styles/admin-projects.css';

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

    return (
        <div className="adm-page">
            <PageHeader
                command="edit"
                title={project?.name ? `Edit ${project.name}` : 'Edit project'}
                description="Update details, tech stack, links, and cover image for this project."
                actions={
                    <>
                        {project?._id && <Badge>{project._id}</Badge>}
                        <Link href="/admin/projects" className="adm-btn">
                            <FaArrowLeft aria-hidden="true" /> Back to projects
                        </Link>
                    </>
                }
            />

            {loading ? (
                <Panel>
                    <Loading label="Loading project" rows={6} />
                </Panel>
            ) : !project ? (
                <Panel flush>
                    <EmptyState
                        title="Project not found"
                        description="This project may have been removed or the ID is invalid."
                        action={
                            <Link href="/admin/projects" className="adm-btn adm-btn-primary">
                                Back to projects
                            </Link>
                        }
                    />
                </Panel>
            ) : (
                <ProjectForm initialData={project} isEdit={true} />
            )}
        </div>
    );
}
