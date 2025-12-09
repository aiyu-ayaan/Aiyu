import { Geist, Geist_Mono } from "next/font/google";
import "../styles/globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata = {
    title: "Admin | Aiyu Portfolio",
    description: "Admin Dashboard",
};

// Force dynamic rendering for all admin pages
// This prevents Next.js from trying to pre-render admin pages during build
// Admin pages require authentication and database access, so they must be dynamic
export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }) {
    return (
        <div className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-900 text-white min-h-screen`}>
            {children}
        </div>
    );
}
