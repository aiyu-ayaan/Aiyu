'use client';

import StorageManager from '@/app/components/admin/StorageManager';
import { PageHeader } from '@/app/components/admin/ui';

export default function AdminResourcesPage() {
    return (
        <div className="adm-page">
            <PageHeader
                command="du -sh"
                title="Resource storage"
                description="See upload usage and content size, and clean up files nothing references."
            />
            <StorageManager />
        </div>
    );
}
