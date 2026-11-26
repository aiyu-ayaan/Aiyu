"use client";

import GalleryManager from '@/app/components/admin/GalleryManager';
import { PageHeader } from '@/app/components/admin/ui';
import '../../styles/admin-showcase.css';

export default function AdminGalleryPage() {
    return (
        <div className="adm-page">
            <PageHeader
                command="ls"
                title="Gallery"
                description="Upload photos, pin favourites and drag them into the order visitors see."
                actions={
                    <a href="/gallery" target="_blank" rel="noopener" className="adm-btn">View page</a>
                }
            />
            <GalleryManager />
        </div>
    );
}
