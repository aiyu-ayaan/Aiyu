// /desktop (port of src/app/desktop/page.js): the Aiyu OS shell, plus the visually hidden summary that gives
// crawlers and screen readers the page's only heading structure.
import Link from 'next/link';
import Desktop from '@/app/components/desktop/Desktop';
import { DeviceModeProvider } from '@/app/context/DeviceModeContext';
import { usePageData } from '../pageData';
import { NotFound } from '../NotFound';

type Data = { wallpaper: string; config: Record<string, unknown>; features: [string, string][] };

export default function DesktopPage() {
  const { page, status, loading } = usePageData<Data>();
  if (loading) return null;
  if (status === 404 || !page) return <NotFound />;
  return (
    <DeviceModeProvider>
      <div className="sr-only">
        <h1>Aiyu OS — a desktop environment in the browser</h1>
        <p>
          Aiyu OS is an interactive Windows 11 style desktop built with React, running entirely in the browser. It
          presents this portfolio as a working operating system rather than a set of pages.
        </p>
        <h2>Applications</h2>
        <ul>
          {page.features.map(([name, summary]) => (
            <li key={name}>
              <strong>{name}</strong>: {summary}
            </li>
          ))}
        </ul>
        <p>
          Prefer the standard site? Visit the <Link href="/projects">projects archive</Link>, the{' '}
          <Link href="/blogs">blog</Link>, or the <Link href="/about-me">about page</Link>.
        </p>
      </div>
      <Desktop wallpaper={page.wallpaper} config={page.config} />
    </DeviceModeProvider>
  );
}
