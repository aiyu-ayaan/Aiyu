import { redirect } from 'next/navigation';

export default function LiveDeploymentsRedirectPage() {
    redirect('/apps');
}
