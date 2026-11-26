import { useSearchParams } from 'next/navigation';
import { FaGithub } from 'react-icons/fa6';
import { PageHeader, Panel } from '@/app/components/admin/ui';
import PasswordLoginForm from './PasswordLoginForm';

// Server-driven toggle: the server (Rust, GITHUB_AUTH_ENABLED) passes the same
// flag the routes enforce, so the UI can never present a path that the server
// has disabled. Generic, non-leaky messages keyed off the `?error=` code the
// OAuth callback redirects with.
const GITHUB_ERROR_MESSAGES = {
    forbidden: 'This GitHub account is not authorized to access the admin.',
    state: 'Your sign-in session expired. Please try again.',
    denied: 'GitHub sign-in was cancelled.',
    config: 'GitHub sign-in is not configured correctly. Contact the site owner.',
    exchange: 'Could not complete GitHub sign-in. Please try again.',
    profile: 'Could not read your GitHub profile. Please try again.',
    invalid: 'Invalid GitHub response. Please try again.',
};

export default function AdminLogin({ githubEnabled = false }) {
    const error = useSearchParams().get('error');
    const githubError = githubEnabled ? GITHUB_ERROR_MESSAGES[error] : undefined;

    return (
        <main className="min-h-screen flex items-center justify-center p-4">
            <div className="flex w-full max-w-md flex-col gap-6">
                <PageHeader command="login" title="Admin login" />

                <Panel>
                    {githubEnabled ? (
                        <div className="flex flex-col gap-4">
                            {githubError && (
                                <div role="alert" className="adm-notice adm-notice-error">
                                    {githubError}
                                </div>
                            )}
                            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- OAuth route requires full browser navigation */}
                            <a href="/api/auth/github" className="adm-btn adm-btn-primary w-full min-h-11">
                                <FaGithub aria-hidden="true" className="text-lg" />
                                Continue with GitHub
                            </a>
                            <p className="adm-help">Access is restricted to the site owner.</p>
                        </div>
                    ) : (
                        <PasswordLoginForm />
                    )}
                </Panel>
            </div>
        </main>
    );
}
