import { redirect } from 'next/navigation';

export default function AdminDeploymentsRedirectPage() {
    redirect('/admin/apps');
}
