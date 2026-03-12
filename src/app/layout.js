import { Geist, Geist_Mono } from "next/font/google";
import "./styles/globals.css";
import "./styles/timeline.css";
import "./styles/custom-timeline.css";
import { ThemeProvider } from "./context/ThemeContext";
import { getConfigData } from "@/lib/dataFetchers";

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
  const icon = config?.favicon?.value ? '/api/favicon' : '/favicon.ico';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://me.aiyu.co.in';
  const siteDescription = config?.siteDescription || 'Professional portfolio showcasing projects, blogs, and expertise.';
  const ogImage = (typeof config?.ogImage === 'string' ? config.ogImage : typeof config?.ogImage?.value === 'string' && config.ogImage.value.length > 0 ? config.ogImage.value : null) || `${baseUrl}/og-image.png`;
  const authorName = config?.authorName || 'Developer';

  return {
    title: baseName,
    description: siteDescription,
    keywords: ['portfolio', 'developer', 'projects', 'blogs', 'web development', config?.profession || 'full stack'].join(', '),
    icons: {
      icon: new URL(icon, baseUrl).toString(),
      shortcut: new URL(icon, baseUrl).toString(),
      apple: new URL(icon, baseUrl).toString(),
    },
    openGraph: {
      title: baseName,
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
      siteName: baseName,
    },
    twitter: {
      card: 'summary_large_image',
      title: baseName,
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



export default async function RootLayout({ children }) {
  const config = await getConfigData();
  const gaId = config?.googleAnalyticsId || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html lang="en" suppressHydrationWarning style={{ backgroundColor: '#0d1117' }}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('themeVariant') || localStorage.getItem('theme');
                  if (!theme) {
                    theme = 'dark';
                  }
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {
                  document.documentElement.setAttribute('data-theme', 'dark');
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
          <div className="relative z-0">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
