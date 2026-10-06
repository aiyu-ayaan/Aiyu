"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import LegalDocumentForm from '@/app/components/admin/legal/LegalDocumentForm';
import { requestJson } from '@/app/components/admin/legal/legalUi';

export default function EditLegalDocumentPage() {
    const { id, docId } = useParams();
    const [doc, setDoc] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        requestJson(`/api/legal/documents/${docId}`).then(setDoc).catch(() => setDoc(null)).finally(() => setLoading(false));
    }, [docId]);

    if (loading) return <div className="flex items-center justify-center min-h-screen font-mono text-cyan-400 animate-pulse">LOADING...</div>;
    if (!doc || doc.appId !== id) return <div className="flex items-center justify-center min-h-screen font-mono text-red-400">ERROR: LEGAL_PAGE_NOT_FOUND</div>;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
            <div className="mb-10">
                <Link href={`/admin/legal/${id}`} className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors mb-4 text-sm font-mono opacity-60 hover:opacity-100">
                    ← BACK_TO_{doc.app.name.toUpperCase().replace(/\s+/g, '_')}
                </Link>
                <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{doc.title}</h1>
                <p className="font-mono text-xs text-slate-500 mt-2">{doc.app.name} · SEQ_ID: {doc._id}</p>
            </div>
            <LegalDocumentForm key={doc._id} app={doc.app} initialData={doc} />
        </div>
    );
}
