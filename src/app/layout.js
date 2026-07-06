import { Geist, Geist_Mono } from "next/font/google";
import "./styles/globals.css";
import { ThemeProvider } from "./context/ThemeContext";
import { getConfigData } from "@/lib/dataFetchers";
import { getSiteUrl } from "@/lib/siteUrl";
import { getAdsData } from "@/lib/adsDataFetcher";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  fallback: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Helvetica Neue", "sans-serif"],
});

// Mono is only used for code/syntax accents (never the LCP element), so skip
// preloading it — that frees a render-blocking font request on first paint.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
});

export async function generateMetadata() {
  const config = await getConfigData();

  const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
  const siteTitle = `${baseName} | ${config?.profession || 'Software Engineer'} Portfolio`;
  const icon = config?.hasCustomFavicon ? '/api/favicon' : '/favicon.ico';
  const baseUrl = getSiteUrl();
  const siteDescription = config?.siteDescription || 'Professional portfolio showcasing projects, blogs, and expertise.';
  const ogImage = (typeof config?.ogImage === 'string' ? config.ogImage : typeof config?.ogImage?.value === 'string' && config.ogImage.value.length > 0 ? config.ogImage.value : null) || `${baseUrl}/og-image.png`;
  const authorName = config?.authorName || 'Developer';
  const metadataBase = (() => {
    try {
      return new URL(baseUrl);
    } catch {
      return new URL('http://localhost:3000');
    }
  })();

  return {
    metadataBase,
    title: siteTitle,
    description: siteDescription,
    keywords: ['portfolio', 'developer', 'projects', 'blogs', 'web development', config?.profession || 'full stack'].join(', '),
    icons: {
      icon: new URL(icon, baseUrl).toString(),
      shortcut: new URL(icon, baseUrl).toString(),
      apple: new URL(icon, baseUrl).toString(),
    },
    openGraph: {
      title: siteTitle,
      description: siteDescription,
      url: baseUrl,
      type: 'website',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: baseName,
        },
      ],
      locale: 'en_US',
      siteName: siteTitle,
    },
    twitter: {
      card: 'summary_large_image',
      title: siteTitle,
      description: siteDescription,
      images: [ogImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1',
    },
    alternates: {
      canonical: baseUrl,
    },
    manifest: '/site.webmanifest',
  };
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#111827',
}

import GoogleAnalytics from "./components/GoogleAnalytics";
import ClientEnhancements from "./components/shared/ClientEnhancements";
import DynamicLiveCommitStream from "./components/shared/DynamicLiveCommitStream";
import BootLoader from "./components/shared/BootLoader";

export default async function RootLayout({ children }) {
  const config = await getConfigData();
  const adsConfig = await getAdsData();
  const adsenseClientId = typeof adsConfig?.clientId === 'string' ? adsConfig.clientId.trim() : '';
  const gaId = config?.googleAnalyticsId || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      style={{ backgroundColor: '#0d1117' }}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var mode = localStorage.getItem('themeMode');
                  var legacy = localStorage.getItem('themeVariant') || localStorage.getItem('theme');
                  if (mode !== 'auto' && mode !== 'dark' && mode !== 'light') {
                    mode = (legacy === 'dark' || legacy === 'light') ? legacy : 'auto';
                  }

                  var resolved = mode === 'auto'
                    ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
                    : mode;

                  document.documentElement.setAttribute('data-theme', resolved);
                  document.documentElement.style.backgroundColor = resolved === 'dark' ? '#0d1117' : '#ffffff';
                } catch (e) {
                  document.documentElement.setAttribute('data-theme', 'dark');
                  document.documentElement.style.backgroundColor = '#0d1117';
                }

                // Pre-paint performance tier. Set before first paint so CSS can
                // drop expensive effects (backdrop-filter, infinite animations,
                // blur reveals) on low-end / data-saver / reduced-motion devices
                // with no FOUC or layout shift. Read by globals.css ([data-perf])
                // and gsapScroll.js for animation level-of-detail.
                try {
                  var n = navigator, mm = window.matchMedia;
                  var reduce = mm && mm('(prefers-reduced-motion: reduce)').matches;
                  var conn = n.connection || {};
                  var saveData = conn.saveData === true;
                  var slowNet = /(^|-)2g$|(^|-)3g$|slow-2g/.test(conn.effectiveType || '');
                  var cores = n.hardwareConcurrency || 8;
                  var mem = n.deviceMemory || 8; // undefined on iOS/Safari -> treated as capable
                  var coarse = mm && mm('(pointer: coarse)').matches;
                  var narrow = window.innerWidth < 1024;
                  // Weak hardware only counts as "lite" on small / touch screens, so
                  // capable laptops with few cores still get the full experience.
                  var weakHw = (cores <= 4 || mem <= 4) && (coarse || narrow);
                  var lite = !!(reduce || saveData || slowNet || weakHw);
                  document.documentElement.setAttribute('data-perf', lite ? 'lite' : 'full');
                } catch (e) {
                  document.documentElement.setAttribute('data-perf', 'full');
                }
              })();
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var path = location.pathname || '';
                  // Blogs are meant to load instantly — never boot-gate them.
                  var skipRoute = path === '/blogs' || path.indexOf('/blogs/') === 0;
                  // Skip boot screen during e2e tests. Playwright/WebDriver
                  // automation sets navigator.webdriver = true in both headed
                  // and headless modes (the UA does NOT contain 'Playwright').
                  var testEnv = navigator.webdriver === true;
                  // Cross-tab presence: another instance is "alive" if a heartbeat
                  // was written very recently (covers reload + new tab / duplicate
                  // while a foreground tab is open). Backgrounded tabs are caught
                  // post-mount via BroadcastChannel.
                  var last = parseInt(localStorage.getItem('aiyu:lastSeen') || '0', 10) || 0;
                  var alive = (Date.now() - last) < 3000;
                  if (skipRoute || alive || testEnv) {
                    document.documentElement.setAttribute('data-booted', '1');
                    // Hide before first paint without waiting for the CSS bundle.
                    var s = document.createElement('style');
                    s.textContent = '#boot-screen{display:none!important}';
                    document.head.appendChild(s);
                  }
                  // Mark our presence immediately so a tab opening right now sees us.
                  localStorage.setItem('aiyu:lastSeen', String(Date.now()));
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <BootLoader />
        {adsConfig?.adsenseEnabled && adsenseClientId && (
          <Script
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
            crossOrigin="anonymous"
            strategy="lazyOnload"
          />
        )}
        <GoogleAnalytics gaId={gaId} />
        <ThemeProvider>
          <div className="relative z-0">
            <ClientEnhancements />
            <DynamicLiveCommitStream />
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
