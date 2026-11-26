"use client";

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FaArrowLeft } from 'react-icons/fa6';
import LegalAppForm from '@/app/components/admin/legal/LegalAppForm';
import { PageHeader, Panel, Loading } from '@/app/components/admin/ui';
import '@/app/styles/admin-blogs.css';

// ?deploymentId=… (from an app's "Add privacy policy / terms") pre-links the app.
function NewLegalAppForm() {
    const deploymentId = useSearchParams().get('deploymentId') || '';
    return <LegalAppForm defaultDeploymentId={deploymentId} />;
}

export default function NewLegalAppPage() {
    return (
        <div className="adm-page">
            <PageHeader
                command="mkdir"
                title="New legal app"
                description="Create the application first, then add its privacy policy, terms, and other legal pages."
                actions={
                    <Link href="/admin/legal" className="adm-btn">
                        <FaArrowLeft aria-hidden="true" /> Back to legal
                    </Link>
                }
            />
            <Suspense fallback={<Panel><Loading label="Loading form" rows={4} /></Panel>}>
                <NewLegalAppForm />
            </Suspense>
        </div>
    );
}
