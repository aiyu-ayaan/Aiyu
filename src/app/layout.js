import { Geist, Geist_Mono } from "next/font/google";
import "./styles/globals.css";
import "./styles/timeline.css";
import "./styles/custom-timeline.css";
import { ThemeProvider } from "./context/ThemeContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import dbConnect from "@/lib/db";
import ConfigModel from "@/models/Config";

export async function generateMetadata() {
  await dbConnect();
  const config = await ConfigModel.findOne().lean();

  const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
  const icon = config?.favicon?.value ? '/api/favicon' : '/favicon.ico';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const siteDescription = config?.siteDescription || 'Professional portfolio showcasing projects, blogs, and expertise.';
  const ogImage = config?.ogImage || `${baseUrl}/og-image.png`;
  const authorName = config?.authorName || 'Developer';

  return {
    title: baseName,
    description: siteDescription,
    keywords: ['portfolio', 'developer', 'projects', 'blogs', 'web development', config?.profession || 'full stack'].join(', '),
    icons: {
      icon: icon,
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
import TerminalPath from "./components/admin/TerminalPath";

import SpaceBackground from "./components/shared/SpaceBackground";

export default async function RootLayout({ children }) {
  await dbConnect();
  const config = await ConfigModel.findOne().lean();
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
          <div className="fixed inset-0 z-[-1]">
            <SpaceBackground />
          </div>
          <TerminalPath />
          <div className="relative z-0">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}