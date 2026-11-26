"use client";
import React from 'react';
import HeaderForm from '@/app/components/admin/HeaderForm';
import { PageHeader } from '@/app/components/admin/ui';
import '@/app/styles/admin-structure.css';

export default function EditHeaderPage() {
    return (
        <div className="adm-page adm-structure">
            <PageHeader
                command="edit"
                title="Header navigation"
                description="Order navigation links, set visibility or beta badges, and configure the primary contact action."
            />
            <HeaderForm />
        </div>
    );
}
