"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa6';
import DeploymentForm from '@/app/components/admin/DeploymentForm';
import { Badge, EmptyState, Loading, PageHeader, Panel } from '@/app/components/admin/ui';
import '@/app/styles/admin-projects.css';

export default function EditAppPage() {
    const { id } = useParams();
    const [deployment, setDeployment] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchApp = async () => {
            try {
                const response = await fetch(`/api/deployments/${id}`);
                if (response.ok) {
                    const data = await response.json();
                    setDeployment(data);
                }
            } catch (error) {
                console.error('Failed to fetch app', error);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchApp();
        }
    }, [id]);

    return (
        <div className="adm-page">
            <PageHeader
                command="edit"
                title={deployment?.name ? `Edit ${deployment.name}` : 'Edit app'}
                description="Update runtime details, URLs, and presentation for this app."
                actions={
                    <>
                        {deployment?._id && <Badge>{deployment._id}</Badge>}
                        <Link href="/admin/apps" className="adm-btn">
                            <FaArrowLeft aria-hidden="true" /> Back to apps
                        </Link>
                    </>
                }
            />

            {loading ? (
                <Panel>
                    <Loading label="Loading app" rows={6} />
                </Panel>
            ) : !deployment ? (
                <Panel flush>
                    <EmptyState
                        title="App not found"
                        description="This app entry may have been removed or the ID is invalid."
                        action={
                            <Link href="/admin/apps" className="adm-btn adm-btn-primary">
                                Back to apps
                            </Link>
                        }
                    />
                </Panel>
            ) : (
                <DeploymentForm initialData={deployment} isEdit={true} />
            )}
        </div>
    );
}
