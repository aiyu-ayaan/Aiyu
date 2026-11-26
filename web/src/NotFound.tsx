// Client-side 404 view. The Rust server already answers unknown app paths with status 404; this covers
// client-side navigation. Same component as Next's src/app/not-found.js.
import { useEffect } from 'react';
import NextNotFound from '@/app/not-found';

export function NotFound() {
  useEffect(() => {
    document.title = '404 - Page Not Found';
  }, []);
  return <NextNotFound />;
}
