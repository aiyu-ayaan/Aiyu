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
        <div className="p-8 max-w-7xl mx-auto min-h-screen">
            <div className="mb-12">
                <Link href="/admin/footer" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors mb-4 text-sm font-mono opacity-60 hover:opacity-100 uppercase tracking-widest">
                    ← BACK_TO_FOOTER_SETTINGS
                </Link>
                <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Social Connection</h1>
                <p className="text-slate-400">Update parameters for specific social network uplink.</p>
            </div>
            <SocialForm initialData={social} isEdit={true} />
        </div>
    );
}
