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

  const title = config?.siteTitle || "Aiyu";
  const icon = config?.favicon?.value ? '/api/favicon' : '/favicon.ico';

  return {
    title: title,
    description: "Just coding........",
    themeColor: "#111827",
    icons: {
      icon: icon,
    },
  };
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#111827" />
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
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}