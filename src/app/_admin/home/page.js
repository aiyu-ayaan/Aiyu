"use client";
import React from 'react';
import Link from 'next/link';
import HomeForm from '@/app/components/admin/HomeForm';
import { PageHeader } from '@/app/components/admin/ui';
import '../../styles/admin-showcase.css';

export default function EditHomePage() {
    return (
        <div className="adm-page">
            <PageHeader
                command="edit"
                title="Home"
                description="The hero, terminal, status strip and focus areas visitors see first."
                actions={
                    <a href="/" target="_blank" rel="noopener" className="adm-btn">View site</a>
                }
            />
            <HomeForm />
        </div>
    );
}
