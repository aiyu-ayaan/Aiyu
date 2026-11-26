"use client";
import React from 'react';
import Link from 'next/link';
import SocialForm from '@/app/components/admin/SocialForm';
import { PageHeader } from '@/app/components/admin/ui';
import '@/app/styles/admin-structure.css';

export default function NewSocialPage() {
    return (
        <div className="adm-page">
            <PageHeader
                command="touch"
                title="New social link"
                description="Add an external profile link to the public site footer."
                actions={
                    <Link href="/admin/footer" className="adm-btn">
                        Back to footer
                    </Link>
                }
            />
            <SocialForm />
        </div>
    );
}
