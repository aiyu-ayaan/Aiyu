"use client";
import React from 'react';
import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa6';
import ProjectForm from '@/app/components/admin/ProjectForm';
import { PageHeader } from '@/app/components/admin/ui';
import '@/app/styles/admin-projects.css';

export default function NewProjectPage() {
    return (
        <div className="adm-page">
            <PageHeader
                command="touch"
                title="New project"
                description="Add a new project entry to your portfolio."
                actions={
                    <Link href="/admin/projects" className="adm-btn">
                        <FaArrowLeft aria-hidden="true" /> Back to projects
                    </Link>
                }
            />
            <ProjectForm />
        </div>
    );
}
