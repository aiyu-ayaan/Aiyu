"use client";
import dynamic from 'next/dynamic';

// CodeMirror is browser-only; load the studio client-side to keep the admin
// bundle lean and avoid SSR of the editor.
const ResumeStudioClient = dynamic(
    () => import('@/app/components/admin/resume/ResumeStudioClient'),
    { ssr: false, loading: () => <div className="p-8 text-center text-slate-400">Loading Resume Studio…</div> }
);

export default function AdminResumePage() {
    return <ResumeStudioClient />;
}
