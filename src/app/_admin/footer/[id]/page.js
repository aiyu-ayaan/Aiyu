"use client";
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import SocialForm from '@/app/components/admin/SocialForm';
import { EmptyState, Loading, PageHeader, Panel } from '@/app/components/admin/ui';
import '@/app/styles/admin-structure.css';

export default function EditSocialPage() {
    const { id } = useParams();
    const [social, setSocial] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSocial = async () => {
            try {
                const res = await fetch(`/api/socials/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setSocial(data);
                }
            } catch (error) {
                console.error('Failed to fetch social link', error);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchSocial();
        }
    }, [id]);

    return (
        <div className="adm-page">
            <PageHeader
                command="edit"
                title={social?.name ? `Edit ${social.name}` : 'Edit social link'}
                description="Update the network label, destination URL, icon identifier, or visibility."
                actions={
                    <Link href="/admin/footer" className="adm-btn">
                        Back to footer
                    </Link>
                }
            />

            {loading ? (
                <Panel>
                    <Loading label="Loading social link" rows={4} />
                </Panel>
            ) : !social ? (
                <Panel flush>
                    <EmptyState
                        title="Social link not found"
                        description="This social link may have been removed."
                        action={
                            <Link href="/admin/footer" className="adm-btn adm-btn-primary">
                                Back to footer
                            </Link>
                        }
                    />
                </Panel>
            ) : (
                <SocialForm initialData={social} isEdit={true} />
            )}
        </div>
    );
}
