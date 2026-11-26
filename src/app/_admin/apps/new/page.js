"use client";

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FaArrowLeft } from 'react-icons/fa6';
import DeploymentForm from '@/app/components/admin/DeploymentForm';
import { PageHeader } from '@/app/components/admin/ui';
import '@/app/styles/admin-projects.css';

// ?projectId=… (from a project's "Add to apps") pre-links and pre-fills the form.
function NewAppForm() {
    const projectId = useSearchParams().get('projectId') || '';
    return <DeploymentForm defaultProjectId={projectId} />;
}

export default function NewAppPage() {
    return (
        <div className="adm-page">
            <PageHeader
                command="touch"
                title="New app"
                description="Create a hosted app or service entry for the public apps screen."
                actions={
                    <Link href="/admin/apps" className="adm-btn">
                        <FaArrowLeft aria-hidden="true" /> Back to apps
                    </Link>
                }
            />

            <Suspense fallback={null}>
                <NewAppForm />
            </Suspense>
        </div>
    );
}
