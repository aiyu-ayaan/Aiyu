import { Geist, Geist_Mono } from "next/font/google";
import "./styles/globals.css";
import { ThemeProvider } from "./context/ThemeContext";
import { getConfigData } from "@/lib/dataFetchers";
import { getSiteUrl } from "@/lib/siteUrl";
import { getAdsData } from "@/lib/adsDataFetcher";
import Script from "next/script";
import { PREPAINT_THEME_PERF, PREPAINT_BOOT_GATE } from "@/lib/prepaintScripts";

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

// Neutral file name: ad blockers refuse a dev-server module called GoogleAnalytics.js, which blanks the whole app.
import GoogleAnalytics from "./components/SiteMeasure";
import { isAdminViewer } from "@/lib/adminPresence";
import ClientEnhancements from "./components/shared/ClientEnhancements";
import DynamicLiveCommitStream from "./components/shared/DynamicLiveCommitStream";
import BootLoader from "./components/shared/BootLoader";
import WebMCPTools from "./components/agent/WebMCPTools";

export default async function RootLayout({ children }) {
  const config = await getConfigData();
  const adsConfig = await getAdsData();
  const adsenseClientId = typeof adsConfig?.clientId === 'string' ? adsConfig.clientId.trim() : '';
  // While logged in as admin, our own browsing must not be measured. The
  // first-party beacon is already rejected server-side by /api/analytics/track;
  // GA runs entirely in the browser, so it has to be withheld at render time.
  const isAdmin = await isAdminViewer();
  const gaId = isAdmin
    ? null
    : config?.googleAnalyticsId || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      style={{ backgroundColor: '#0d1117' }}
    >
      <head>
        {/* Next.js 16.2's documented pattern (Script as a sibling of <head>)
            hits a confirmed framework bug that breaks script ordering
            guarantees (vercel/next.js#51242). Keeping these nested in <head>
            avoids that real error; it triggers a known dev-only console
            warning ("Encountered a script tag...") that is a false positive
            for next/script's beforeInteractive strategy — the script still
            executes correctly. Revisit once upstream ships a fix. */}
        <Script
          id="prepaint-theme-perf"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: PREPAINT_THEME_PERF }}
        />
        <Script
          id="prepaint-boot-gate"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: PREPAINT_BOOT_GATE }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <BootLoader host={config?.logoText} />
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
            <WebMCPTools />
            <DynamicLiveCommitStream />
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
