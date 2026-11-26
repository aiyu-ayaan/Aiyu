"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FaArrowLeft } from 'react-icons/fa6';
import LegalDocumentForm from '@/app/components/admin/legal/LegalDocumentForm';
import { requestJson } from '@/app/components/admin/legal/legalUi';
import { PageHeader, Panel, Loading } from '@/app/components/admin/ui';
import '@/app/styles/admin-blogs.css';

export default function EditLegalDocumentPage() {
    const { id, docId } = useParams();
    const [doc, setDoc] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        requestJson(`/api/legal/documents/${docId}`).then(setDoc).catch(() => setDoc(null)).finally(() => setLoading(false));
    }, [docId]);

    if (loading) {
        return (
            <div className="adm-page">
                <PageHeader command="vim" title="Edit legal page" description="Loading document..." />
                <Panel>
                    <Loading label="Loading legal page" rows={5} />
                </Panel>
            </div>
        );
    }

    if (!doc || doc.appId !== id) {
        return (
            <div className="adm-page">
                <PageHeader
                    command="vim"
                    title="Legal page not found"
                    actions={
                        <Link href={`/admin/legal/${id}`} className="adm-btn">
                            <FaArrowLeft aria-hidden="true" /> Back to app
                        </Link>
                    }
                />
                <div role="alert" className="adm-notice adm-notice-error">
                    Legal page not found.
                </div>
            </div>
        );
    }

    return (
        <div className="adm-page">
            <PageHeader
                command="vim"
                title={doc.title}
                description={`${doc.app.name} · /${doc.app.slug}/${doc.slug}`}
                actions={
                    <Link href={`/admin/legal/${id}`} className="adm-btn">
                        <FaArrowLeft aria-hidden="true" /> Back to {doc.app.name}
                    </Link>
                }
            />
            <LegalDocumentForm key={doc._id} app={doc.app} initialData={doc} />
        </div>
    );
}
