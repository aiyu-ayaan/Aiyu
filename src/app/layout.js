import { Geist, Geist_Mono } from "next/font/google";
import "./styles/globals.css";
import { ThemeProvider } from "./context/ThemeContext";
import { getConfigData } from "@/lib/dataFetchers";
import { getSiteUrl } from "@/lib/siteUrl";
import { getAdsData } from "@/lib/adsDataFetcher";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
        {adsConfig?.adsenseEnabled && adsenseClientId && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
            crossOrigin="anonymous"
          />
        )}
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
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <GoogleAnalytics gaId={gaId} />
        <ThemeProvider>
          <ClientEnhancements />
          <DynamicLiveCommitStream />
          <div className="relative z-0">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
