"use client";
import React from 'react';
import { FaArrowUpRightFromSquare } from 'react-icons/fa6';
import AdsForm from '../../components/admin/AdsForm';
import { PageHeader } from '@/app/components/admin/ui';
import '@/app/styles/admin-structure.css';

export default function AdsPage() {
    return (
        <div className="adm-page adm-structure">
            <PageHeader
                command="ads"
                title="AdSense configuration"
                description="Manage Google AdSense publisher verification, dynamic ads.txt records, and article ad placement slots."
                actions={
                    <a href="/ads.txt" target="_blank" rel="noreferrer" className="adm-btn">
                        <FaArrowUpRightFromSquare aria-hidden="true" /> View ads.txt
                    </a>
                }
            />
            <AdsForm />
        </div>
    );
}
