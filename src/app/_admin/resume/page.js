"use client";
import dynamic from 'next/dynamic';
import { Loading } from '@/app/components/admin/ui';
import '../../styles/admin-showcase.css';

// CodeMirror is browser-only; load the studio client-side to keep the admin
// bundle lean and avoid SSR of the editor.
const ResumeStudioClient = dynamic(
    () => import('@/app/components/admin/resume/ResumeStudioClient'),
    { ssr: false, loading: () => <div className="adm-page"><Loading label="Loading resume studio" rows={6} /></div> }
);

export default function AdminResumePage() {
    return <ResumeStudioClient />;
}
