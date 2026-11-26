"use client";

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { FaArrowLeft } from 'react-icons/fa6';
import LegalDocumentForm from '@/app/components/admin/legal/LegalDocumentForm';
import { requestJson } from '@/app/components/admin/legal/legalUi';
import { LEGAL_KINDS } from '@/lib/legalKinds';
import { PageHeader, Panel, Loading } from '@/app/components/admin/ui';
import '@/app/styles/admin-blogs.css';

function NewLegalDocument() {
    const { id } = useParams();
    const searchParams = useSearchParams();
    const requestedKind = searchParams.get('kind');
    const kind = LEGAL_KINDS.some((k) => k.value === requestedKind) ? requestedKind : 'privacy-policy';
    const [app, setApp] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        requestJson(`/api/legal/apps/${id}`).then(setApp).catch(() => setApp(null)).finally(() => setLoading(false));
    }, [id]);

    if (loading) {
        return (
            <div className="adm-page">
                <PageHeader command="touch" title="New legal page" description="Loading application context..." />
                <Panel>
                    <Loading label="Loading legal editor" rows={5} />
                </Panel>
            </div>
        );
    }

    if (!app) {
        return (
            <div className="adm-page">
                <PageHeader
                    command="touch"
                    title="Legal application not found"
                    actions={
                        <Link href="/admin/legal" className="adm-btn">
                            <FaArrowLeft aria-hidden="true" /> Back to legal
                        </Link>
                    }
                />
                <div role="alert" className="adm-notice adm-notice-error">
                    Legal application not found.
                </div>
            </div>
        );
    }

    return (
        <div className="adm-page">
            <PageHeader
                command="touch"
                title="New legal page"
                description={`Add a legal document for ${app.name} (/${app.slug}).`}
                actions={
                    <Link href={`/admin/legal/${app._id}`} className="adm-btn">
                        <FaArrowLeft aria-hidden="true" /> Back to {app.name}
                    </Link>
                }
            />
            <LegalDocumentForm app={app} defaultKind={kind} />
        </div>
    );
}

export default function NewLegalDocumentPage() {
    return (
        <Suspense fallback={<div className="adm-page"><Panel><Loading label="Loading editor" rows={5} /></Panel></div>}>
            <NewLegalDocument />
        </Suspense>
    );
}
