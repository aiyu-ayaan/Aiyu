"use client";
import React, { useEffect, useState } from 'react';
import SocialForm from '@/app/components/admin/SocialForm';
import { useParams } from 'next/navigation';
import Link from 'next/link';

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

    if (loading) return <div className="p-8 text-white">Loading...</div>;
    if (!social) return <div className="p-8 text-white">Social link not found</div>;

    return (
        <div className="p-8">
            <div className="mb-6">
                <Link href="/admin/footer" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors">
                    ← Back to Footer
                </Link>
            </div>
            <h1 className="text-3xl font-bold text-white mb-8 text-center">Edit Social Link</h1>
            <SocialForm initialData={social} isEdit={true} />
        </div>
    );
}
