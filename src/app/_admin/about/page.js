"use client";
import React from 'react';
import AboutForm from '@/app/components/admin/AboutForm';
import { PageHeader } from '@/app/components/admin/ui';
import '../../styles/admin-showcase.css';

export default function EditAboutPage() {
    return (
        <div className="adm-page">
            <PageHeader
                command="edit"
                title="About"
                description="Your bio, skills, experience, education and certifications."
                actions={
                    <a href="/about-me" target="_blank" rel="noopener" className="adm-btn">View page</a>
                }
            />
            <AboutForm />
        </div>
    );
}
