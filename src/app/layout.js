import { Geist, Geist_Mono } from "next/font/google";
import "./styles/globals.css";
import "./styles/timeline.css";
import "./styles/custom-timeline.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import N8nChat from "./components/shared/N8nChat";
import { getHeaderData, getSiteData } from "@/lib/api";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Aiyu",
  description: "Just coding........",
  themeColor: "#111827",
  icons: {
    icon: "/favicon.ico", // Relative to public/
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default async function RootLayout({ children }) {
  // Fetch header and footer data
  let headerData = null;
  let siteData = null;
  
  try {
    headerData = await getHeaderData();
    siteData = await getSiteData();
  } catch (error) {
    console.error('Failed to fetch layout data:', error);
    // Will fallback to default data in components
  }

  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#111827" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Header headerData={headerData} />
        {children}
        <Footer siteData={siteData} />
        <N8nChat />
      </body>
    </html>
  );
}