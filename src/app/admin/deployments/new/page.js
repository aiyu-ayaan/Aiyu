import { redirect } from 'next/navigation';

export default function NewDeploymentRedirectPage() {
    redirect('/admin/apps/new');
}
