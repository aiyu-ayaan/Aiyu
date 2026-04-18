import BlogEditorForm from '@/app/components/admin/BlogEditorForm';

export default async function EditBlogPage({ params }) {
    const { id } = await params;
    return <BlogEditorForm mode="edit" blogId={id} />;
}
