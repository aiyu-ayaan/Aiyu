// Page data: the first page comes inline in #__DATA__; client-side navigations fetch the same URL as JSON
// (`x-aiyu-data: 1`, see server/src/web.rs `render`).
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import type { BootData } from './App';

export type PageState<T> = { status: number; page: T | null; shell: unknown; loading: boolean };

let initial: { path: string; data: BootData } | null = null;

export function setInitialData(data: BootData) {
  initial = { path: window.location.pathname + window.location.search, data };
}

/** Latest site chrome data (header, socials, config); refreshed with each page fetch. */
let latestShell: unknown = null;
export const getShell = () => latestShell ?? initial?.data.shell ?? null;

export function usePageData<T>(): PageState<T> {
  const { pathname, search } = useLocation();
  const key = pathname + search;
  const fromInitial = initial && initial.path === key ? initial.data : null;
  const [state, setState] = useState<PageState<T>>(() =>
    fromInitial
      ? { status: fromInitial.status ?? 200, page: fromInitial.page as T, shell: fromInitial.shell, loading: false }
      : { status: 200, page: null, shell: getShell(), loading: true },
  );

  useEffect(() => {
    if (initial && initial.path === key) {
      // Only the first render may use the inline data; later visits to this path fetch fresh data.
      initial = { ...initial, path: '' };
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    fetch(key, { headers: { 'x-aiyu-data': '1', accept: 'application/json' } })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (body.title) document.title = body.title;
        if (body.shell) latestShell = body.shell;
        setState({ status: res.status, page: body.page ?? null, shell: body.shell ?? getShell(), loading: false });
      })
      .catch(() => !cancelled && setState({ status: 500, page: null, shell: getShell(), loading: false }));
    return () => {
      cancelled = true;
    };
  }, [key]);

  return state;
}
