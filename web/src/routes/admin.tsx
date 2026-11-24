// /admin/*: every src/app/_admin/**/page.js becomes a lazy route (Next ignores `_` folders, so this app owns them).
// `[id]` folders become `:id`. The Rust server gates the whole tree on the session cookie, like src/proxy.js did.
import { lazy, Suspense, type ComponentType } from 'react';
import { Outlet, Route } from 'react-router';
import AdminLayout from '@/app/_admin/layout';
import { usePageData } from '../pageData';

type Loader = () => Promise<{ default: ComponentType<Record<string, unknown>> }>;
const pages = import.meta.glob('../../../src/app/_admin/**/page.js') as Record<string, Loader>;

function routePath(file: string): string {
  const rel = file.replace(/^.*\/src\/app\/_admin\/?/, '').replace(/\/?page\.js$/, '');
  return rel.replace(/\[([^\]]+)\]/g, ':$1');
}

const LoginPage = lazy(pages['../../../src/app/_admin/login/page.js']);

/** The login page needs the server's GitHub-auth flag. */
function Login() {
  const { page } = usePageData<{ githubEnabled?: boolean }>();
  return <LoginPage githubEnabled={Boolean(page?.githubEnabled)} />;
}

function Layout() {
  return (
    <AdminLayout>
      <Suspense fallback={null}>
        <Outlet />
      </Suspense>
    </AdminLayout>
  );
}

export const adminRoutes = (
  <Route path="/admin" element={<Layout />}>
    {Object.entries(pages).map(([file, load]) => {
      const path = routePath(file);
      if (path === 'login') return <Route key={path} path="login" element={<Login />} />;
      const Page = lazy(load);
      return path === '' ? <Route key="index" index element={<Page />} /> : <Route key={path} path={path} element={<Page />} />;
    })}
  </Route>
);
