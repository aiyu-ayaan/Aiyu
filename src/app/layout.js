import { Geist, Geist_Mono } from "next/font/google";
import "./styles/globals.css";
import "./styles/timeline.css";
import "./styles/custom-timeline.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import N8nChat from "./components/shared/N8nChat";
import { ThemeProvider } from "./context/ThemeContext";
import Head from 'next/head'


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});


// For Pages Router (_app.js)
<Head>
  <link rel="icon" href="/favicon.ico" />
</Head>

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
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#111827" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <Header/>
          {children}
          <Footer/>
          <N8nChat />
        </ThemeProvider>
      </body>
    </html>
  );
}