// `next/navigation` hooks on top of react-router. Pushes to pages outside this app become full page loads.
import { useMemo } from 'react';
import { useLocation, useNavigate, useParams as useRouterParams, useSearchParams as useRouterSearchParams } from 'react-router';
import { isAppRoute } from '../appRoutes';

export function usePathname(): string {
  return useLocation().pathname;
}

export function useSearchParams(): URLSearchParams {
  return useRouterSearchParams()[0];
}

export function useParams<T extends Record<string, string>>(): T {
  return useRouterParams() as T;
}

export function useRouter() {
  const navigate = useNavigate();
  return useMemo(() => {
    const go = (href: string, replace: boolean) => {
      if (isAppRoute(href)) navigate(href, { replace });
      else if (replace) window.location.replace(href);
      else window.location.assign(href);
    };
    return {
      push: (href: string) => go(href, false),
      replace: (href: string) => go(href, true),
      back: () => window.history.back(),
      forward: () => window.history.forward(),
      refresh: () => window.location.reload(),
      prefetch: () => {},
    };
  }, [navigate]);
}

export class NotFoundError extends Error {}

/** Thrown like Next's `notFound()`; the app's error boundary renders the 404 view. */
export function notFound(): never {
  throw new NotFoundError('NEXT_NOT_FOUND');
}

export function redirect(href: string): never {
  window.location.replace(href);
  throw new Error('NEXT_REDIRECT');
}
