"use client";
import React from 'react';
import Link from 'next/link';
import ConfigForm from '@/app/components/admin/ConfigForm';
import { PageHeader } from '@/app/components/admin/ui';

export default function ConfigPage() {
    return (
        <div className="adm-page">
            <PageHeader
                command="edit"
                title="Site configuration"
                description={<>Branding, page headers, resume and integrations. SEO and social metadata live under <Link href="/admin/social" className="adm-link underline">Social and metadata</Link>.</>}
            />
            <ConfigForm />
        </div>
    );
}
