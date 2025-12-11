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

  return {
    title: baseName,
    description: "Just coding........",
    icons: {
      icon: icon,
    },
  };
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#111827',
}

import GoogleAnalytics from "./components/GoogleAnalytics";

export default async function RootLayout({ children }) {
  await dbConnect();
  const config = await ConfigModel.findOne().lean();
  const gaId = config?.googleAnalyticsId || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (!theme) {
                    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
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
      >
        <GoogleAnalytics gaId={gaId} />
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}