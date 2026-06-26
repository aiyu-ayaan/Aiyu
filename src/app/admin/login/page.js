import PasswordLoginForm from './PasswordLoginForm';
import { isGithubAuthEnabled } from '@/lib/githubOAuth';

// Server-driven toggle: the page reads the same flag the routes enforce, so the
// UI can never present a path that the server has disabled. Generic, non-leaky
// messages keyed off the `?error=` code the OAuth callback redirects with.
const GITHUB_ERROR_MESSAGES = {
    forbidden: 'This GitHub account is not authorized to access the admin.',
    state: 'Your sign-in session expired. Please try again.',
    denied: 'GitHub sign-in was cancelled.',
    config: 'GitHub sign-in is not configured correctly. Contact the site owner.',
    exchange: 'Could not complete GitHub sign-in. Please try again.',
    profile: 'Could not read your GitHub profile. Please try again.',
    invalid: 'Invalid GitHub response. Please try again.',
};

function GithubMark() {
    return (
        <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
    );
}

export default async function AdminLogin({ searchParams }) {
    const githubEnabled = isGithubAuthEnabled();
    const sp = (await searchParams) || {};
    const githubError = githubEnabled ? GITHUB_ERROR_MESSAGES[sp.error] : undefined;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
            <div className="bg-gray-800 p-4 md:p-8 rounded-lg shadow-xl w-full max-w-md border border-gray-700">
                <h1 className="text-3xl font-bold mb-6 text-center text-cyan-400">Admin Login</h1>

                {githubEnabled ? (
                    <>
                        {githubError && (
                            <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded mb-4 text-sm">
                                {githubError}
                            </div>
                        )}
                        <a
                            href="/api/auth/github"
                            className="w-full flex items-center justify-center gap-3 bg-gray-900 hover:bg-black border border-gray-600 text-white font-semibold py-3 rounded transition-colors"
                        >
                            <GithubMark />
                            Continue with GitHub
                        </a>
                        <p className="mt-4 text-center text-xs text-gray-500">
                            Access is restricted to the site owner.
                        </p>
                    </>
                ) : (
                    <PasswordLoginForm />
                )}
            </div>
        </div>
    );
}
