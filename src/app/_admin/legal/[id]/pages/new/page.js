"use client";

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import LegalDocumentForm from '@/app/components/admin/legal/LegalDocumentForm';
import { requestJson } from '@/app/components/admin/legal/legalUi';
import { LEGAL_KINDS } from '@/lib/legalKinds';

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

    if (loading) return <div className="flex items-center justify-center min-h-screen font-mono text-cyan-400 animate-pulse">LOADING...</div>;
    if (!app) return <div className="flex items-center justify-center min-h-screen font-mono text-red-400">ERROR: LEGAL_APP_NOT_FOUND</div>;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
            <div className="mb-10">
                <Link href={`/admin/legal/${app._id}`} className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors mb-4 text-sm font-mono opacity-60 hover:opacity-100">
                    ← BACK_TO_{app.name.toUpperCase().replace(/\s+/g, '_')}
                </Link>
                <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">New legal page</h1>
            </div>
            <LegalDocumentForm app={app} defaultKind={kind} />
        </div>
    );
}

export default function NewLegalDocumentPage() {
    return (
        <Suspense fallback={null}>
            <NewLegalDocument />
        </Suspense>
    );
}
