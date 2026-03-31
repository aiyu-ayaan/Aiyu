import { redirect } from 'next/navigation';

export default async function EditDeploymentRedirectPage({ params }) {
    const { id } = await params;
    redirect(`/admin/apps/${id}`);
}
