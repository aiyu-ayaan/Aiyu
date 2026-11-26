"use client";

import { useParams } from 'next/navigation';
import BlogEditorForm from '@/app/components/admin/BlogEditorForm';
import '@/app/styles/admin-blogs.css';

export default function EditBlogPage() {
    const { id } = useParams();
    return <BlogEditorForm mode="edit" blogId={id} />;
}
