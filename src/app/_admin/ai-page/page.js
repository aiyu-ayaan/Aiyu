"use client";
import React from 'react';
import AiPageForm from '@/app/components/admin/AiPageForm';
import { PageHeader } from '@/app/components/admin/ui';
import '../../styles/admin-showcase.css';

export default function EditAiPage() {
    return (
        <div className="adm-page">
            <PageHeader
                command="edit"
                title="AI hub"
                description="Skills, recommendations, free credits and prompts on the public /ai page. Content saves as soon as you save a card; section order and headings save from the Layout tab."
                actions={
                    <a href="/ai" target="_blank" rel="noopener" className="adm-btn">View live page</a>
                }
            />
            <AiPageForm />
        </div>
    );
}
