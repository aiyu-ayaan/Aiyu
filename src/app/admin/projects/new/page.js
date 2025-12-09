"use client";
import React from 'react';
import ProjectForm from '@/app/components/admin/ProjectForm';

export default function NewProjectPage() {
    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-white mb-8 text-center">Create New Project</h1>
            <ProjectForm />
        </div>
    );
}
