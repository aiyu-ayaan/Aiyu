// App shell: the client half of src/app/layout.js (theme, boot screen, global enhancements, analytics) plus the
// routes this app owns. Server-side values (GA id, AdSense, logo) come from the Rust server in #__DATA__.
import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import { ThemeProvider } from '@/app/context/ThemeContext';
import BootLoader from '@/app/components/shared/BootLoader';
import ClientEnhancements from '@/app/components/shared/ClientEnhancements';
import WebMCPTools from '@/app/components/agent/WebMCPTools';
import DynamicLiveCommitStream from '@/app/components/shared/DynamicLiveCommitStream';
import GoogleAnalytics from '@/app/components/GoogleAnalytics';
import Script from 'next/script';
import { BlogsIndex, SiteLayout } from './routes/site';

// Route chunks: a page only downloads its own code.
const GamesLayout = lazy(() => import('./routes/games').then((m) => ({ default: m.GamesLayout })));
const GamesIndex = lazy(() => import('./routes/games').then((m) => ({ default: m.GamesIndex })));
const GamePage = lazy(() => import('./routes/games').then((m) => ({ default: m.GamePage })));
const BlogDetail = lazy(() => import('./routes/blogDetail'));
import { NotFound } from './NotFound';

export type BootData = {
  logoText?: string | null;
  gaId?: string | null;
  adsenseClientId?: string | null;
  status?: number;
  shell?: unknown;
  page?: unknown;
};

export function App({ data }: { data: BootData }) {
  return (
    <BrowserRouter>
      <BootLoader host={data.logoText} />
      {data.adsenseClientId && (
        <Script
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(data.adsenseClientId)}`}
          crossOrigin="anonymous"
          strategy="lazyOnload"
        />
      )}
      <GoogleAnalytics gaId={data.gaId} />
      <ThemeProvider>
        <div className="relative z-0">
          <ClientEnhancements />
          <WebMCPTools />
          <DynamicLiveCommitStream />
          <Suspense fallback={null}>
          <Routes>
            <Route path="/games" element={<GamesLayout />}>
              <Route index element={<GamesIndex />} />
              <Route path=":slug" element={<GamePage />} />
            </Route>
            <Route element={<SiteLayout />}>
              <Route path="/blogs" element={<BlogsIndex />} />
              <Route path="/blogs/:id" element={<BlogDetail />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </div>
      </ThemeProvider>
    </BrowserRouter>
  );
}
