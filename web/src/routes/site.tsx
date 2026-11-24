// Public pages inside the v2 chrome (port of src/app/(site)/layout.js) and the blog index.
import { Outlet, useLocation } from 'react-router';
import V2Chrome, { applyResumeLink } from '@/app/components/landing/v2/V2Chrome';
import BlogsIndexView from '@/app/components/blogs/v2/BlogsIndexView';
import { getShell, usePageData } from '../pageData';
import { NotFound } from '../NotFound';

type Shell = {
  header: { navLinks?: unknown[] } | null;
  socials: unknown[];
  config: Record<string, unknown> & { logoText?: string };
  aboutName?: string | null;
  packageVersion?: string | null;
};

export function SiteLayout() {
  const { pathname } = useLocation();
  const shell = getShell() as Shell | null;
  // Copy before applyResumeLink mutates the nav links.
  const header = shell?.header ? { ...shell.header, navLinks: [...(shell.header.navLinks ?? [])] } : null;
  if (shell) applyResumeLink(header, shell.config);
  return (
    <V2Chrome
      logoText={shell?.config?.logoText || '< aiyu />'}
      headerData={header}
      configData={shell?.config}
      socialData={shell?.socials ?? []}
      aboutName={shell?.aboutName}
      packageVersion={shell?.packageVersion}
    >
      {/* src/app/(site)/template.js: remount per page so the enter animation replays. */}
      <div key={pathname} className="v2-page-enter">
        <Outlet />
      </div>
    </V2Chrome>
  );
}

/** Blank while a client-side navigation loads; the chrome stays in place. */
export function Pending() {
  return <div className="min-h-screen" aria-busy="true" />;
}

export function BlogsIndex() {
  const { page, status, loading } = usePageData<{ blogs: unknown[]; config: unknown }>();
  if (loading) return <Pending />;
  if (status === 404 || !page) return <NotFound />;
  return <BlogsIndexView blogs={page.blogs} config={page.config} />;
}
